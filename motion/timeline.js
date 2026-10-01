// Shared cue sheet — used by both the visual renderer (intro.js) and the soundtrack (audio.js)
// so every sound lands on the exact frame of the motion it belongs to. Times in seconds.
(function (root) {
  const TL = {
    fps: 30,
    duration: 25,

    // 01 — identity
    cmd: 'initialize ayush',
    typeStart: 0.95,
    typeGaps: [0, .065, .055, .07, .06, .05, .075, .06, .055, .07, .11, .12, .06, .055, .07, .06],
    enter: 2.12,
    expand: [2.15, 2.75],
    bass1: 2.55,
    sweep: [3.0, 3.5],

    // 02 — systems
    hops: { req: 4.5, api: 4.9, auth: 5.3, pass: 5.65, db: 5.95, rows: 6.08, resp: 6.25, ok: 6.75 },
    morph: [6.8, 7.4],
    phrases: [7.4, 7.9, 8.4],
    exit2: 9.25,

    // 03 — experience
    panelA: 9.85, panelB: 10.1,
    rbac: 11.9, perp: 12.3,
    flatten: [13.55, 14.1],

    // 04 — proof of work
    pan1: [16.2, 16.85], pan2: [18.5, 19.15],
    s0: { bubble: 14.2, type: 14.35, morph: 14.8, nodes: [14.95, 15.15, 15.35], coin: 15.55 },
    s1: { card: 16.5, a: 17.2, pills: 17.35, bc: 17.6, posts: 17.9 },
    s2: { states: [19.15, 19.6, 20.05] },
    pull: [20.6, 21.15],

    // 05 — signature
    lineMorph: [21.2, 21.8],
    bass2: 21.5,
    url: 'ayush-agrawal.in',
    urlStart: 22.0,
    urlGap: 0.028,
    pulse: 24.2,

    // HUD prompt labels (retyped at each chapter)
    labels: [[2.15, '> initialize ayush'], [4.0, '> trace request'], [9.25, '> experience'], [14.0, '> projects'], [21.1, '']],
    chapters: [[2.6, '01', 'IDENTITY'], [4.0, '02', 'SYSTEMS'], [9.25, '03', 'EXPERIENCE'], [14.0, '04', 'PROOF OF WORK'], [21.1, null, null]],
  };

  let acc = TL.typeStart;
  TL.charTimes = TL.typeGaps.map(g => (acc += g));
  TL.urlTimes = [...TL.url].map((_, i) => TL.urlStart + i * TL.urlGap + (i % 3 === 1 ? 0.006 : 0));

  // label typing times (for keyclicks): delete old at 12ms/char, then type new at 30ms/char
  TL.labelTypeTimes = [];
  for (let i = 1; i < TL.labels.length; i++) {
    const [t0, s] = TL.labels[i];
    const del = TL.labels[i - 1][1].length * 0.012;
    [...s].forEach((_, k) => TL.labelTypeTimes.push(t0 + del + k * 0.03));
  }

  if (typeof module !== 'undefined') module.exports = TL; else root.TL = TL;
})(this);
