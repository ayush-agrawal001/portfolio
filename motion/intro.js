'use strict';
/* Ayush Agrawal — 25s intro. Deterministic: drawFrame(t) paints the exact frame for time t. */

const W = 1920, H = 1080;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

// ---------- palette ----------
const BG = '#0B0B0A', PANEL = '#121110', PANEL2 = '#181715';
const ink = a => `rgba(241,236,226,${a})`;
const acc = a => `rgba(255,106,43,${a})`; // signal orange
const lime = a => `rgba(200,245,71,${a})`;
const INK = '#F1ECE2', ACC = '#FF6A2B', ACC_T = '#FF915E', LIME = '#C8F547';
const SANS = 'Sora', MONO = "'Geist Mono'";

// ---------- math ----------
const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const L = (a, b, p) => a + (b - a) * p;
const E = {
  lin: t => t,
  o3: t => 1 - Math.pow(1 - t, 3),
  o4: t => 1 - Math.pow(1 - t, 4),
  o5: t => 1 - Math.pow(1 - t, 5),
  oExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  io3: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  io5: t => t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2,
  i3: t => t * t * t,
  back: t => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const P = (t, a, b, e = E.o4) => e(cl((t - a) / (b - a)));
// in-then-out envelope: rises over [a,b], falls over [c,d]
const env = (t, a, b, c, d, e = E.o3) => P(t, a, b, e) * (1 - P(t, c, d, e));
function kf(t, keys, e = E.io3) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t <= t1) return L(v0, v1, e(cl((t - t0) / (t1 - t0))));
  }
  return keys[keys.length - 1][1];
}
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ---------- drawing helpers ----------
function setFont(w, size, f = SANS, ls = 0) { ctx.font = `${w} ${size}px ${f}`; ctx.letterSpacing = ls + 'px'; }
function measure(s, w, size, f = SANS, ls = 0) { ctx.save(); setFont(w, size, f, ls); const m = ctx.measureText(s).width; ctx.restore(); return m; }
function text(s, x, y, o = {}) {
  ctx.save(); setFont(o.w || 400, o.size || 20, o.f || SANS, o.ls || 0);
  ctx.textAlign = o.align || 'left'; ctx.fillStyle = o.c || INK;
  if (o.a !== undefined) ctx.globalAlpha *= o.a;
  ctx.fillText(s, x, y); ctx.restore();
}
// masked text: p 0→1 rises into view from its baseline mask, 1→2 exits upward
function mtext(content, x, y, p, o = {}) {
  const size = o.size;
  const segs = typeof content === 'string' ? [[content, o.c || INK]] : content;
  ctx.save(); setFont(o.w || 600, size, o.f || SANS, o.ls || 0);
  const ws = segs.map(s => ctx.measureText(s[0]).width), tw = ws.reduce((a, b) => a + b, 0);
  if (p <= 0 || p >= 2) { ctx.restore(); return tw; }
  const x0 = o.align === 'right' ? x - tw : o.align === 'center' ? x - tw / 2 : x;
  ctx.beginPath(); ctx.rect(x0 - 60, y - size * 1.08, tw + 120, size * 1.42); ctx.clip();
  const off = p < 1 ? (1 - p) * size * 1.4 : -(p - 1) * size * 1.4;
  if (o.a !== undefined) ctx.globalAlpha *= o.a;
  let cx = x0;
  segs.forEach((s, i) => { ctx.fillStyle = s[1]; ctx.fillText(s[0], cx, y + off); cx += ws[i]; });
  ctx.restore(); return tw;
}
// per-character masked reveal (kerning preserved via prefix widths)
function mchars(s, x, y, t, tIn, tOut, o) {
  ctx.save(); setFont(o.w, o.size, o.f || SANS, o.ls || 0); ctx.fillStyle = o.c || INK;
  const size = o.size;
  const full = ctx.measureText(s).width;
  ctx.beginPath(); ctx.rect(x - 40, y - size * 1.08, full + 80, size * 1.42); ctx.clip();
  for (let i = 0; i < s.length; i++) {
    const px = x + ctx.measureText(s.slice(0, i)).width;
    let p = P(t, tIn + i * o.stagger, tIn + i * o.stagger + o.dur, E.o5);
    if (tOut !== null) p += P(t, tOut + i * 0.018, tOut + i * 0.018 + 0.34, E.i3);
    if (p <= 0 || p >= 2) continue;
    const off = p < 1 ? (1 - p) * size * 1.4 : -(p - 1) * size * 1.4;
    ctx.fillText(s[i], px, y + off);
  }
  ctx.restore(); return full;
}
function rrLen(w, h, r) { return 2 * (w + h) - 8 * r + 2 * Math.PI * r; }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function strokeRR(x, y, w, h, r, p, style, lw = 1.5) {
  if (p <= 0) return;
  ctx.save(); ctx.strokeStyle = style; ctx.lineWidth = lw;
  if (p < 1) { const len = rrLen(w, h, Math.min(r, w / 2, h / 2)); ctx.setLineDash([len * p, len + 10]); }
  rr(x, y, w, h, r); ctx.stroke(); ctx.restore();
}
function line(x1, y1, x2, y2, style, lw = 1.5) { ctx.save(); ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function lineP(x1, y1, x2, y2, p, style, lw = 1.5) { if (p <= 0) return; line(x1, y1, L(x1, x2, p), L(y1, y2, p), style, lw); }
function dot(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
function ring(x, y, r, style, lw = 1.5) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); }
function glow(color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
function corners(x, y, w, h, len, a) {
  if (a <= 0) return;
  ctx.save(); ctx.strokeStyle = ink(0.5 * a); ctx.lineWidth = 1.5; ctx.beginPath();
  [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, sx, sy]) => {
    ctx.moveTo(cx + sx * len, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * len);
  });
  ctx.stroke(); ctx.restore();
}
function check(x, y, s, style, lw = 2, p = 1) {
  // small tick drawn progressively
  const pts = [[x - s * .5, y], [x - s * .12, y + s * .38], [x + s * .55, y - s * .4]];
  const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
  ctx.save(); ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.setLineDash([(l1 + l2) * p, l1 + l2 + 5]);
  ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.stroke(); ctx.restore();
}
function packet(x, y, color, a = 1, r = 8) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
  g.addColorStop(0, color === LIME ? lime(0.28) : acc(0.35)); g.addColorStop(1, color === LIME ? lime(0) : acc(0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill();
  glow(color, 16); dot(x, y, r, color); ctx.shadowBlur = 0;
  dot(x, y, r * 0.38, 'rgba(255,255,255,0.85)');
  ctx.restore();
}
// cursor block ↔ packet morph (m=0 block, m=1 dot)
function cursorShape(x, y, m, color, a = 1, bw = 16, bh = 34) {
  if (a <= 0) return;
  if (m >= 1) return packet(x, y, color, a);
  const w = L(bw, 16, m), h = L(bh, 16, m), r = L(2, 8, m);
  ctx.save(); ctx.globalAlpha *= a; glow(color === INK ? ink(0.35) : color, L(6, 16, m));
  rr(x - w / 2, y - h / 2, w, h, r); ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
const mixColor = (c1, c2, p) => {
  const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const a = h(c1), b = h(c2);
  return '#' + a.map((v, i) => Math.round(L(v, b[i], p)).toString(16).padStart(2, '0')).join('');
};

// ---------- background ----------
function background(t, camX) {
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  // focus glow drifts with the story
  const gx = kf(t, [[0, 960], [2.2, 720], [4, 720], [4.6, 960], [9, 960], [14, 820], [21.2, 820], [22, 760]]);
  const gy = kf(t, [[0, 540], [2.2, 560], [9, 560], [14, 620], [21.2, 620], [22, 580]]);
  const gi = 0.03 + 0.012 * P(t, 21.4, 22.4);
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 980);
  g.addColorStop(0, acc(gi)); g.addColorStop(1, acc(0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // engineering dot grid, parallaxed against the camera
  const s = 48, ox = ((-camX * 0.35) % s + s) % s;
  const ga = 0.05 * P(t, 0.2, 1.4, E.o3);
  ctx.fillStyle = ink(ga);
  for (let x = ox - s; x < W + s; x += s) for (let y = 12; y < H; y += s) ctx.fillRect(x, y, 2, 2);
  vignette();
}
function vignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------- HUD (prompt label + chapter) ----------
function hudLabel(t) {
  const Ls = TL.labels;
  let i = -1; for (let k = 0; k < Ls.length; k++) if (t >= Ls[k][0]) i = k;
  if (i < 0 || t < 2.85) return;
  let s;
  if (i === 0) s = Ls[0][1];
  else {
    const [t0, next] = Ls[i], prev = Ls[i - 1][1];
    const del = prev.length * 0.012;
    if (t < t0 + del) s = prev.slice(0, Math.max(0, Math.ceil(prev.length - (t - t0) / 0.012)));
    else s = next.slice(0, Math.floor((t - t0 - del) / 0.03) + 1);
  }
  if (!s) return;
  const a = 1 - P(t, 21.1, 21.4);
  setFont(400, 16, MONO); ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = ACC_T; ctx.fillText(s.slice(0, 1), 240, 196);
  ctx.fillStyle = ink(0.45); ctx.fillText(s.slice(1), 240 + ctx.measureText('>').width, 196);
  ctx.restore();
}
function hudChapter(t) {
  TL.chapters.forEach(([t0, n, name], i) => {
    if (!n) return;
    const t1 = TL.chapters[i + 1] ? TL.chapters[i + 1][0] : 99;
    const p = P(t, t0 + 0.12, t0 + 0.5, E.o5) + P(t, t1 - 0.06, t1 + 0.18, E.i3);
    mtext([[n + '  ', ACC_T], [name, ink(0.45)]], 1680, 196, p, { size: 16, w: 400, f: MONO, align: 'right', ls: 1.5 });
  });
}

// =====================================================================
// 01 — IDENTITY  (0 – 4.3)
// =====================================================================
const FRAME = { x: 160, y: 150, w: 1600, h: 780 };
const NAME = { x: 240, y1: 455, y2: 650, size: 200, w: 700, ls: -2 };
const SUB = 'Backend-focused Full-stack Engineer';

function scene1(t) {
  if (t > 4.4) return;
  const small = { x: 580, y: 470, w: 760, h: 140 };
  const ex = P(t, TL.expand[0], TL.expand[1], E.io5);
  const r = { x: L(small.x, FRAME.x, ex), y: L(small.y, FRAME.y, ex), w: L(small.w, FRAME.w, ex), h: L(small.h, FRAME.h, ex) };
  const rad = L(12, 0, ex);

  // terminal body
  const fillA = P(t, 0.45, 0.9, E.o3) * (1 - P(t, 2.15, 2.6, E.o3));
  if (fillA > 0) {
    ctx.save(); ctx.globalAlpha = fillA; glow('rgba(0,0,0,0.6)', 60); ctx.shadowOffsetY = 20;
    rr(r.x, r.y, r.w, r.h, rad); ctx.fillStyle = PANEL; ctx.fill(); ctx.restore();
  }
  strokeRR(r.x, r.y, r.w, r.h, rad, P(t, 0.3, 0.9, E.io3), ink(0.22 * (1 - P(t, 2.3, 2.9, E.o3))));
  // title bar
  const tb = P(t, 0.7, 1.0) * (1 - P(t, 2.15, 2.3));
  if (tb > 0) {
    ctx.save(); ctx.globalAlpha = tb;
    for (let i = 0; i < 3; i++) ring(r.x + 24 + i * 18, r.y + 21, 4.5, ink(0.28), 1.2);
    text('~/ayush', r.x + r.w / 2, r.y + 26, { f: MONO, size: 14, c: ink(0.38), align: 'center' });
    line(r.x, r.y + 42, r.x + r.w, r.y + 42, ink(0.08), 1);
    ctx.restore();
  }
  // corner marks: the terminal's frame resolves into crop marks
  corners(r.x, r.y, r.w, r.h, 26, P(t, 2.25, 2.7) * (1 - P(t, 3.8, 4.15)));

  // typed command → moves up to become the HUD prompt label
  const typed = TL.charTimes.filter(ct => t >= ct).length;
  const promptA = P(t, 0.8, 0.95);
  const mv = P(t, 2.15, 2.85, E.io5);
  const cx0 = 616, cy0 = 574;
  setFont(400, 30, MONO);
  const promptW = ctx.measureText('> ').width;
  const typedW = ctx.measureText(TL.cmd.slice(0, typed)).width;
  if (t < 2.85 && promptA > 0) {
    ctx.save();
    ctx.translate(L(cx0, 240, mv), L(cy0, 196, mv)); ctx.scale(L(1, 16 / 30, mv), L(1, 16 / 30, mv));
    setFont(400, 30, MONO);
    ctx.globalAlpha = promptA; ctx.fillStyle = ACC_T; ctx.fillText('>', 0, 0);
    const flash = env(t, TL.enter, TL.enter + 0.05, TL.enter + 0.1, TL.enter + 0.4);
    ctx.fillStyle = mv > 0 ? ink(L(1, 0.45, mv)) : ink(0.92 + 0.08 * flash);
    ctx.fillText(TL.cmd.slice(0, typed), promptW, 0);
    ctx.restore();
  }

  // name
  const nameOut = 3.75;
  mchars('AYUSH', NAME.x, NAME.y1, t, TL.bass1, nameOut, { w: NAME.w, size: NAME.size, ls: NAME.ls, stagger: 0.035, dur: 0.7 });
  mchars('AGRAWAL', NAME.x, NAME.y2, t, TL.bass1 + 0.1, nameOut + 0.06, { w: NAME.w, size: NAME.size, ls: NAME.ls, stagger: 0.035, dur: 0.7 });
  // accent rule
  const ruleIn = P(t, 2.95, 3.4, E.io3), ruleOut = P(t, 3.85, 4.15, E.io3);
  if (ruleIn > ruleOut) line(NAME.x + 120 * ruleOut, 712, NAME.x + 120 * ruleIn, 712, ACC, 2);

  // subtitle — revealed by the cursor sweeping across it
  const subW = measure(SUB, 400, 40);
  const sw = P(t, TL.sweep[0], TL.sweep[1], E.io3);
  const curSweepX = NAME.x + 4 + sw * (subW + 10);
  if (sw > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(NAME.x - 10, 740, curSweepX - NAME.x + 2, 80); ctx.clip();
    const outP = P(t, 3.9, 4.25, E.i3);
    text(SUB, NAME.x, 790 - outP * 50, { size: 40, w: 400, c: ink(0.72), a: 1 - outP });
    ctx.restore();
  }

  // cursor: terminal → subtitle start → sweep → blink → becomes the data packet
  const termCurX = cx0 + promptW * promptA + typedW + 10, termCurY = cy0 - 10;
  const typingNow = t > TL.typeStart - 0.05 && t < TL.charTimes[TL.charTimes.length - 1] + 0.15;
  let cx, cy, m = 0, bw = 16, bh = 34, on = 1, col = INK;
  if (t < 2.2) {
    cx = termCurX; cy = termCurY;
    if (!typingNow) on = ((t + 0.1) % 1.0) < 0.55 ? 1 : 0;
    on *= P(t, 0.08, 0.2);
  } else if (t < TL.sweep[0]) {
    const p = P(t, 2.2, 2.95, E.io5);
    cx = L(termCurX, NAME.x + 4, p); cy = L(termCurY, 776, p);
    bw = L(16, 18, p); bh = L(34, 42, p);
  } else if (t < 3.85) {
    cx = curSweepX; cy = 776; bw = 18; bh = 42;
    if (t > TL.sweep[1] + 0.1) on = ((t - TL.sweep[1]) % 0.7) < 0.4 ? 1 : 0.0;
  } else {
    const p = P(t, 3.85, 4.3, E.io5);
    cx = L(NAME.x + 4 + subW + 10, 176, p); cy = L(776, 540, p);
    bw = 18; bh = 42; m = p; col = mixColor(INK, ACC, p);
  }
  if (t < 4.3) cursorShape(cx, cy, m, col, on, bw, bh);
}

// =====================================================================
// 02 — SYSTEMS  (4.0 – 9.5)
// =====================================================================
const NODES = [
  { cx: 360, title: 'Request', idx: '01', detail: 'GET /employees' },
  { cx: 760, title: 'API', idx: '02', detail: 'route · validate' },
  { cx: 1160, title: 'Auth', idx: '03', detail: 'role check' },
  { cx: 1560, title: 'Database', idx: '04', detail: null },
];
const NY = 540, NW = 260, NH = 160;
const RAIL = { x: 250, ys: [396, 536, 676] };
const PHRASES = [
  [['Design the system', INK], ['.', ACC]],
  [['Connect the pieces', INK], ['.', ACC]],
  [['Ship the product', INK], ['.', LIME]],
];
const PY = [430, 570, 710];

function packet2(t) {
  const H2 = TL.hops;
  if (t < 4.3) return null;
  if (t < H2.resp) {
    const x = kf(t, [[4.3, 176], [H2.req, 232], [4.62, 490], [H2.api, 630], [5.02, 890], [H2.auth, 1030], [5.42, 1160], [H2.pass, 1160], [5.74, 1290], [H2.db, 1430], [6.05, 1560]]);
    return { x, y: NY, c: ACC };
  }
  // response path: down from the database, back along the return rail, up into the request
  const pts = [[1560, 620], [1560, 668], [360, 668], [360, 620]];
  const s = P(t, H2.resp, H2.ok, E.io3);
  const segs = [48, 1200, 48], tot = 1296; let d = s * tot, i = 0;
  while (i < 2 && d > segs[i]) { d -= segs[i]; i++; }
  const q = cl(d / segs[i]);
  let x = L(pts[i][0], pts[i + 1][0], q), y = L(pts[i][1], pts[i + 1][1], q);
  if (t > H2.ok) {
    // ride to rail marker, then down the rail with each phrase
    if (t <= TL.morph[1]) {
      const mp = P(t, TL.morph[0], TL.morph[1], E.io5);
      x = L(360, RAIL.x, mp); y = L(620, RAIL.ys[0], mp);
    } else {
      x = RAIL.x;
      const F = TL.phrases;
      y = kf(t, [[TL.morph[1], RAIL.ys[0]], [F[1] - 0.22, RAIL.ys[0]], [F[1], RAIL.ys[1]], [F[2] - 0.22, RAIL.ys[1]], [F[2], RAIL.ys[2]]], E.io3);
    }
  }
  return { x, y, c: LIME };
}

function scene2(t) {
  if (t < 3.95 || t > TL.exit2 + 1.5) return;
  const H2 = TL.hops;
  const M0 = TL.morph[0], M1 = TL.morph[1];
  const sizeP = P(t, M0, M0 + 0.3, E.io3);        // phase 1: nodes collapse in place
  const posP = P(t, M0 + 0.22, M1, E.io5);         // phase 2: markers fly to the rail
  const morph = sizeP;
  const textA = 1 - P(t, M0 - 0.05, M0 + 0.1);
  const targets = [[RAIL.x, RAIL.ys[0]], [RAIL.x, RAIL.ys[0]], [RAIL.x, RAIL.ys[1]], [RAIL.x, RAIL.ys[2]]];
  const rects = NODES.map((n, i) => {
    const s = 14;
    return {
      cx: L(n.cx, targets[i][0], posP), cy: L(NY, targets[i][1], posP),
      w: L(NW, s, sizeP), h: L(NH, s, sizeP), r: L(14, 3, sizeP),
    };
  });
  const exitA = 1 - P(t, TL.exit2, TL.exit2 + 0.25);

  // entry stub
  lineP(150, NY, 230, NY, P(t, 4.05, 4.4, E.io3), ink(0.18 * textA));

  // connectors (center-to-center, behind opaque nodes)
  if (t < TL.exit2 + 0.05) for (let i = 0; i < 3; i++) {
    const a = rects[i], b = rects[i + 1];
    const p = P(t, 4.25 + i * 0.1, 4.6 + i * 0.1, E.io3);
    const fade = i === 0 ? 1 - posP : 1;
    const x1 = L(NODES[i].cx, a.cx, 1), y1 = a.cy;
    lineP(x1, y1, L(x1, b.cx, 1), L(y1, b.cy, 1), p, ink(0.22 * fade), 1.5);
    // chevron at midpoint
    if (morph < 0.1) {
      const mx = (NODES[i].cx + NODES[i + 1].cx) / 2, ca = P(t, 4.5 + i * 0.1, 4.7 + i * 0.1) * textA;
      ctx.save(); ctx.strokeStyle = ink(0.35 * ca); ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(mx - 4, NY - 6); ctx.lineTo(mx + 3, NY); ctx.lineTo(mx - 4, NY + 6); ctx.stroke(); ctx.restore();
    }
  }
  // return rail (response path)
  const retIn = P(t, H2.resp - 0.2, H2.resp + 0.15, E.io3), retOut = 1 - P(t, M0 - 0.05, M0 + 0.15);
  if (retIn > 0 && retOut > 0) {
    ctx.save(); ctx.setLineDash([4, 6]); ctx.globalAlpha = retOut;
    line(1560, 620, 1560, 668, ink(0.2 * retIn)); line(1560, 668, L(1560, 360, retIn), 668, ink(0.2 * retIn)); line(360, 668, 360, 620, ink(0.2 * retIn));
    ctx.restore();
  }

  // packet trail (drawn under nodes so it enters them)
  const pk = packet2(t);
  if (pk && t < H2.ok + 0.02) packet(pk.x, pk.y, pk.c, 1);

  // nodes
  rects.forEach((r, i) => {
    const n = NODES[i];
    const drawP = P(t, 4.0 + i * 0.08, 4.6 + i * 0.08, E.io3);
    const fillP = P(t, 4.25 + i * 0.08, 4.6 + i * 0.08);
    let reqFade = i === 0 ? 1 - P(t, M0 + 0.3, M1) : 1;
    const markerExit = t > TL.exit2 ? 1 - P(t, TL.exit2, TL.exit2 + 0.2) : 1;
    const x = r.cx - r.w / 2, y = r.cy - r.h / 2;
    // activity
    let act = 0, actC = ACC;
    if (i === 0) { act = env(t, H2.req - 0.05, H2.req + 0.05, 4.62, 4.9); if (t > H2.ok - 0.05) { act = 1; actC = LIME; } }
    if (i === 1) act = env(t, H2.api - 0.05, H2.api + 0.05, 5.02, 5.3);
    if (i === 2) { act = env(t, H2.auth - 0.05, H2.auth + 0.05, 5.6, 5.7); if (t > H2.pass) { act = 1 - 0.5 * P(t, H2.pass + 0.2, H2.pass + 0.6); actC = LIME; } }
    if (i === 3) act = env(t, H2.db - 0.05, H2.db + 0.05, 6.2, 6.5);
    // marker phase highlighting
    let mark = 0;
    if (i >= 1 && t > TL.morph[1] - 0.05) mark = P(t, TL.phrases[i - 1] - 0.08, TL.phrases[i - 1] + 0.05);
    ctx.save(); ctx.globalAlpha = reqFade * markerExit;
    if (fillP > 0) {
      ctx.save(); ctx.globalAlpha *= fillP;
      if (morph < 0.5) { glow('rgba(0,0,0,0.55)', 40); ctx.shadowOffsetY = 14; }
      rr(x, y, r.w, r.h, r.r);
      const base = mixColor(PANEL, '#3D3A36', P(t, M0 + 0.18, M0 + 0.32));
      ctx.fillStyle = mark > 0 ? mixColor(base, i === 3 ? LIME : ACC, mark) : base;
      ctx.fill(); ctx.restore();
      // top highlight
      if (morph < 0.3) line(x + 14, y + 0.75, x + r.w - 14, y + 0.75, ink(0.07 * fillP * (1 - morph)), 1);
    }
    const strokeC = act > 0.01 ? (actC === LIME ? lime(0.25 + 0.6 * act) : acc(0.3 + 0.7 * act)) : ink(0.2);
    if (morph < 0.95) {
      if (act > 0.01) { ctx.save(); glow(actC === LIME ? lime(0.5) : acc(0.6), 22 * act); strokeRR(x, y, r.w, r.h, r.r, drawP, strokeC, 1.5); ctx.restore(); }
      else strokeRR(x, y, r.w, r.h, r.r, drawP, strokeC, 1.5);
    }
    // contents
    const ca = fillP * textA;
    if (ca > 0) {
      ctx.save(); ctx.globalAlpha *= ca;
      text(n.idx, x + 22, y + 34, { f: MONO, size: 13, c: ink(0.38) });
      const sd = act > 0.01 ? actC : ink(0.25);
      if (act > 0.01) { ctx.save(); glow(actC, 10); dot(x + r.w - 26, y + 29, 4.5, sd); ctx.restore(); } else ring(x + r.w - 26, y + 29, 4, ink(0.3), 1.2);
      text(n.title, x + 22, y + 90, { size: 34, w: 600, ls: -0.5 });
      if (i === 0) {
        const ok = t > H2.ok;
        text(ok ? '200 OK' : n.detail, x + 22, y + 132, { f: MONO, size: 16, c: ok ? LIME : ink(0.62) });
      } else if (i === 2) {
        const passed = t > H2.pass;
        text(passed ? 'access granted' : n.detail, x + 22, y + 132, { f: MONO, size: 16, c: passed ? LIME : ink(0.62) });
        const sp = P(t, H2.auth, H2.pass - 0.02, E.io3);
        if (sp > 0) { line(x + 22, y + r.h - 14, x + r.w - 22, y + r.h - 14, ink(0.08), 2); line(x + 22, y + r.h - 14, x + 22 + (r.w - 44) * sp, y + r.h - 14, t > H2.pass ? LIME : ACC, 2); }
      } else if (i === 3) {
        for (let k = 0; k < 3; k++) {
          const hit = k === 1 ? env(t, H2.rows, H2.rows + 0.06, 6.3, 6.6) : 0;
          const scan = env(t, H2.db + k * 0.04, H2.db + k * 0.04 + 0.05, H2.db + k * 0.04 + 0.1, H2.db + k * 0.04 + 0.2);
          rr(x + 22, y + 110 + k * 12, [190, 150, 170][k], 5, 2.5);
          ctx.fillStyle = hit > 0 ? acc(0.3 + 0.7 * hit) : ink(0.14 + 0.25 * scan); ctx.fill();
        }
      } else {
        text(n.detail, x + 22, y + 132, { f: MONO, size: 16, c: ink(0.62) });
      }
      ctx.restore();
    }
    ctx.restore();
  });

  // rail (after morph) and its transformation into the experience panels' top edge
  if (t > TL.morph[1] - 0.2) {
    const rp = P(t, TL.exit2 + 0.2, TL.exit2 + 0.65, E.io5);
    const a0 = [L(RAIL.x, 240, rp), L(RAIL.ys[0], 270, rp)], a1 = [L(RAIL.x, 1680, rp), L(RAIL.ys[2], 270, rp)];
    const la = P(t, TL.morph[1] - 0.2, TL.morph[1]) * (1 - P(t, TL.exit2 + 0.95, TL.exit2 + 1.4));
    ctx.save(); ctx.globalAlpha = la; line(a0[0], a0[1], a1[0], a1[1], ink(0.22), 1.5); ctx.restore();
    // progress along the rail
    if (rp < 0.02 && pk) line(RAIL.x, RAIL.ys[0], RAIL.x, pk.y, acc(0.8), 2);
  }

  // phrases
  PHRASES.forEach((ph, i) => {
    const t0 = TL.phrases[i] - 0.06;
    let p = P(t, t0, t0 + 0.55, E.o5) + P(t, TL.exit2 + i * 0.05, TL.exit2 + i * 0.05 + 0.34, E.i3);
    const dim = i < 2 ? 1 - 0.62 * P(t, TL.phrases[i + 1] - 0.05, TL.phrases[i + 1] + 0.3) : 1;
    mtext(ph, 320, PY[i], p, { size: 92, w: 600, ls: -2, a: dim });
  });

  // packet on top after the response lands
  if (pk && t >= H2.ok + 0.02 && t < TL.exit2) packet(pk.x, pk.y, t > TL.phrases[2] - 0.05 ? LIME : mixColor(LIME, ACC, P(t, TL.morph[0], TL.morph[1])), 1);
  // packet rides the rail as it becomes the top rule, then runs across it
  if (t >= TL.exit2) {
    const X = TL.exit2, rp = P(t, X + 0.2, X + 0.65, E.io5);
    const x = t < X + 0.65 ? L(RAIL.x, 240, rp) : L(240, 1680, P(t, X + 0.65, X + 1.35, E.io3));
    const y = L(RAIL.ys[2], 270, rp);
    packet(x, y, mixColor(LIME, ACC, P(t, X, X + 0.4)), 1 - P(t, X + 1.2, X + 1.45));
  }
}

// =====================================================================
// 03 — EXPERIENCE  (9.4 – 14.1)
// =====================================================================
const PANELS = [
  { x: 240, y: 270, w: 700, h: 560, date: 'JUL 2026 — PRESENT', co: 'Botivate', role: 'Backend Developer Intern', tag: ['Workforce-management APIs', 'Database models', 'RBAC'] },
  { x: 980, y: 270, w: 700, h: 560, date: 'APR — AUG 2025', co: 'Trench', role: 'Software Engineer Intern', tag: ['Hyperliquid integrations', 'Spot & perpetual trading terminal'] },
];
const CANDLES = (() => { const r = rng(11); let p = 100; const o = []; for (let i = 0; i < 26; i++) { const op = p, c = op + (r() - 0.42) * 7, hi = Math.max(op, c) + r() * 3.2, lo = Math.min(op, c) - r() * 3.2; o.push({ o: op, c, hi, lo }); p = c; } return o; })();
const BOOK = (() => { const r = rng(5); return Array.from({ length: 10 }, () => 0.3 + r() * 0.65); })();

function hrVisual(t, ax, ay, aw, t0) {
  // sidebar
  const sa = P(t, t0, t0 + 0.4);
  ctx.save(); ctx.globalAlpha *= sa;
  rr(ax, ay, 118, 292, 10); ctx.fillStyle = ink(0.025); ctx.fill();
  [70, 56, 64, 48, 60].forEach((w, i) => {
    const hl = i === 1;
    rr(ax + 16, ay + 24 + i * 30, 9, 9, 2); ctx.fillStyle = hl ? ACC : ink(0.18); ctx.fill();
    rr(ax + 34, ay + 25 + i * 30, w * 0.9, 7, 3.5); ctx.fillStyle = ink(hl ? 0.5 : 0.14); ctx.fill();
  });
  ctx.restore();
  const mx = ax + 146;
  const ha = P(t, t0 + 0.1, t0 + 0.4);
  ctx.save(); ctx.globalAlpha *= ha;
  ['MEMBER', 'ROLE', 'ACCESS'].forEach((s, i) => text(s, mx + [0, 232, 372][i], ay + 22, { f: MONO, size: 12, c: ink(0.36), ls: 1 }));
  line(mx, ay + 36, ax + aw, ay + 36, ink(0.08), 1);
  ctx.restore();
  const roles = ['admin', 'manager', 'staff', 'staff', 'manager'];
  const nameW = [128, 104, 142, 96, 118];
  const grant = [[1, 1, 1], [1, 1, 0], [1, 0, 0], [1, 0, 0], [1, 1, 0]];
  const hl = env(t, TL.rbac - 0.45, TL.rbac - 0.25, 13.0, 13.4);
  for (let i = 0; i < 5; i++) {
    const rt = t0 + 0.18 + i * 0.07;
    const ra = P(t, rt, rt + 0.4), dy = (1 - P(t, rt, rt + 0.5, E.o5)) * 10;
    if (ra <= 0) continue;
    const cy = ay + 44 + i * 49 + 24 + dy;
    ctx.save(); ctx.globalAlpha *= ra;
    if (i === 1 && hl > 0) {
      rr(mx - 10, cy - 22, aw - 136, 44, 8); ctx.fillStyle = acc(0.09 * hl); ctx.fill();
      rr(mx - 10, cy - 22, 3, 44, 1.5); ctx.fillStyle = acc(hl); ctx.fill();
    }
    ring(mx + 14, cy, 13, ink(0.3), 1.2);
    dot(mx + 14, cy - 3, 4.5, ink(0.3));
    ctx.save(); ctx.beginPath(); ctx.arc(mx + 14, cy, 12.4, 0, Math.PI * 2); ctx.clip(); ctx.beginPath(); ctx.arc(mx + 14, cy + 13, 9, Math.PI, 0); ctx.fillStyle = ink(0.3); ctx.fill(); ctx.restore();
    rr(mx + 40, cy - 8, nameW[i], 7, 3.5); ctx.fillStyle = ink(0.42); ctx.fill();
    rr(mx + 40, cy + 5, nameW[i] * 0.55, 5, 2.5); ctx.fillStyle = ink(0.14); ctx.fill();
    setFont(400, 12, MONO); const pw = ctx.measureText(roles[i]).width + 22;
    rr(mx + 232, cy - 11, pw, 22, 11);
    ctx.strokeStyle = i === 0 ? acc(0.8) : ink(0.2); ctx.lineWidth = 1.2; ctx.stroke();
    text(roles[i], mx + 243, cy + 4, { f: MONO, size: 12, c: i === 0 ? ACC_T : ink(0.6) });
    for (let k = 0; k < 3; k++) {
      const bx = mx + 372 + k * 22, by = cy - 6;
      let g = grant[i][k] ? P(t, rt + 0.25 + k * 0.06, rt + 0.4 + k * 0.06) : 0;
      if (i === 1 && k === 2) g = P(t, TL.rbac, TL.rbac + 0.18, E.back);
      rr(bx, by, 12, 12, 3); ctx.strokeStyle = ink(0.22); ctx.lineWidth = 1.2; ctx.stroke();
      if (g > 0) {
        const s = 12 * cl(g, 0, 1.2);
        ctx.save(); if (i === 1 && k === 2) glow(acc(0.8), 12 * env(t, TL.rbac, TL.rbac + 0.1, TL.rbac + 0.3, TL.rbac + 0.8));
        rr(bx + 6 - s / 2, by + 6 - s / 2, s, s, 3); ctx.fillStyle = ACC; ctx.fill(); ctx.restore();
      }
    }
    ctx.restore();
  }
}

function tradeVisual(t, ax, ay, aw, t0) {
  const perp = P(t, TL.perp, TL.perp + 0.32, E.io5);
  // spot / perp toggle
  const ta = P(t, t0, t0 + 0.4);
  ctx.save(); ctx.globalAlpha *= ta;
  rr(ax, ay, 150, 30, 15); ctx.strokeStyle = ink(0.18); ctx.lineWidth = 1.2; ctx.stroke();
  rr(ax + 3 + perp * 72, ay + 3, 72, 24, 12); ctx.fillStyle = acc(0.2); ctx.fill();
  text('SPOT', ax + 39, ay + 20, { f: MONO, size: 12, c: perp < 0.5 ? ACC_T : ink(0.45), align: 'center', ls: 1 });
  text('PERP', ax + 111, ay + 20, { f: MONO, size: 12, c: perp >= 0.5 ? ACC_T : ink(0.45), align: 'center', ls: 1 });
  // api status
  const la = 0.55 + 0.45 * Math.cos((t - t0) * 4.2);
  text('hyperliquid api', ax + aw, ay + 20, { f: MONO, size: 12, c: ink(0.45), align: 'right', ls: 0.5 });
  const lw = measure('hyperliquid api', 400, 12, MONO, 0.5);
  ctx.save(); glow(lime(0.8), 8 * la); dot(ax + aw - lw - 14, ay + 16, 3.5, lime(0.5 + 0.5 * la)); ctx.restore();
  ctx.restore();

  // chart
  const cx0 = ax, cy0 = ay + 52, cw = 404, ch = 226;
  ctx.save(); ctx.globalAlpha *= P(t, t0 + 0.1, t0 + 0.4);
  for (let g = 0; g <= 4; g++) line(cx0, cy0 + g * ch / 4, cx0 + cw, cy0 + g * ch / 4, ink(0.05), 1);
  ctx.restore();
  let lo = Infinity, hi = -Infinity; CANDLES.forEach(c => { lo = Math.min(lo, c.lo); hi = Math.max(hi, c.hi); });
  const Y = v => cy0 + ch - 12 - (v - lo) / (hi - lo) * (ch - 24);
  CANDLES.forEach((c, i) => {
    const ct = t0 + 0.2 + i * 0.042;
    const g = P(t, ct, ct + 0.3, E.o4);
    if (g <= 0) return;
    let close = c.c;
    if (i === CANDLES.length - 1) close += Math.sin(t * 5.3) * 0.9 + Math.sin(t * 2.1) * 0.6;
    const up = close >= c.o, x = cx0 + 6 + i * 13.6;
    const mid = (Y(c.o) + Y(close)) / 2;
    const yT = L(mid, Math.min(Y(c.o), Y(close)), g), yB = L(mid, Math.max(Y(c.o), Y(close)), g);
    const wT = L(mid, Y(c.hi), g), wB = L(mid, Y(c.lo), g);
    line(x + 4.5, wT, x + 4.5, wB, up ? acc(0.9) : ink(0.35), 1.2);
    rr(x, yT, 9, Math.max(1.5, yB - yT), 1.5);
    if (up) { ctx.fillStyle = ACC; ctx.fill(); } else { ctx.fillStyle = BG; ctx.fill(); ctx.strokeStyle = ink(0.4); ctx.lineWidth = 1.2; ctx.stroke(); }
  });
  const lastT = t0 + 0.2 + 25 * 0.042 + 0.2;
  const pa = P(t, lastT, lastT + 0.3);
  if (pa > 0) {
    const last = CANDLES[25]; const py = Y(last.c + Math.sin(t * 5.3) * 0.9 + Math.sin(t * 2.1) * 0.6);
    ctx.save(); ctx.globalAlpha *= pa; ctx.setLineDash([3, 5]); line(cx0, py, cx0 + cw, py, acc(0.45), 1); ctx.restore();
    ctx.save(); ctx.globalAlpha *= pa; rr(cx0 + cw - 40, py - 8, 40, 16, 3); ctx.fillStyle = ACC; ctx.fill(); ctx.restore();
  }

  // order book
  const ox = ax + 432, ow = aw - 432;
  for (let i = 0; i < 10; i++) {
    const rt = t0 + 0.3 + i * 0.035;
    const ra = P(t, rt, rt + 0.3);
    if (ra <= 0) continue;
    const ask = i < 5;
    const wv = cl(BOOK[i] + 0.12 * Math.sin(t * 1.9 + i * 1.7) + 0.06 * Math.sin(t * 4.1 + i));
    const y = cy0 + i * 19 + (ask ? 0 : 8);
    const bw = ow * wv * P(t, rt, rt + 0.45, E.o5);
    rr(ox + ow - bw, y, bw, 14, 2); ctx.fillStyle = ask ? ink(0.1 * ra) : acc(0.28 * ra); ctx.fill();
    rr(ox, y + 5, 22 + (i * 7) % 16, 4, 2); ctx.fillStyle = ask ? ink(0.25 * ra) : acc(0.7 * ra); ctx.fill();
  }
  if (P(t, t0 + 0.5, t0 + 0.8) > 0) line(ox, cy0 + 97, ox + ow, cy0 + 97, ink(0.1 * P(t, t0 + 0.5, t0 + 0.8)), 1);
  // buy/sell → long/short
  const ba = P(t, t0 + 0.55, t0 + 0.9);
  if (ba > 0) {
    ctx.save(); ctx.globalAlpha *= ba;
    const by = cy0 + 206, bw2 = (ow - 10) / 2;
    rr(ox, by - 8, bw2, 30, 6); ctx.fillStyle = ACC; ctx.fill();
    rr(ox + bw2 + 10, by - 8, bw2, 30, 6); ctx.strokeStyle = ink(0.28); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(ox, by - 8, ow, 30); ctx.clip();
    const roll = perp * 30;
    text('BUY', ox + bw2 / 2, by + 12 - roll, { f: MONO, size: 12, w: 500, c: '#0B0B0A', align: 'center', ls: 1 });
    text('LONG', ox + bw2 / 2, by + 42 - roll, { f: MONO, size: 12, w: 500, c: '#0B0B0A', align: 'center', ls: 1 });
    text('SELL', ox + bw2 * 1.5 + 10, by + 12 - roll, { f: MONO, size: 12, c: ink(0.75), align: 'center', ls: 1 });
    text('SHORT', ox + bw2 * 1.5 + 10, by + 42 - roll, { f: MONO, size: 12, c: ink(0.75), align: 'center', ls: 1 });
    ctx.restore(); ctx.restore();
  }
}

function scene3(t) {
  if (t < 9.3 || t > 14.2) return;
  const fl = P(t, TL.flatten[0], TL.flatten[1], E.io5);
  const contentA = 1 - P(t, 13.4, 13.7);
  PANELS.forEach((pn, i) => {
    const t0 = i === 0 ? TL.panelA : TL.panelB;
    // flatten into the project line (y=680); inner edges meet at 960
    const y = L(pn.y, 680, fl), h = L(pn.h, 0, fl);
    const x = i === 0 ? pn.x : L(pn.x, 960, fl), w = i === 0 ? L(pn.w, 720, fl) : L(pn.w, 720, fl);
    const r = L(16, 0, fl);
    const drawP = P(t, t0 - 0.05, t0 + 0.75, E.io3);
    const fillA = P(t, t0 + 0.1, t0 + 0.6) * (1 - fl);
    if (fillA > 0) {
      ctx.save(); ctx.globalAlpha = fillA; glow('rgba(0,0,0,0.6)', 70); ctx.shadowOffsetY = 26;
      rr(x, y, w, h, r); ctx.fillStyle = PANEL; ctx.fill(); ctx.restore();
      line(x + 16, y + 0.75, x + w - 16, y + 0.75, ink(0.07 * fillA), 1);
    }
    if (fl > 0) line(x, y, x + w, y, ink(0.22), 1.5);
    if (fl < 1) strokeRR(x, y, w, h, r, drawP, ink(0.16 * (1 - fl)), 1.5);
    if (contentA <= 0) return;
    ctx.save(); ctx.globalAlpha = contentA;
    const ax = pn.x + 28, ay = pn.y + 30, aw = pn.w - 56;
    if (i === 0) hrVisual(t, ax, ay, aw, t0 + 0.3); else tradeVisual(t, ax, ay, aw, t0 + 0.3);
    line(pn.x + 28, pn.y + 346, pn.x + pn.w - 28, pn.y + 346, ink(0.08 * P(t, t0 + 0.4, t0 + 0.8)), 1);
    const tx = pn.x + 36;
    mtext(pn.date, tx, pn.y + 390, P(t, t0 + 0.4, t0 + 0.8, E.o5), { f: MONO, w: 400, size: 14, c: ink(0.42), ls: 1.5 });
    mtext(pn.co, tx - 2, pn.y + 452, P(t, t0 + 0.45, t0 + 1.0, E.o5), { size: 56, w: 600, ls: -1.2 });
    mtext(pn.role, tx, pn.y + 494, P(t, t0 + 0.55, t0 + 1.05, E.o5), { size: 26, w: 400, c: ink(0.7) });
    // tagline, auto-fit to panel width
    const segs = []; pn.tag.forEach((s, k) => { if (k) segs.push(['  ·  ', ACC_T]); segs.push([s, ink(0.72)]); });
    let fs = 18; const full = pn.tag.join('  ·  ');
    while (measure(full, 400, fs, MONO) > pn.w - 72 && fs > 13) fs -= 0.5;
    mtext(segs, tx, pn.y + 532, P(t, t0 + 0.65, t0 + 1.15, E.o5), { f: MONO, w: 400, size: fs });
    ctx.restore();
  });
}

// =====================================================================
// 04 — PROOF OF WORK  (14.0 – 21.4)   world space, own camera
// =====================================================================
const LY = 680;
const SP = 1700; // world distance between project stations
function cam4(t) {
  const camX = SP * P(t, TL.pan1[0], TL.pan1[1], E.io5) + SP * P(t, TL.pan2[0], TL.pan2[1], E.io5);
  const pb = P(t, TL.pull[0], TL.pull[1], E.io5);
  return { camX, s: L(1, 0.322, pb), cx: L(camX + 960, (240 + 2 * SP + 1680) / 2, pb), cy: L(540, 600, pb) };
}
const toScreen = (c, x, y) => [(x - c.cx) * c.s + 960, (y - c.cy) * c.s + 540];
function lineHead(t) {
  return 1680 + SP * P(t, TL.pan1[0] - 0.1, TL.pan1[1] + 0.1, E.io3) + SP * P(t, TL.pan2[0] - 0.15, TL.pan2[1] + 0.05, E.io3);
}
function packet4(t) {
  const S = TL.s0, S1 = TL.s1, S2 = TL.s2;
  return kf(t, [[14.1, 240], [S.nodes[0], 390], [S.nodes[1], 760], [S.nodes[2], 1130], [S.coin, 1500],
    [TL.pan1[0] + 0.1, 1500], [TL.pan1[1] + 0.1, SP + 200], [S1.a, SP + 780], [TL.pan2[0] - 0.1, SP + 780],
    [S2.states[0], 2 * SP + 420], [S2.states[1], 2 * SP + 900], [S2.states[2], 2 * SP + 1420], [20.5, 2 * SP + 1680]], E.io3);
}
function wfNode(label, cx, t0, act, labelC) {
  setFont(400, 20, MONO); const w = ctx.measureText(label).width + 48, h = 56;
  const x = cx - w / 2, y = LY - h / 2;
  const a = P(t0.now, t0.t, t0.t + 0.35);
  if (a <= 0) return;
  const sc = L(0.9, 1, P(t0.now, t0.t, t0.t + 0.45, E.back));
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, LY); ctx.scale(sc, sc); ctx.translate(-cx, -LY);
  rr(x, y, w, h, 12); ctx.fillStyle = PANEL2; ctx.fill();
  if (act > 0) { ctx.save(); glow(acc(0.7), 20 * act); rr(x, y, w, h, 12); ctx.strokeStyle = acc(0.35 + 0.65 * act); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
  else { rr(x, y, w, h, 12); ctx.strokeStyle = ink(0.22); ctx.lineWidth = 1.5; ctx.stroke(); }
  text(label, cx, LY + 7, { f: MONO, size: 20, c: labelC || ink(0.65 + 0.35 * act), align: 'center' });
  ctx.restore();
}
function avatar(cx, cy, r, a, hl) {
  if (a <= 0) return;
  const sc = L(0.6, 1, E.back(cl(a)));
  ctx.save(); ctx.globalAlpha *= cl(a * 1.5); ctx.translate(cx, cy); ctx.scale(sc, sc);
  dot(0, 0, r, PANEL2);
  if (hl) { ctx.save(); glow(acc(0.7), 18); ring(0, 0, r, ACC, 2); ctx.restore(); } else ring(0, 0, r, ink(0.35), 1.5);
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 0, Math.PI * 2); ctx.clip();
  dot(0, -r * 0.2, r * 0.3, ink(hl ? 0.7 : 0.4));
  ctx.beginPath(); ctx.arc(0, r * 0.62, r * 0.55, Math.PI, 0); ctx.fillStyle = ink(hl ? 0.7 : 0.4); ctx.fill();
  ctx.restore(); ctx.restore();
}
function curve(x1, y1, x2, y2, p, style, lw = 1.5, dash) {
  if (p <= 0) return;
  // quick bezier, drawn to fraction p
  const c1x = L(x1, x2, 0.5), c1y = y1, c2x = L(x1, x2, 0.5), c2y = y2;
  ctx.save(); ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1);
  const N = 40, n = Math.ceil(N * p);
  for (let i = 1; i <= n; i++) {
    const u = Math.min(i / N, p), v = 1 - u;
    ctx.lineTo(v * v * v * x1 + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * x2, v * v * v * y1 + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * y2);
  }
  if (dash) ctx.setLineDash(dash);
  ctx.stroke(); ctx.restore();
}
function miniCard(x, y, w, h, a, lines = 2) {
  if (a <= 0) return;
  const sc = L(0.85, 1, E.back(cl(a)));
  ctx.save(); ctx.globalAlpha *= cl(a * 1.4); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-x - w / 2, -y - h / 2);
  rr(x, y, w, h, 10); ctx.fillStyle = PANEL2; ctx.fill(); ctx.strokeStyle = ink(0.2); ctx.lineWidth = 1.2; ctx.stroke();
  rr(x + 14, y + 16, w * 0.55, 8, 4); ctx.fillStyle = ink(0.55); ctx.fill();
  for (let i = 0; i < lines; i++) { rr(x + 14, y + 32 + i * 11, w * (0.75 - i * 0.18), 5, 2.5); ctx.fillStyle = ink(0.16); ctx.fill(); }
  ctx.restore();
}
function pill(label, cx, cy, a, style = {}) {
  if (a <= 0) return;
  setFont(400, 14, MONO); const w = ctx.measureText(label).width + 28;
  ctx.save(); ctx.globalAlpha *= a;
  rr(cx - w / 2, cy - 15, w, 30, 15); ctx.fillStyle = PANEL2; ctx.fill(); ctx.strokeStyle = style.stroke || ink(0.25); ctx.lineWidth = 1.2; ctx.stroke();
  text(label, cx, cy + 5, { f: MONO, size: 14, c: style.c || ink(0.7), align: 'center' });
  ctx.restore();
}

