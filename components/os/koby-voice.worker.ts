import * as ort from 'onnxruntime-web';
import { phonemize } from 'phonemizer';

/**
 * Koby's own voice, generated on the visitor's device, so it needs no API key and has no quota.
 * It is a Piper voice (open source, github.com/rhasspy/piper): text is turned into phonemes, the
 * phonemes into the numbers the model expects, and the model into sound. The model (about 63 MB)
 * is fetched once from Hugging Face and then kept in the browser's cache.
 */
/** "Alan", a British male voice. Its settings file sits next to it at `${VOICE}.json`. */
const VOICE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/medium/en_GB-alan-medium.onnx';
const VOICE_BYTES = 63_201_294;
const CACHE = 'koby-voice-v1';

// The speech runtime's own files come from a CDN; without cross-origin isolation it can use one thread.
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
ort.env.wasm.numThreads = 1;

/** The speech engine guesses at names; these are said as given. */
const PRONOUNCE: [RegExp, string][] = [[/\bAyush\b/gi, 'ˈɑːjʊʃ']];

export type VoiceRequest = { type: 'load' } | { type: 'speak'; id: number; sentences: string[] } | { type: 'stop' };
export type VoiceReply =
  | { type: 'progress'; value: number }
  | { type: 'ready' }
  /** One phrase of speech: mono samples between -1 and 1. */
  | { type: 'audio'; id: number; last: boolean; samples: Float32Array; rate: number }
  | { type: 'error'; id?: number; message: string };

// TypeScript's DOM types describe a page, not a worker.
const scope = self as unknown as {
  postMessage(message: VoiceReply, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<VoiceRequest>) => void) | null;
};

type VoiceConfig = {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  phoneme_id_map: Record<string, number[]>;
};
type Voice = { session: ort.InferenceSession; config: VoiceConfig };

async function fetchCached(url: string, onProgress?: (fraction: number) => void): Promise<ArrayBuffer> {
  const cache = await caches.open(CACHE).catch(() => null);
  const hit = await cache?.match(url);
  if (hit) return hit.arrayBuffer();

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Voice download failed (${res.status})`);
  const total = Number(res.headers.get('content-length')) || VOICE_BYTES;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(Math.min(1, loaded / total));
  }
  const blob = new Blob(chunks);
  await cache?.put(url, new Response(blob)).catch(() => {});
  return blob.arrayBuffer();
}

let voice: Promise<Voice> | undefined;
/** The answer being spoken. A newer request or a "stop" replaces it, and the old one ends at its next phrase. */
let job = 0;

function load(): Promise<Voice> {
  voice ??= (async () => {
    const [config, model] = await Promise.all([
      fetchCached(`${VOICE}.json`).then((b) => JSON.parse(new TextDecoder().decode(b)) as VoiceConfig),
      fetchCached(VOICE, (value) => scope.postMessage({ type: 'progress', value })),
    ]);
    return { session: await ort.InferenceSession.create(model), config };
  })();
  return voice;
}

/** A phrase as the phonemes of British English, with the names in PRONOUNCE said properly. */
async function toPhonemes(text: string, language: string): Promise<string> {
  let out = '';
  let rest = text;
  for (;;) {
    const found = PRONOUNCE.map(([pattern, ipa]) => ({ match: new RegExp(pattern.source, 'i').exec(rest), ipa }))
      .filter((f) => f.match)
      .sort((a, b) => a.match!.index - b.match!.index)[0];
    const before = found ? rest.slice(0, found.match!.index) : rest;
    if (before.trim()) out += (await phonemize(before, language)).join(' ');
    if (!found) return out.trim();
    out += ` ${found.ipa}`;
    rest = rest.slice(found.match!.index + found.match![0].length);
    // "Ayush's": the possessive is not left for the engine to pronounce as a word of its own.
    if (/^['’]s\b/.test(rest)) {
      out += 'ɪz';
      rest = rest.slice(2);
    }
    out += ' ';
  }
}

async function synthesize({ session, config }: Voice, text: string): Promise<Float32Array> {
  const map = config.phoneme_id_map;
  const phrase = text.trim();
  // The phonemes lose the punctuation, and the closing mark is what gives the phrase its intonation.
  const closing = /[.,!?;:]$/.test(phrase) ? phrase.slice(-1) : '.';
  const ids = [...map['^'], ...map['_']];
  for (const symbol of (await toPhonemes(phrase, config.espeak.voice)) + closing) {
    if (map[symbol]) ids.push(...map[symbol], ...map['_']);
  }
  ids.push(...map['$']);

  const { noise_scale, length_scale, noise_w } = config.inference;
  const result = await session.run({
    input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([noise_scale, length_scale, noise_w]), [3]),
  });
  // Copied, because the result's memory belongs to the runtime.
  return Float32Array.from(result[session.outputNames[0]].data as Float32Array);
}

scope.onmessage = async ({ data }) => {
  if (data.type === 'stop') {
    job = 0;
    return;
  }
  try {
    const loaded = await load();
    if (data.type === 'load') {
      // The first thing a session says is slow while it warms up; get that over with before the first answer.
      await synthesize(loaded, 'Hello.');
      scope.postMessage({ type: 'ready' });
      return;
    }
    const id = (job = data.id);
    for (let i = 0; i < data.sentences.length; i++) {
      const samples = await synthesize(loaded, data.sentences[i]);
      // Generating blocks this worker; pause so a "stop" or a newer answer can get in.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (job !== id) return;
      scope.postMessage({ type: 'audio', id, last: i === data.sentences.length - 1, samples, rate: loaded.config.audio.sample_rate }, [samples.buffer]);
    }
  } catch (error) {
    if (data.type === 'load') voice = undefined;
    scope.postMessage({ type: 'error', id: data.type === 'speak' ? data.id : undefined, message: error instanceof Error ? error.message : String(error) });
  }
};
