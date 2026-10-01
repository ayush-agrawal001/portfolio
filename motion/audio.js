// Synthesizes the soundtrack sample-by-sample from the shared cue sheet → out/soundtrack.wav
// Restrained electronic bed (120 BPM, D minor), soft key clicks, data pulses, transition accents.
const fs = require('fs');
const path = require('path');
const TL = require('./timeline.js');

const SR = 48000, DUR = TL.duration, N = Math.ceil(SR * DUR);
const dry = [new Float32Array(N), new Float32Array(N)];
const send = [new Float32Array(N), new Float32Array(N)]; // reverb send
const TAU = Math.PI * 2;
let seed = 1234567;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function put(i, l, r, rev = 0) {
  if (i < 0 || i >= N) return;
  dry[0][i] += l; dry[1][i] += r;
  if (rev) { send[0][i] += l * rev; send[1][i] += r * rev; }
}
const panLR = p => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];

// ---------- voices ----------
function keyClick(t, amp = 0.22, pan = 0, heavy = false) {
  const i0 = Math.round(t * SR), len = Math.round(SR * (heavy ? 0.09 : 0.045));
  const [gl, gr] = panLR(pan);
  let lp = 0, prev = 0;
  const tone = heavy ? 150 : 2100 + rand() * 500;
  for (let k = 0; k < len; k++) {
    const s = k / SR;
    const n = rand(); lp += (n - lp) * (heavy ? 0.25 : 0.55);
    const hp = lp - prev; prev = lp; // crude high-pass → papery tick
    const e = Math.exp(-s * (heavy ? 60 : 160));
    const body = Math.sin(TAU * tone * s) * Math.exp(-s * (heavy ? 45 : 400)) * (heavy ? 0.9 : 0.25);
    const v = (hp * 1.4 + body) * e * amp;
    put(i0 + k, v * gl, v * gr, 0.12);
  }
}
function blip(t, f, amp = 0.12, dur = 0.18, pan = 0, rev = 0.35, fm = 0.0) {
  const i0 = Math.round(t * SR), len = Math.round(SR * dur);
  const [gl, gr] = panLR(pan);
  for (let k = 0; k < len; k++) {
    const s = k / SR;
    const e = Math.min(1, s / 0.003) * Math.exp(-s * (6 / dur));
    const mod = fm ? Math.sin(TAU * f * 2 * s) * fm * Math.exp(-s * 30) : 0;
    const v = (Math.sin(TAU * f * s + mod) + 0.18 * Math.sin(TAU * f * 3 * s) * Math.exp(-s * 40)) * e * amp;
    put(i0 + k, v * gl, v * gr, rev);
  }
}
function bassHit(t, amp = 0.8) {
  const i0 = Math.round(t * SR), len = Math.round(SR * 2.6);
  let ph = 0, lp = 0;
  for (let k = 0; k < len; k++) {
    const s = k / SR;
    const f = 36.7 + 70 * Math.exp(-s * 16);
    ph += TAU * f / SR;
    const e = Math.min(1, s / 0.004) * Math.exp(-s * 1.5);
    let v = Math.sin(ph) + 0.25 * Math.sin(ph * 2) * Math.exp(-s * 3);
    v = Math.tanh(v * 1.6) * e * amp;
    // transient
    lp += (rand() - lp) * 0.3;
    v += lp * Math.exp(-s * 90) * 0.35 * amp;
    put(i0 + k, v, v, 0.18);
  }
}
function kick(t, amp = 0.34) {
  const i0 = Math.round(t * SR), len = Math.round(SR * 0.32);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const s = k / SR;
    ph += TAU * (46 + 90 * Math.exp(-s * 38)) / SR;
    const v = Math.tanh(Math.sin(ph) * 1.3) * Math.exp(-s * 11) * amp;
    put(i0 + k, v, v, 0);
  }
}
function hat(t, amp = 0.035, pan = 0.25) {
  const i0 = Math.round(t * SR), len = Math.round(SR * 0.05);
  const [gl, gr] = panLR(pan); let prev = 0;
  for (let k = 0; k < len; k++) {
    const s = k / SR; const n = rand(); const hp = n - prev; prev = n;
    const v = hp * Math.exp(-s * 90) * amp;
    put(i0 + k, v * gl, v * gr, 0.05);
  }
}
function whoosh(t, dur, amp = 0.16, dir = 1) {
  // filtered noise swell with moving pan; dir=-1 reverses (for pull-backs)
  const i0 = Math.round(t * SR), len = Math.round(SR * dur);
  let b1 = 0, b2 = 0;
  for (let k = 0; k < len; k++) {
    const u = k / len;
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, dir > 0 ? 0.7 : 1.4)), 2);
    const fc = 300 + 3500 * (dir > 0 ? u : 1 - u);
    const a = Math.min(0.9, TAU * fc / SR);
    const n = rand(); b1 += (n - b1) * a; b2 += (b1 - b2) * a;
    const bp = b1 - b2;
    const v = bp * env * amp * 2.2;
    const [gl, gr] = panLR((u * 2 - 1) * 0.6 * dir);
    put(i0 + k, v * gl, v * gr, 0.3);
  }
}
function riser(t0, t1, amp = 0.12) {
  const i0 = Math.round(t0 * SR), len = Math.round(SR * (t1 - t0));
  let b = 0;
  for (let k = 0; k < len; k++) {
    const u = k / len;
    const a = Math.min(0.9, TAU * (200 + 5000 * u * u) / SR);
    b += (rand() - b) * a;
    const v = b * Math.pow(u, 2.2) * amp;
    put(i0 + k, v, v, 0.4);
  }
}

