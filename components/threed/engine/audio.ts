import { MUSIC_START, soundMix, type AudioParams } from './audio-mix';

/** A quiet music/air mix, unlocked by the visitor's sound-control gesture. */
const TRACK = '/audio/memory-alex-lemirage-fi-sullivan.mp3';
export type SfxName = 'title' | 'seam' | 'card' | 'open' | 'close' | 'hover' | 'click' | 'gate' | 'ignite' | 'touch' | 'pluck' | 'crack' | 'step';
export type { AudioParams } from './audio-mix';

export function createAudio(onChange: (on: boolean) => void) {
  const track = document.createElement('audio');
  track.src = TRACK;
  track.preload = 'none';
  // The ended handler loops back to 0:10, rather than replaying the skipped intro.
  track.loop = false;
  track.volume = 1;
  track.dataset.portfolioMusic = 'true';
  track.setAttribute('aria-label', 'MEMORY — Alex LeMirage & Fi Sullivan');
  track.hidden = true;
  document.body.appendChild(track);
  let wanted = false;
  let playing = false;
  let disposed = false;
  let request = 0;
  let begun = false;
  let pauseTimer: ReturnType<typeof setTimeout> | undefined;
  let context: AudioContext | null = null;
  let nodes: { master: GainNode; music: GainNode; wind: GainNode; air: GainNode; filter: BiquadFilterNode; noise: AudioBufferSourceNode; source: MediaElementAudioSourceNode } | null = null;
  let mix = soundMix({ f: 0, scrollV: 0, seam: 0, flash: 0, fly: 0, speed: 0, footer: 0, modal: false });
  let applied = { ...mix };
  const abort = new AbortController();
  let effectNoise: AudioBuffer | null = null;
  let effectsDucked = false;
  const recent = new Map<SfxName, number>();
  const voices = new Set<AudioScheduledSourceNode>();

  function sfx(name: SfxName, pan = 0, strength = 1) {
    if (!context || !nodes || !playing || document.hidden || voices.size >= 6) return;
    const c = context;
    const now = c.currentTime;
    const sweeping = name === 'gate' || name === 'seam' || name === 'ignite';
    const cooldown = sweeping ? 1.6 : name === 'title' ? 1.2 : name === 'hover' ? 0.16 : 0.12;
    if (now - (recent.get(name) ?? -100) < cooldown) return;
    recent.set(name, now);
    const noisy = sweeping || name === 'touch' || name === 'crack' || name === 'step';
    const duration = sweeping ? 0.9 : name === 'pluck' ? 0.55 : name === 'title' ? 0.4 : 0.13;
    const gain = c.createGain();
    const stereo = c.createStereoPanner(); stereo.pan.value = Math.max(-0.7, Math.min(0.7, pan));
    const filter = c.createBiquadFilter(); filter.type = noisy ? 'bandpass' : 'lowpass'; filter.Q.value = 0.55;
    filter.frequency.setValueAtTime(sweeping ? 420 : noisy ? 850 : 1800, now);
    if (sweeping) {
      filter.frequency.exponentialRampToValueAtTime(name === 'gate' ? 2300 : 1500, now + 0.3);
      filter.frequency.exponentialRampToValueAtTime(350, now + duration);
      stereo.pan.setValueAtTime(-0.35, now); stereo.pan.linearRampToValueAtTime(0.35, now + duration);
    }
    const level = (sweeping ? 0.065 : noisy ? 0.043 : name === 'hover' ? 0.012 : 0.023)
      * Math.max(0.25, Math.min(1, strength)) * (effectsDucked ? 0.45 : 1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + (sweeping ? 0.22 : 0.009));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.gain.linearRampToValueAtTime(0, now + duration + 0.025);
    let source: AudioBufferSourceNode | OscillatorNode;
    if (noisy) {
      const noise = c.createBufferSource(); noise.buffer = effectNoise; source = noise;
    } else {
      const tone = c.createOscillator(); tone.type = name === 'pluck' ? 'triangle' : 'sine';
      const pitches: Partial<Record<SfxName, number>> = { title: 260, card: 340, open: 320, close: 240, hover: 700, click: 440, pluck: 180 };
      const pitch = pitches[name] ?? 300;
      tone.frequency.setValueAtTime(pitch, now);
      tone.frequency.exponentialRampToValueAtTime(pitch * (name === 'open' ? 1.35 : 0.65), now + duration);
      source = tone;
    }
    source.connect(filter).connect(gain).connect(stereo).connect(nodes.master);
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); stereo.disconnect(); };
    source.start(now); source.stop(now + duration + 0.03);
  }

  function glide(param: AudioParam, value: number, seconds: number) {
    if (!context) return;
    param.cancelAndHoldAtTime(context.currentTime);
    param.setTargetAtTime(value, context.currentTime, seconds);
  }

  function build() {
    const c = new AudioContext();
    context = c;
    const master = c.createGain(); master.gain.value = 0;
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -18; compressor.knee.value = 18;
    compressor.ratio.value = 4; compressor.attack.value = 0.025; compressor.release.value = 0.6;
    master.connect(compressor).connect(c.destination);
    const source = c.createMediaElementSource(track);
    const music = c.createGain(); music.gain.value = mix.music;
    source.connect(music).connect(master);
    effectNoise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const fx = effectNoise.getChannelData(0);
    for (let i = 0; i < fx.length; i++) fx[i] = Math.random() * 2 - 1;

    // Soft, stereo brown noise: no whistles, sub-bass, impacts or rising musical cues.
    const buffer = c.createBuffer(2, c.sampleRate * 8, c.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      let brown = 0;
      for (let i = 0; i < samples.length; i++) {
        brown = brown * 0.985 + (Math.random() * 2 - 1) * 0.035;
        const edge = Math.min(1, i / (c.sampleRate * 0.12), (samples.length - 1 - i) / (c.sampleRate * 0.12));
        samples[i] = brown * 1.7 * edge * edge * (3 - 2 * edge);
      }
    }
    const noise = c.createBufferSource(); noise.buffer = buffer; noise.loop = true;
    const lowCut = c.createBiquadFilter(); lowCut.type = 'highpass'; lowCut.frequency.value = 100; lowCut.Q.value = 0.5;
    const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = mix.cutoff; filter.Q.value = 0.4;
    const wind = c.createGain(); wind.gain.value = mix.wind;
    noise.connect(lowCut).connect(filter).connect(wind).connect(master);
    const airFilter = c.createBiquadFilter(); airFilter.type = 'bandpass'; airFilter.frequency.value = 1600; airFilter.Q.value = 0.45;
    const air = c.createGain(); air.gain.value = mix.air;
    noise.connect(airFilter).connect(air).connect(master);
    noise.start();
    nodes = { master, music, wind, air, filter, noise, source };
    applied = { ...mix };
  }

  function seekIntro() {
    track.currentTime = Number.isFinite(track.duration) ? Math.min(MUSIC_START, Math.max(0, track.duration - 0.1)) : MUSIC_START;
  }

  const report = (on: boolean) => {
    if (disposed) return;
    playing = on;
    onChange(on);
  };
  async function start() {
    const id = ++request;
    clearTimeout(pauseTimer);
    try {
      if (!context) build();
      if (!begun) seekIntro();
      // Both calls happen inside the user's gesture, including on mobile Safari.
      await Promise.all([context!.resume(), track.play()]);
      if (disposed || id !== request) return;
      begun = true;
      glide(nodes!.music.gain, mix.music, 0.45);
      glide(nodes!.wind.gain, mix.wind, 1.1);
      glide(nodes!.air.gain, mix.air, 0.8);
      glide(nodes!.filter.frequency, mix.cutoff, 1.2);
      applied = { ...mix };
      glide(nodes!.master.gain, 0.85, 1.2);
      report(true);
    } catch (error) {
      if (disposed || id !== request) return;
      wanted = false;
      track.pause();
      if (nodes) glide(nodes.master.gain, 0, 0.1);
      void context?.suspend();
      report(false);
      console.warn('[threed] Background audio could not start', error);
    }
  }
  function choose(on: boolean) {
    wanted = on;
    try { localStorage.setItem('threed-sound', on ? 'on' : 'off'); } catch { /* private browsing */ }
    if (on) void start();
    else {
      request++;
      if (nodes) glide(nodes.master.gain, 0, 0.065);
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(() => { track.pause(); void context?.suspend(); }, 350);
      report(false);
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      request++; clearTimeout(pauseTimer); track.pause();
      if (nodes && context) { nodes.master.gain.cancelScheduledValues(context.currentTime); nodes.master.gain.value = 0; }
      void context?.suspend(); report(false);
    }
    else if (wanted) void start();
  }, { signal: abort.signal });
  track.addEventListener('loadedmetadata', () => { if (!begun) seekIntro(); }, { signal: abort.signal });
  track.addEventListener('ended', () => {
    if (disposed || !wanted || document.hidden) return;
    seekIntro(); void start();
  }, { signal: abort.signal });
  track.addEventListener('error', () => { wanted = false; track.pause(); void context?.suspend(); report(false); }, { signal: abort.signal });

  return {
    get on() { return playing; },
    enter: choose,
    toggle() { choose(!wanted); },
    sfx,
    update(p: AudioParams) {
      effectsDucked = p.modal;
      const next = soundMix(p);
      if (nodes && playing) {
        if (Math.abs(next.music - applied.music) > 0.0005) {
          glide(nodes.music.gain, next.music, next.music < applied.music ? 0.45 : 1.4); applied.music = next.music;
        }
        if (Math.abs(next.wind - applied.wind) > 0.0001) { glide(nodes.wind.gain, next.wind, next.wind > applied.wind ? 0.22 : 0.85); applied.wind = next.wind; }
        if (next.air !== applied.air) { glide(nodes.air.gain, next.air, 0.8); applied.air = next.air; }
        if (Math.abs(next.cutoff - applied.cutoff) > 1) { glide(nodes.filter.frequency, next.cutoff, 0.35); applied.cutoff = next.cutoff; }
      }
      mix = next;
    },
    dispose() {
      disposed = true;
      request++;
      clearTimeout(pauseTimer);
      abort.abort();
      track.pause();
      nodes?.noise.stop();
      for (const voice of voices) { voice.stop(); voice.disconnect(); }
      voices.clear(); effectNoise = null;
      nodes?.source.disconnect();
      void context?.close();
      context = null;
      nodes = null;
      track.removeAttribute('src');
      track.load();
      track.remove();
    },
  };
}
export type Audio = ReturnType<typeof createAudio>;