const PROJECTS = [
  { name: 'ChainGenie', tag: 'Solana tokens & NFTs through Telegram', reveal: 14.25 },
  { name: 'Jagruk', tag: 'Publishing, community & OAuth', reveal: 16.45 },
  { name: 'Credit Default Swap', tag: 'Rust + Anchor on-chain program', reveal: 18.9 },
];

function world4(t, worldA) {
  const S = TL.s0, S1 = TL.s1, S2 = TL.s2;
  const px = packet4(t);
  // titles
  PROJECTS.forEach((pr, i) => {
    const O = SP * i;
    ctx.save(); ctx.globalAlpha = worldA;
    mtext([[`0${i + 1}`, ACC_T], ['  /  03', ink(0.38)]], 240 + O, 290, P(t, pr.reveal - 0.05, pr.reveal + 0.4, E.o5), { f: MONO, w: 400, size: 15, ls: 1.5 });
    mtext(pr.name, 234 + O, 400, P(t, pr.reveal, pr.reveal + 0.6, E.o5), { size: 112, w: 700, ls: -3 });
    mtext(pr.tag, 240 + O, 462, P(t, pr.reveal + 0.15, pr.reveal + 0.7, E.o5), { f: MONO, w: 400, size: 22, c: ink(0.68) });
    ctx.restore();
  });

  // ---- the continuous line ----
  const head = lineHead(t);
  if (t < TL.lineMorph[0]) {
    line(240, LY, head, LY, ink(0.22), 1.5);
    // data flowing along it
    ctx.save(); ctx.setLineDash([2, 22]); ctx.lineDashOffset = -t * 110; line(240, LY, head, LY, acc(0.45), 1.5); ctx.restore();
    // comet trail behind packet
    const tl = 420, g = ctx.createLinearGradient(px - tl, 0, px, 0);
    const pc = t > S2.states[2] ? LIME : ACC;
    g.addColorStop(0, pc === LIME ? lime(0) : acc(0)); g.addColorStop(1, pc === LIME ? lime(0.9) : acc(0.95));
    ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.max(240, px - tl), LY); ctx.lineTo(px, LY); ctx.stroke(); ctx.restore();
    // CDS progress fill
    if (px > 2 * SP + 420) line(2 * SP + 420, LY, Math.min(px, 2 * SP + 1420), LY, acc(0.85), 2);
  }
  ctx.save(); ctx.globalAlpha = worldA;
  // packet under nodes
  if (t > 14.08 && t < TL.lineMorph[0]) packet(px, LY, t > S2.states[2] ? LIME : ACC, P(t, 14.08, 14.25));

  // ---- ChainGenie: chat command → minting workflow ----
  {
    const bA = P(t, S.bubble, S.bubble + 0.3), m = P(t, S.morph, S.morph + 0.4, E.io5);
    if (bA > 0) {
      setFont(400, 22, MONO); const w1 = ctx.measureText('/mint token').width, w2 = ctx.measureText('/mint').width;
      const bw = L(w1 + 52, w2 + 48, m), bh = L(74, 56, m);
      const bx = L(240, 390 - (w2 + 48) / 2, m), by = LY - bh / 2 - L(8, 0, m);
      const sc = L(0.92, 1, P(t, S.bubble, S.bubble + 0.4, E.back));
      const act = env(t, S.nodes[0] - 0.08, S.nodes[0], S.nodes[0] + 0.1, S.nodes[0] + 0.5);
      ctx.save(); ctx.globalAlpha *= bA; ctx.translate(bx, by + bh); ctx.scale(sc, sc); ctx.translate(-bx, -by - bh);
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, [L(22, 12, m), L(22, 12, m), L(22, 12, m), L(5, 12, m)]);
      ctx.fillStyle = PANEL2; ctx.fill();
      ctx.save(); if (act > 0) glow(acc(0.7), 20 * act); ctx.strokeStyle = act > 0 ? acc(0.4 + 0.6 * act) : ink(L(0.24, 0.22, m)); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      const typedN = Math.floor(cl((t - S.type) / 0.035, 0, 11));
      const s = '/mint token'.slice(0, typedN);
      text(s.slice(0, 5), bx + L(26, 24, m), by + bh / 2 + 7, { f: MONO, size: 22, c: ACC_T });
      if (s.length > 5) text(s.slice(5), bx + 26 + w2, by + bh / 2 + 7, { f: MONO, size: 22, c: INK, a: 1 - m });
      // tiny chat caret while typing
      if (t < S.morph && t > S.type - 0.1) { setFont(400, 22, MONO); rr(bx + 28 + ctx.measureText(s).width, by + bh / 2 - 12, 2, 24, 1); ctx.fillStyle = ink(((t * 2) % 1) < 0.6 ? 0.8 : 0); ctx.fill(); }
      ctx.restore();
      text('telegram', 242, by - 16, { f: MONO, size: 13, c: ink(0.4), a: bA * (1 - m), ls: 1 });
    }
    const nd = (i, x, lab) => wfNode(lab, x, { now: t, t: S.morph + 0.08 + i * 0.1 }, env(t, S.nodes[i] - 0.08, S.nodes[i], S.nodes[i] + 0.1, S.nodes[i] + 0.6) + 0.35 * P(t, S.nodes[i], S.nodes[i] + 0.3));
    nd(1, 760, 'validate'); nd(2, 1130, 'Solana');
    // token coin
    const ca = P(t, S.coin - 0.1, S.coin + 0.25);
    if (ca > 0) {
      const spin = (1 - P(t, S.coin - 0.1, S.coin + 0.8, E.o4)) * Math.PI * 3;
      ctx.save(); ctx.globalAlpha *= ca; ctx.translate(1500, LY);
      dot(0, 0, 46, PANEL2);
      ctx.scale(Math.max(0.06, Math.abs(Math.cos(spin))), 1);
      ctx.save(); glow(acc(0.8), 24); ring(0, 0, 46, ACC, 2); ctx.restore();
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(Math.cos(an) * 24, Math.sin(an) * 24); } ctx.closePath();
      ctx.strokeStyle = ink(0.75); ctx.lineWidth = 1.5; ctx.stroke();
      dot(0, 0, 4, ACC_T);
      ctx.restore();
      mtext([['token', ink(0.7)], ['  ·  ', ACC_T], ['NFT', ink(0.7)]], 1500, LY + 92, P(t, S.coin + 0.1, S.coin + 0.5, E.o5), { f: MONO, w: 400, size: 16, align: 'center' });
    }
  }

  // ---- Jagruk: content card → profiles, posts, OAuth ----
  {
    const O = SP;
    const cA = P(t, S1.card, S1.card + 0.35);
    if (cA > 0) {
      const x = 240 + O, y = 600, w = 300, h = 160;
      const act = env(t, TL.pan1[1], TL.pan1[1] + 0.1, TL.pan1[1] + 0.15, TL.pan1[1] + 0.55);
      const sc = L(0.9, 1, P(t, S1.card, S1.card + 0.5, E.back));
      ctx.save(); ctx.globalAlpha *= cA; ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-x - w / 2, -y - h / 2);
      glow('rgba(0,0,0,0.5)', 30); rr(x, y, w, h, 14); ctx.fillStyle = PANEL2; ctx.fill(); ctx.shadowBlur = 0;
      ctx.save(); if (act > 0) glow(acc(0.7), 20 * act); rr(x, y, w, h, 14); ctx.strokeStyle = act > 0 ? acc(0.35 + 0.65 * act) : ink(0.22); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      ring(x + 32, y + 32, 13, ink(0.35), 1.3); dot(x + 32, y + 29, 4.5, ink(0.35));
      rr(x + 54, y + 26, 90, 7, 3.5); ctx.fillStyle = ink(0.35); ctx.fill();
      rr(x + 54, y + 38, 54, 5, 2.5); ctx.fillStyle = ink(0.14); ctx.fill();
      text('post', x + w - 22, y + 37, { f: MONO, size: 12, c: ink(0.4), align: 'right' });
      rr(x + 22, y + 66, 228, 12, 6); ctx.fillStyle = ink(0.72); ctx.fill();
      [250, 196, 226].forEach((bw, k) => { rr(x + 22, y + 94 + k * 14, bw, 6, 3); ctx.fillStyle = ink(0.16); ctx.fill(); });
      ctx.restore();
    }
    // edges
    const A = [780 + O, LY], B = [1080 + O, 592], C = [1080 + O, 772], P1 = [1330 + O, 560], P2 = [1330 + O, 740];
    const eBC = P(t, S1.pills, S1.bc, E.io3);
    curve(A[0] + 30, A[1], B[0] - 26, B[1], eBC, ink(0.3));
    curve(A[0] + 30, A[1], C[0] - 26, C[1], eBC, ink(0.3));
    const eP = P(t, S1.bc + 0.05, S1.posts, E.io3);
    curve(B[0] + 26, B[1], P1[0], P1[1] + 32, eP, ink(0.3));
    curve(C[0] + 26, C[1], P2[0], P2[1] + 32, eP, ink(0.3));
    // oauth
    const eO = P(t, S1.a + 0.05, S1.pills + 0.1, E.io3);
    curve(A[0], A[1] + 30, 690 + O, 792 - 15, eO, ink(0.3));
    curve(A[0], A[1] + 30, 870 + O, 792 - 15, eO, ink(0.3));
    pill('oauth · google', 690 + O, 792, P(t, S1.pills, S1.pills + 0.25));
    pill('oauth · github', 870 + O, 792, P(t, S1.pills + 0.06, S1.pills + 0.31));
    avatar(A[0], A[1], 30, P(t, S1.a - 0.1, S1.a + 0.3), t > S1.a);
    avatar(B[0], B[1], 26, P(t, S1.bc - 0.1, S1.bc + 0.3), false);
    avatar(C[0], C[1], 26, P(t, S1.bc - 0.04, S1.bc + 0.36), false);
    miniCard(P1[0], P1[1], 176, 64, P(t, S1.posts - 0.05, S1.posts + 0.3));
    miniCard(P2[0], P2[1], 176, 64, P(t, S1.posts, S1.posts + 0.35));
  }

  // ---- Credit Default Swap: proposal → approval → premium payment ----
  {
    const O = 2 * SP;
    const states = ['Proposal', 'Approval', 'Premium payment'], xs = [420, 900, 1420];
    states.forEach((s, i) => {
      const cx = xs[i] + O;
      const a = P(t, 18.85 + i * 0.1, 19.2 + i * 0.1);
      if (a <= 0) return;
      setFont(500, 28, SANS); const tw = ctx.measureText(s).width; const w = 60 + tw + 30, h = 68, x = cx - w / 2, y = LY - h / 2;
      const on = P(t, S2.states[i] - 0.04, S2.states[i] + 0.2);
      const last = i === 2, col = last ? LIME : ACC, colA = last ? lime : acc;
      ctx.save(); ctx.globalAlpha *= a;
      text(`0${i + 1}`, cx, y - 22, { f: MONO, size: 14, c: on > 0.5 ? (last ? LIME : ACC_T) : ink(0.38), align: 'center', ls: 1.5 });
      rr(x, y, w, h, h / 2); ctx.fillStyle = PANEL2; ctx.fill();
      if (on > 0) { rr(x, y, w, h, h / 2); ctx.fillStyle = colA(0.1 * on); ctx.fill(); }
      ctx.save(); if (on > 0) glow(colA(0.6), 22 * env(t, S2.states[i] - 0.04, S2.states[i] + 0.1, S2.states[i] + 0.2, S2.states[i] + 0.9) + 4 * on);
      strokeRR(x, y, w, h, h / 2, P(t, 18.85 + i * 0.1, 19.35 + i * 0.1, E.io3), on > 0 ? colA(0.3 + 0.7 * on) : ink(0.24), 1.5); ctx.restore();
      const sx = x + 36;
      if (on > 0) { dot(sx, LY, 12 * L(0.6, 1, E.back(on)), col); check(sx, LY, 12, '#0B0B0A', 2.2, P(t, S2.states[i] + 0.05, S2.states[i] + 0.25)); }
      else ring(sx, LY, 11, ink(0.3), 1.5);
      text(s, x + 60, LY + 10, { size: 28, w: 500, c: ink(0.55 + 0.45 * on) });
      ctx.restore();
    });
  }
  ctx.restore();
}

