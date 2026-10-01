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

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  return english.find((v) => /natural|neural/i.test(v.name)) ?? english.find((v) => /google/i.test(v.name)) ?? english.find((v) => v.default) ?? english[0];
}

/**
 * A spoken conversation, using the browser's own speech recognition and speech synthesis.
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
    listen();
  }, [listen]);

  /** A question is being answered (typed, or just heard): stop listening and speaking until `say` is called. */
  const hold = useCallback(() => {
    if (phaseRef.current === 'off') return;
    silence();
    setPhase('thinking');
  }, []);

  /** Speaks an answer, then listens for the next question. Does nothing outside a conversation. */
  const say = useCallback((text: string) => {
    if (phaseRef.current === 'off') return;
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();
    const id = ++talk.current;
    const sentences = speakable(text);
    if (!sentences.length) return listen();

    const done = () => {
      if (talk.current === id && phaseRef.current === 'speaking') listen();
    };
    const voice = pickVoice(synth.getVoices());
    setPhase('speaking');
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

  return { supported, phase, interim, error, start, stop, hold, say, interrupt };
}