// ---------- musical bed ----------
// chords (midi): Dm9, Bbmaj9, Gm9, A7sus4 — two beats per half-bar, one chord per bar (2s)
const CHORDS = [
  [50, 57, 60, 64, 65], // D3 A3 C4 E4 F4
  [46, 53, 57, 60, 62], // Bb2 F3 A3 C4 D4
  [43, 50, 53, 57, 58], // G2 D3 F3 A3 Bb3
  [45, 52, 55, 59, 62], // A2 E3 G3 B3 D4
];
const chordAt = t => CHORDS[Math.floor(Math.max(0, t) / 2) % 4];
function pad() {
  // detuned soft saws, low-passed, with a slow filter swell; ducked by the kick
  const lpS = [0, 0], lp2 = [0, 0];
  const phases = Array.from({ length: 5 }, () => [0, 0, 0]);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const idx = Math.floor(t / 2);
    const frac = (t % 2) / 2;
    const cur = CHORDS[idx % 4];
    let lev = 0.05 * Math.min(1, t / 2.2);
    lev *= 1 + 0.5 * smooth(t, 4, 5) - 0.35 * smooth(t, 9, 9.6) + 0.35 * smooth(t, 13.5, 14.5);
    if (t > 20.6) lev *= 1 - 0.7 * smooth(t, 20.6, 21.3);
    if (t > 21.4) lev = 0.075 * Math.exp(-(t - 21.4) * 0.35);
    // xfade between chords over 120ms
    const xf = Math.min(1, frac * 2 / 0.12);
    const prev = CHORDS[(idx + 3) % 4];
    let s = [0, 0];
    for (let v = 0; v < 5; v++) {
      const fA = mtof(t > 21.4 ? CHORDS[0][v] : cur[v]), fB = mtof(prev[v]);
      const f = t > 21.4 ? fA : L(fB, fA, xf);
      for (let d = 0; d < 3; d++) {
        const det = [0.9965, 1, 1.0035][d];
        phases[v][d] = (phases[v][d] + f * det / SR) % 1;
        const saw = 2 * phases[v][d] - 1;
        s[d === 0 ? 0 : d === 2 ? 1 : (v % 2)] += saw * (d === 1 ? 0.7 : 0.5);
      }
    }
    const cutoff = 500 + 900 * smooth(t, 3.5, 6) + 700 * smooth(t, 14, 16) - 800 * smooth(t, 20.4, 21.2) + 400 * Math.sin(t * 0.7);
    const a = Math.min(0.5, TAU * Math.max(200, cutoff) / SR);
    // sidechain from kick grid
    let duck = 1;
    if (t >= 4 && t < 20.6) { const ph = (t - 4) % 0.5; duck = 1 - 0.45 * Math.exp(-ph * 14); }
    for (let c = 0; c < 2; c++) {
      lpS[c] += (s[c] - lpS[c]) * a; lp2[c] += (lpS[c] - lp2[c]) * a;
      const v = lp2[c] * lev * duck * 0.35;
      dry[c][i] += v; send[c][i] += v * 0.5;
    }
  }
}
function subBass() {
  // 8th-note root pulse under the rhythm section (4.0 → 20.6)
  for (let b = 0; ; b++) {
    const t = 4 + b * 0.25;
    if (t >= 20.6) break;
    const root = chordAt(t)[0] - 12;
    const f = mtof(root);
    const i0 = Math.round(t * SR), len = Math.round(SR * 0.22);
    const acc = (b % 2 === 0) ? 1 : 0.6;
    let ph = 0;
    for (let k = 0; k < len; k++) {
      const s = k / SR; ph += TAU * f / SR;
      const e = Math.min(1, s / 0.006) * Math.exp(-s * 9) * (b % 2 === 0 ? 0.6 : 1);
      const v = Math.tanh((Math.sin(ph) + 0.3 * Math.sin(ph * 2)) * 1.4) * e * 0.11 * acc;
      put(i0 + k, v, v, 0);
    }
  }
}
function arp() {
  // quiet 16th pluck arpeggio for the experience + projects sections
  const pattern = [0, 2, 3, 4, 3, 2, 1, 2];
  for (let n = 0; ; n++) {
    const t = 9.0 + n * 0.125;
    if (t >= 20.5) break;
    const ch = chordAt(t);
    const m = ch[pattern[n % 8]] + 12;
    const lvl = 0.028 * (0.6 + 0.4 * smooth(t, 9, 11)) * (n % 4 === 0 ? 1.2 : 0.85) * (1 + 0.4 * smooth(t, 14, 15));
    const pan = Math.sin(n * 0.9) * 0.5;
    blip(t, mtof(m), lvl, 0.22, pan, 0.45, 0.8);
  }
}
function L(a, b, p) { return a + (b - a) * p; }
function smooth(t, a, b) { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); }

