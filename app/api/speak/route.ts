import { rateLimiter } from '@/lib/ask/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Koby's voice in voice mode: Google's speech models, streamed so he starts talking before the whole
 * answer is rendered. Each model has its own daily quota, so the next is tried when one runs out.
 */
const MODELS = (process.env.GOOGLE_TTS_MODEL || 'gemini-3.8-flash-tts,gemini-3.8-flash-lite-tts').split(',').map((m) => m.trim()).filter(Boolean);
/** A male voice. The accent comes from the language code: a written direction ("say this in a British accent") gets read out. */
const VOICE = process.env.GOOGLE_TTS_VOICE || 'Charon';
const LANGUAGE = 'en-GB';
const MAX_CHARS = 900;
const TIMEOUT_MS = 30_000;

const isRateLimited = rateLimiter(40, 10 * 60 * 1000);

/** Turns text into speech. Replies with raw audio as it is generated: 16-bit mono PCM at 24 kHz. */
export async function POST(req: Request) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return Response.json({ error: 'No voice configured (missing GOOGLE_API_KEY).' }, { status: 503 });
  if (isRateLimited(req)) return Response.json({ error: 'Too many requests.' }, { status: 429 });

  let text = '';
  try {
    const body = (await req.json()) as { text?: unknown } | null;
    if (typeof body?.text === 'string') text = body.text.trim().slice(0, MAX_CHARS);
  } catch {
    text = '';
  }
  if (!text) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(TIMEOUT_MS)]);
  const request = (model: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { languageCode: LANGUAGE, voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      }),
      signal,
    });

  let upstream: Response | undefined;
  for (const model of MODELS) {
    try {
      const res = await request(model);
      if (res.ok && res.body) {
        upstream = res;
        break;
      }
      console.error(`Speech error from ${model}: ${res.status}`, (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200));
    } catch (error) {
      console.error(`Speech request to ${model} failed:`, error instanceof Error ? error.message : error);
      if (signal.aborted) break;
    }
  }
  if (!upstream?.body) return Response.json({ error: 'The voice could not be reached.' }, { status: 502 });

  const reader = upstream.body.getReader();
  const audio = new ReadableStream<Uint8Array>({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const chunk = JSON.parse(line.slice(5)) as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] };
            for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
              if (part.inlineData?.data) controller.enqueue(Buffer.from(part.inlineData.data, 'base64'));
            }
          }
        }
      } catch (error) {
        console.error('Speech stream failed:', error instanceof Error ? error.message : error);
      } finally {
        controller.close();
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(audio, {
    headers: { 'Content-Type': 'audio/L16; rate=24000; channels=1', 'Cache-Control': 'no-store' },
  });
}
