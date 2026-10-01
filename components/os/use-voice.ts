'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** `off`: no voice conversation. Otherwise one is running, and this is whose turn it is. */
export type VoicePhase = 'off' | 'listening' | 'thinking' | 'speaking';

// The browser's speech recognition API is not in TypeScript's DOM types.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Recognition errors that end the conversation, with what to tell the visitor. Others ("no-speech") just end the turn. */
const FATAL: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it for this site to use voice.',
  'service-not-allowed': 'Microphone access is blocked. Allow it for this site to use voice.',
  'audio-capture': 'No microphone was found.',
  network: 'Voice needs a connection: your browser could not reach its speech service.',
};

/** How many times in a row to hear nothing before closing the mic, so it is not left open on an empty room. */
const MAX_SILENCES = 2;

/** Text as it should be said aloud, one sentence per entry: no links, bullets or quote marks. */
function speakable(text: string): string[] {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[•“”"]/g, '')
    .replace(/\s·\s/g, ', ')
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => /[a-z0-9]/i.test(s) && !s.endsWith(':'));
}

/** The browser's own voice, used only when the streamed one can't be had. Koby is a British man, so look for one. */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const british = english.filter((v) => /en[-_]gb/i.test(v.lang));
  const male = /\b(male|ryan|thomas|george|daniel|arthur|oliver)\b/i;
  const natural = /natural|neural/i;
  return (
    british.find((v) => male.test(v.name) && natural.test(v.name)) ??
    british.find((v) => male.test(v.name)) ??
    british.find((v) => natural.test(v.name)) ??
    british[0] ??
    english.find((v) => natural.test(v.name)) ??
    english.find((v) => v.default) ??
    english[0]
  );
}

/** /api/speak streams 16-bit mono PCM at this rate. */
const SAMPLE_RATE = 24_000;
/** How long to wait after the first audio arrives before playing, so playback never catches up with the download. */
const LEAD_SECONDS = 0.15;

/**
 * A spoken conversation. The browser's speech recognition hears the visitor; Koby's voice is streamed
 * from /api/speak, with the browser's own speech synthesis as the fallback.
 * The turns go: listen, hand what was heard to `onHeard`, wait for `say(answer)`, speak it, listen again.
 * The mic is closed while Koby speaks, so it does not hear itself.
 */