// ---------- reverb (Schroeder/Freeverb-style) ----------
function reverb(inp, outL, outR) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map(n => Math.round(n * SR / 44100));
  const aps = [556, 441, 341, 225].map(n => Math.round(n * SR / 44100));
  const run = (x, spread, out) => {
    const cb = combs.map(n => ({ buf: new Float32Array(n + spread), i: 0, lp: 0 }));
    const ab = aps.map(n => ({ buf: new Float32Array(n + spread), i: 0 }));
    const fb = 0.84, damp = 0.3;
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (const c of cb) { const y = c.buf[c.i]; c.lp = y * (1 - damp) + c.lp * damp; c.buf[c.i] = x[i] + c.lp * fb; c.i = (c.i + 1) % c.buf.length; s += y; }
      s *= 0.12;
      for (const a of ab) { const b = a.buf[a.i]; const y = -s + b; a.buf[a.i] = s + b * 0.5; a.i = (a.i + 1) % a.buf.length; s = y; }
      out[i] += s;
    }
  };
  run(inp[0], 0, outL); run(inp[1], 23, outR);
}

// ---------- score ----------
pad();

// 01 — identity: typing, enter, riser, bass hit
TL.charTimes.forEach((t, i) => keyClick(t, 0.2 + 0.05 * ((i * 7) % 3), ((i * 5) % 7 - 3) * 0.06));
keyClick(TL.enter, 0.34, 0, true);
riser(1.6, TL.bass1, 0.1);
bassHit(TL.bass1, 0.85);
blip(TL.bass1, mtof(74), 0.05, 1.2, 0, 0.8);
whoosh(3.75, 0.7, 0.12);

// label retypes (very quiet)
TL.labelTypeTimes.forEach((t, i) => keyClick(t, 0.07, 0.4 + (i % 2) * 0.1));

// 02 — systems: rhythm section in, packet hops, auth pass, response
for (let t = 4.0; t < 20.6; t += 0.5) kick(t, t < 4.4 ? 0.3 : 0.26);
for (let t = 4.25; t < 20.6; t += 0.5) hat(t, 0.03, 0.3);
for (let t = 4.125; t < 20.6; t += 0.25) if (Math.round((t - 4.125) / 0.25) % 2 === 0) hat(t, 0.013, -0.35);
subBass();
[4.0, 4.08, 4.16, 4.24].forEach((t, i) => blip(t, mtof(86 + [0, 3, 5, 7][i]), 0.035, 0.08, -0.6 + i * 0.4, 0.3));
const H = TL.hops;
blip(H.req, mtof(81), 0.09, 0.14, -0.6, 0.3, 1.2);
blip(H.api, mtof(84), 0.09, 0.14, -0.2, 0.3, 1.2);
blip(H.auth, mtof(86), 0.08, 0.14, 0.2, 0.3, 1.2);
blip(H.pass, mtof(88), 0.09, 0.25, 0.2, 0.5); blip(H.pass + 0.07, mtof(93), 0.08, 0.35, 0.2, 0.5);
blip(H.db, mtof(84), 0.08, 0.14, 0.6, 0.3, 1.2);
[0, 0.04, 0.08].forEach(d => keyClick(H.db + 0.02 + d, 0.06, 0.6));
whoosh(H.resp, 0.5, 0.07, -1);
blip(H.ok, mtof(93), 0.09, 0.4, -0.6, 0.55); blip(H.ok + 0.06, mtof(98), 0.07, 0.5, -0.6, 0.55);
whoosh(TL.morph[0] - 0.05, 0.6, 0.1);
TL.phrases.forEach((t, i) => { blip(t, mtof([62, 65, 69][i]), 0.12, 0.6, -0.1, 0.5, 0.6); blip(t, mtof([74, 77, 81][i]), 0.05, 0.5, 0.1, 0.6); });