function scene4(t) {
  if (t < 14.0 || t > 21.9) return;
  const c = cam4(t);
  const worldA = 1 - P(t, 21.05, 21.4, E.o3);
  ctx.save();
  ctx.translate(960, 540); ctx.scale(c.s, c.s); ctx.translate(-c.cx, -c.cy);
  world4(t, worldA);
  ctx.restore();
}

// =====================================================================
// 05 — SIGNATURE  (21.1 – 25)
// =====================================================================
function scene5(t) {
  if (t < TL.lineMorph[0]) return;
  const c = cam4(TL.pull[1]);
  const [ax, ay] = toScreen(c, 240, LY), [bx] = toScreen(c, 2 * SP + 1680, LY);
  const m = P(t, TL.lineMorph[0], TL.lineMorph[1], E.io5);
  // the continuous line resolves into the signature rule
  line(L(ax, 240, m), L(ay, 712, m), L(bx, 1680, m), L(ay, 712, m), ink(L(0.22, 0.2, m)), 1.5);
  const acc = P(t, 21.55, 22.0, E.io3);
  if (acc > 0) line(240, 712, 240 + 120 * acc, 712, ACC, 2);
  corners(FRAME.x, FRAME.y, FRAME.w, FRAME.h, 26, P(t, 21.6, 22.2));

  mchars('AYUSH', NAME.x, NAME.y1, t, TL.bass2, null, { w: NAME.w, size: NAME.size, ls: NAME.ls, stagger: 0.035, dur: 0.7 });
  mchars('AGRAWAL', NAME.x, NAME.y2, t, TL.bass2 + 0.1, null, { w: NAME.w, size: NAME.size, ls: NAME.ls, stagger: 0.035, dur: 0.7 });

  mtext([['Backend', INK], ['.', ACC], [' Integrations', INK], ['.', ACC], [' Web3', INK], ['.', ACC]], 240, 790, P(t, 21.9, 22.4, E.o5), { size: 40, w: 500, ls: -0.5 });

  // URL typed by the cursor (which was the packet)
  setFont(400, 30, MONO);
  const urlW = ctx.measureText(TL.url).width;
  const ux = 1680 - 30 - urlW;
  const n = TL.urlTimes.filter(u => t >= u).length;
  const typedW = ctx.measureText(TL.url.slice(0, n)).width;
  if (n > 0) text(TL.url.slice(0, n), ux, 790, { f: MONO, size: 30, c: ACC_T });

  // cursor
  const pc = toScreen(c, 2 * SP + 1680, LY);
  const mv = P(t, 21.25, 21.95, E.io5);
  let x, y, morph, col;
  if (t < 21.95) {
    x = L(pc[0], ux + 9, mv); y = L(pc[1], 779, mv) - Math.sin(mv * Math.PI) * 60;
    morph = 1 - P(t, 21.7, 21.95, E.io3); col = mixColor(LIME, INK, P(t, 21.4, 21.9));
  } else { x = ux + typedW + 11; y = 779; morph = 0; col = INK; }
  let on = 1;
  const tEnd = TL.urlTimes[TL.urlTimes.length - 1] + 0.1;
  if (t > tEnd && t < TL.pulse) { const ph = ((t - tEnd) % 1.0); on = ph < 0.55 ? 1 : 0.0; on = cl(on + (ph < 0.08 ? 0 : 0)); }
  if (t >= TL.pulse) on = 0.35 + 0.65 * P(t, TL.pulse, TL.pulse + 0.25, E.o3);
  if (t < TL.lineMorph[0] + 0.02) return;
  cursorShape(x, y, morph, col, on, 16, 32);
  if (t >= TL.pulse) {
    const g = env(t, TL.pulse, TL.pulse + 0.2, TL.pulse + 0.3, TL.pulse + 0.8);
    ctx.save(); ctx.globalAlpha = g; glow(ink(0.8), 28); rr(x - 8, y - 16, 16, 32, 2); ctx.fillStyle = INK; ctx.fill(); ctx.restore();
    const rp = P(t, TL.pulse, TL.pulse + 0.7, E.o3);
    ctx.save(); ctx.globalAlpha = (1 - rp) * 0.5; rr(x - 8 - rp * 14, y - 16 - rp * 14, 16 + rp * 28, 32 + rp * 28, 4 + rp * 8); ctx.strokeStyle = ACC_T; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  }
}