export function useVoice(onHeard: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [phase, setPhaseState] = useState<VoicePhase>('off');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');

  const phaseRef = useRef<VoicePhase>('off');
  const recognition = useRef<Recognition | null>(null);
  const silences = useRef(0);
  /** Bumped whenever speech is cut short, so the cancelled utterances' callbacks do nothing. */
  const talk = useRef(0);
  /** Chrome can garbage-collect an utterance before it ends unless something holds on to it. */
  const utterances = useRef<SpeechSynthesisUtterance[]>([]);
  /** Plays the streamed voice. Created on the mic click, which is what allows a page to make sound. */
  const audio = useRef<AudioContext | null>(null);
  const playing = useRef<AudioBufferSourceNode[]>([]);
  const download = useRef<AbortController | null>(null);
  const onHeardRef = useRef(onHeard);
  onHeardRef.current = onHeard;

  const setPhase = (next: VoicePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };

  const silence = () => {
    const rec = recognition.current;
    recognition.current = null;
    rec?.abort();
    talk.current += 1;
    download.current?.abort();
    for (const source of playing.current) source.stop();
    playing.current = [];
    window.speechSynthesis?.cancel();
    setInterim('');
  };

  const stop = useCallback(() => {
    silence();
    setPhase('off');
  }, []);

  const listen = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    recognition.current?.abort();
    const rec = new Ctor();
    recognition.current = rec;
    rec.lang = navigator.language?.toLowerCase().startsWith('en') ? navigator.language : 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    let heard = '';
    rec.onresult = (e) => {
      heard = Array.from(e.results, (r) => r[0].transcript).join(' ').trim();
      setInterim(heard);
    };
    rec.onerror = (e) => {
      if (recognition.current !== rec || !FATAL[e.error]) return;
      setError(FATAL[e.error]);
      stop();
    };
    rec.onend = () => {
      if (recognition.current !== rec) return;
      recognition.current = null;
      setInterim('');
      if (heard) {
        silences.current = 0;
        setPhase('thinking');
        onHeardRef.current(heard);
        return;
      }
      silences.current += 1;
      if (silences.current < MAX_SILENCES) listen();
      else setPhase('off');
    };

    setPhase('listening');
    try {
      rec.start();
    } catch {
      stop();
    }
  }, [stop]);

  /** Begins a conversation. Must be called from a click, which is what lets the browser open the mic and speak. */
  const start = useCallback(() => {
    setError('');
    silences.current = 0;
    // Safari only lets a page speak later if it has spoken once during a tap.
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    audio.current ??= new AudioContext();
    void audio.current.resume();
    listen();
  }, [listen]);

  /** A question is being answered (typed, or just heard): stop listening and speaking until `say` is called. */
  const hold = useCallback(() => {
    if (phaseRef.current === 'off') return;
    silence();
    setPhase('thinking');
  }, []);

  /**
   * Plays the answer in Koby's streamed voice, starting as soon as the first audio arrives.
   * Resolves true once it has finished (or was cut off), false if no audio could be had at all.
   */
  const playStreamed = async (text: string, id: number): Promise<boolean> => {
    const ctx = audio.current;
    if (!ctx) return false;
    const controller = new AbortController();
    download.current = controller;
    let last: AudioBufferSourceNode | undefined;
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) return false;

      const reader = res.body.getReader();
      // A sample is two bytes, and a network chunk can end between them.
      let odd: number | undefined;
      let at = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done || talk.current !== id) break;
        let bytes = value;
        if (odd !== undefined) {
          bytes = new Uint8Array(value.length + 1);
          bytes[0] = odd;
          bytes.set(value, 1);
        }
        odd = bytes.length % 2 ? bytes[bytes.length - 1] : undefined;
        const count = bytes.length >> 1;
        if (!count) continue;
        const samples = new DataView(bytes.buffer, bytes.byteOffset, count * 2);
        const buffer = ctx.createBuffer(1, count, SAMPLE_RATE);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < count; i++) channel[i] = samples.getInt16(i * 2, true) / 32768;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        // Chunks are queued end to end, so they play as one unbroken stream.
        at = Math.max(at, ctx.currentTime + (last ? 0.02 : LEAD_SECONDS));
        source.start(at);
        at += buffer.duration;
        playing.current.push(source);
        last = source;
      }
    } catch {
      // The download failed or was cut off; whatever has been queued still plays out below.
    }
    if (!last) return false;
    if (talk.current !== id) return true;
    const final = last;
    await new Promise<void>((resolve) => {
      final.onended = () => resolve();
    });
    return true;
  };

  /** Speaks an answer, then listens for the next question. Does nothing outside a conversation. */
  const say = useCallback(async (text: string) => {
    if (phaseRef.current === 'off') return;
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();
    const id = ++talk.current;
    const sentences = speakable(text);
    if (!sentences.length) return listen();

    const done = () => {
      if (talk.current === id && phaseRef.current === 'speaking') listen();
    };
    setPhase('speaking');
    playing.current = [];
    if (await playStreamed(sentences.join(' '), id).catch(() => false)) return done();
    if (talk.current !== id) return;

    // No streamed voice (no key, a limit, an outage): the browser's own voice reads it instead.
    const voice = pickVoice(synth.getVoices());
    utterances.current = sentences.map((sentence, i) => {
      const u = new SpeechSynthesisUtterance(sentence);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = 1.05;
      if (i === sentences.length - 1) {
        u.onend = done;
        u.onerror = done;
      }
      synth.speak(u);
      return u;
    });
  }, [listen]);

  /** Cuts Koby off mid-sentence and listens instead. */
  const interrupt = useCallback(() => {
    if (phaseRef.current !== 'speaking') return;
    silence();
    listen();
  }, [listen]);

  useEffect(() => {
    setSupported(!!recognitionCtor() && 'speechSynthesis' in window);
    // The list of voices loads in the background; asking for it early means it is ready by the first answer.
    window.speechSynthesis?.getVoices();
    return stop;
  }, [stop]);

  /** Whether a conversation is running right now (for callbacks, which can't rely on `phase` being current). */
  const isOn = useCallback(() => phaseRef.current !== 'off', []);

  return { supported, phase, interim, error, start, stop, hold, say, interrupt, isOn };
}