// 03 — experience
whoosh(TL.exit2 - 0.1, 0.8, 0.13);
blip(TL.panelA, mtof(79), 0.05, 0.3, -0.5, 0.5); blip(TL.panelB, mtof(83), 0.05, 0.3, 0.5, 0.5);
keyClick(TL.rbac, 0.16, -0.5); blip(TL.rbac, mtof(88), 0.06, 0.25, -0.5, 0.4);
keyClick(TL.perp, 0.16, 0.5); blip(TL.perp + 0.02, mtof(91), 0.05, 0.25, 0.5, 0.4);
whoosh(TL.flatten[0] - 0.1, 0.75, 0.13);

// 04 — proof of work
const S = TL.s0, S1 = TL.s1, S2 = TL.s2;
blip(S.bubble, mtof(84), 0.06, 0.2, -0.6, 0.4);
[...'/mint token'].forEach((_, i) => keyClick(S.type + i * 0.035, 0.1, -0.5));
whoosh(S.morph - 0.05, 0.45, 0.07);
S.nodes.forEach((t, i) => blip(t, mtof([81, 84, 86][i]), 0.08, 0.14, -0.4 + i * 0.3, 0.3, 1.2));
blip(S.coin, mtof(93), 0.09, 0.6, 0.5, 0.6); blip(S.coin + 0.08, mtof(100), 0.05, 0.6, 0.5, 0.6);
whoosh(TL.pan1[0] - 0.05, 0.8, 0.15);
blip(S1.card, mtof(84), 0.06, 0.2, -0.5, 0.4);
blip(S1.a, mtof(86), 0.08, 0.18, -0.1, 0.4, 1.0);
blip(S1.pills, mtof(89), 0.05, 0.16, -0.2, 0.4); blip(S1.pills + 0.06, mtof(89), 0.04, 0.16, 0.0, 0.4);
blip(S1.bc, mtof(91), 0.05, 0.16, 0.3, 0.4); blip(S1.posts, mtof(93), 0.05, 0.2, 0.6, 0.4);
whoosh(TL.pan2[0] - 0.05, 0.8, 0.15);
S2.states.forEach((t, i) => { blip(t, mtof([81, 86, 93][i]), 0.1, 0.35, -0.5 + i * 0.5, 0.5); if (i === 2) blip(t + 0.07, mtof(98), 0.07, 0.6, 0.5, 0.6); });
whoosh(TL.pull[0] - 0.1, 0.9, 0.14, -1);

// 05 — signature
riser(20.9, TL.bass2, 0.07);
bassHit(TL.bass2, 0.8);
blip(TL.bass2, mtof(62), 0.06, 2.2, 0, 0.9); blip(TL.bass2 + 0.02, mtof(69), 0.04, 2.2, 0, 0.9);
TL.urlTimes.forEach((t, i) => keyClick(t, 0.13, 0.5 + ((i * 3) % 5 - 2) * 0.04));
blip(TL.pulse, mtof(86), 0.07, 1.2, 0.5, 0.8); blip(TL.pulse + 0.09, mtof(93), 0.04, 1.4, 0.5, 0.9);

// ---------- mix ----------
const wetL = new Float32Array(N), wetR = new Float32Array(N);
reverb(send, wetL, wetR);
const out = [new Float32Array(N), new Float32Array(N)];
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fadeIn = Math.min(1, t / 0.05), fadeOut = t > DUR - 0.35 ? Math.max(0, (DUR - t) / 0.35) : 1;
  for (let c = 0; c < 2; c++) {
    let v = dry[c][i] + (c ? wetR[i] : wetL[i]) * 0.55;
    v = Math.tanh(v * 1.1) / 1.1; // gentle glue
    v *= fadeIn * fadeOut;
    out[c][i] = v; peak = Math.max(peak, Math.abs(v));
  }
}
const norm = 0.89 / peak; // ≈ -1 dBFS
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[c][i] * norm)) * 32767), 44 + i * 4 + c * 2);
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'soundtrack.wav'), buf);
console.log('soundtrack.wav written, peak before norm', peak.toFixed(3));