// =====================================================================
function drawFrame(t) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.letterSpacing = '0px'; ctx.textBaseline = 'alphabetic';
  const camX = t >= 14 && t < 21.3 ? cam4(t).camX : (t >= 21.3 ? 2 * SP : 0);
  background(t, camX);

  // gentle camera breathing on the screen-space scenes
  const s = kf(t, [[0, 1], [2.2, 1], [3.8, 1.016], [4.3, 1], [10.4, 1], [13.4, 1.012], [13.9, 1]], E.io3);
  ctx.save(); ctx.translate(960, 540); ctx.scale(s, s); ctx.translate(-960, -540);
  scene1(t); scene2(t); scene3(t);
  ctx.restore();
  scene4(t); scene5(t);

  hudLabel(t); hudChapter(t);
  ctx.restore();
}

async function ready() {
  const faces = ['700 100px Sora', '600 100px Sora', '500 100px Sora', '400 100px Sora', "400 30px 'Geist Mono'", "500 30px 'Geist Mono'"];
  await Promise.all(faces.map(f => document.fonts.load(f)));
  await document.fonts.ready;
  return faces.map(f => document.fonts.check(f));
}
window.drawFrame = drawFrame;
window.ready = ready;

// preview: ?t=12.3 for a still, otherwise play in real time
ready().then(() => {
  const q = new URLSearchParams(location.search);
  if (q.has('render')) return;
  if (q.has('t')) { drawFrame(parseFloat(q.get('t'))); return; }
  const start = performance.now();
  const loop = () => { drawFrame(((performance.now() - start) / 1000) % TL.duration); requestAnimationFrame(loop); };
  loop();
});
