import * as THREE from 'three';
import { clamp } from './math';
import type { World } from './scenes';
import type { Chapter, Thread } from './world';

type Vec = [number, number, number];
type ShotOpts = {
  fov?: number;
  /** Camera roll, in degrees. */
  roll?: number;
  /** Chapter position this shot belongs to. Defaults to the chapter's index; transits use values in between. */
  f?: number;
  /** False for a shot that only connects two others: it does not count as time spent in its chapter. */
  dwell?: boolean;
  flash?: number;
  flashColor?: string;
  /** How far the camera drifts with the pointer. */
  par?: number;
  /** Where the spark is on the thread, in waypoints. Carries over from the previous shot when omitted. */
  L?: number;
  /** 1 while the camera rides the thread behind the spark. */
  fly?: number;
  back?: number;
  lift?: number;
  side?: number;
  ahead?: number;
};

type Key = {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  roll: number;
  f: number;
  flash: number;
  flashColor: THREE.Color;
  par: number;
  L: number;
  fly: number;
  back: number;
  lift: number;
  side: number;
  ahead: number;
};

export type ShotState = Omit<Key, 'flashColor'> & { flashColor: THREE.Color; s: number };

const RIDER = { back: 4.4, lift: 1.2, side: 0.8, ahead: 5 };
const SCALARS = ['fov', 'roll', 'back', 'lift', 'side', 'ahead'] as const;

/** The whole film as a list of camera keyframes, sampled by scroll position. */
export class Story {
  count: number;
  /** Shot index where each chapter starts to dwell. */
  starts: number[] = [];
  private posCurve: THREE.CatmullRomCurve3;
  private lookCurve: THREE.CatmullRomCurve3;

  /**
   * Shot positions of the character's two beats: he wakes on the approach to the core, and leaves
   * it on the shot after.
   */
  constructor(private keys: Key[], starts: number[], public marks: { hatch: number; crack: number; burst: number; wake: number; stand: number; leave: number }) {
    this.count = keys.length;
    this.starts = starts;
    this.posCurve = new THREE.CatmullRomCurve3(keys.map((k) => k.pos), false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal');
  }

  createState(): ShotState {
    return {
      pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 35, roll: 0, f: 0, flash: 0, flashColor: new THREE.Color(1, 1, 1),
      par: 0.5, L: 0, fly: 0, s: 0, ...RIDER,
    };
  }

  /** Smooth interpolation of one number through the keys either side. */
  private spline(name: (typeof SCALARS)[number], i: number, t: number) {
    const k = this.keys;
    const last = k.length - 1;
    const p0 = k[Math.max(0, i - 1)][name];
    const p1 = k[i][name];
    const p2 = k[Math.min(last, i + 1)][name];
    const p3 = k[Math.min(last, i + 2)][name];
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
  }

  sample(s: number, out: ShotState) {
    const n = this.count;
    s = clamp(s, 0, n - 1);
    const u = s / (n - 1);
    this.posCurve.getPoint(u, out.pos);
    this.lookCurve.getPoint(u, out.look);
    const i = Math.min(Math.floor(s), n - 2);
    const t = s - i;
    const a = this.keys[i];
    const b = this.keys[i + 1];
    for (const name of SCALARS) out[name] = this.spline(name, i, t);
    out.f = a.f + (b.f - a.f) * t;
    out.flash = a.flash + (b.flash - a.flash) * t;
    out.flashColor.copy(a.flash >= b.flash ? a.flashColor : b.flashColor);
    out.par = a.par + (b.par - a.par) * t;
    out.L = a.L + (b.L - a.L) * t;
    out.fly = a.fly + (b.fly - a.fly) * t;
    out.s = s;
    return out;
  }
}

/** Lays out every shot. Positions are given relative to a chapter, so a scene can be moved without re-blocking it. */
export function buildStory(world: World, thread: Thread) {
  const [origin, grove, frame, work, path, lanterns, finale] = world.chapters;
  const keys: Key[] = [];
  const starts: number[] = [];

  // where each chapter's stretch of thread begins, in waypoints
  const base: number[] = [];
  let total = 0;
  for (const c of world.chapters) {
    base.push(total);
    total += c.thread.length;
  }
  const coreL = base[3] + world.work.coreIndex;
  let lastL = coreL;

  const shot = (c: Chapter, pos: Vec | THREE.Vector3, look: Vec | THREE.Vector3, o: ShotOpts = {}) => {
    const index = keys.length;
    if (o.dwell !== false && starts[c.index] === undefined) starts[c.index] = index;
    lastL = o.L ?? lastL;
    keys.push({
      pos: Array.isArray(pos) ? c.w(...pos) : pos.clone(),
      look: Array.isArray(look) ? c.w(...look) : look.clone(),
      fov: o.fov ?? 35,
      roll: ((o.roll ?? 0) * Math.PI) / 180,
      f: o.f ?? c.index,
      flash: o.flash ?? 0,
      flashColor: new THREE.Color(o.flashColor ?? '#ffffff'),
      par: o.par ?? 0.5,
      L: lastL,
      fly: o.fly ?? 0,
      back: o.back ?? RIDER.back,
      lift: o.lift ?? RIDER.lift,
      side: o.side ?? RIDER.side,
      ahead: o.ahead ?? RIDER.ahead,
    });
    return index;
  };
  /** A point part-way between two chapters, lifted, for the camera to fly through. */
  const between = (a: Chapter, b: Chapter, t: number, lift: number) => a.origin.clone().lerp(b.origin, t).add(new THREE.Vector3(0, lift, 0));
  /** A shot riding the thread behind the spark at `L`. */
  const ride = (c: Chapter, L: number, o: ShotOpts = {}) => {
    const pos = new THREE.Vector3();
    const look = new THREE.Vector3();
    const r = { back: o.back ?? RIDER.back, lift: o.lift ?? RIDER.lift, side: o.side ?? RIDER.side, ahead: o.ahead ?? RIDER.ahead };
    thread.chase(L, r, pos, look);
    return shot(c, pos, look, { fov: 50, par: 0.3, ...o, ...r, L, fly: 1 });
  };

  // 1 · the target: in on the crosshair, then down the thread
  shot(origin, [0, 0.4, 36], [0, 0, 0], { fov: 28, par: 0.9 });
  shot(origin, [5.5, 1.4, 24], [0, 0.2, 0], { fov: 32, par: 0.8 });
  shot(origin, [-6, 2.4, 15], [0, 0, 0], { fov: 36, roll: -2 });
  shot(origin, [-2.2, 3.2, 10.5], [0, -1.2, 0], { fov: 40, roll: 1 });
  // Give the approach its own runway. The same rock and grove remain visible throughout.
  shot(origin, [1.7, 1.5, 5.2], [8, -8, -45], { fov: 41, dwell: false, f: 0.08, par: 0.2 });
  shot(origin, [4, 0, -8], grove.w(0, 2, 35), { fov: 42, dwell: false, f: 0.16, par: 0.15 });
  shot(origin, [7, -2, -23], grove.w(0, 2, 30), { fov: 43, dwell: false, f: 0.24, par: 0.15 });
  shot(origin, [10, -4, -38], grove.w(0, 2, 26), { fov: 44, dwell: false, f: 0.32, par: 0.15 });
  shot(origin, [14, -6, -53], grove.w(0, 2, 22), { fov: 44, dwell: false, f: 0.4, par: 0.15 });
  shot(origin, [18, -8, -68], grove.w(0, 3, 18), { fov: 44, dwell: false, f: 0.48, par: 0.15 });
  shot(origin, [22, -10, -83], grove.w(0, 3, 14), { fov: 43, dwell: false, f: 0.56, par: 0.15 });
  shot(origin, [26, -12.5, -98], grove.w(0, 3, 10), { fov: 42, dwell: false, f: 0.64, par: 0.15 });
  shot(grove, [3, 13, 59], [0, 3.5, 7], { fov: 41, dwell: false, f: 0.73, par: 0.15 });
  shot(grove, [5, 10, 47], [0, 4, 4], { fov: 40, dwell: false, f: 0.83, par: 0.15 });

  // 2 · the grove
  shot(grove, [6, 7, 36], [0, 4.5, 2], { fov: 40, f: 0.95 });
  shot(grove, [4, 5.8, 27], [0, 4.8, 2], { fov: 37 });
  shot(grove, [-5.2, 4.5, 17], [1, 5, 2], { fov: 38, roll: -1 });
  shot(grove, [-5.4, 3, 3], [0, 2.5, -14], { fov: 38, roll: 1 });
  shot(grove, [0, 3.4, -18], [-6, 6, -60], { fov: 44, dwell: false, f: 1.3 });
  shot(grove, between(grove, frame, 0.55, 10), frame.w(0, 3, 0), { fov: 46, dwell: false, f: 1.6, roll: -3 });

  // 3 · the frame: a wide of the desert, in low under the frame, then through it
  shot(frame, [-3, 1.7, 31], [1.5, 3.6, 0], { fov: 34, f: 1.9 });
  shot(frame, [5.5, 2.3, 17], [0, 3.9, 0], { fov: 34 });
  shot(frame, [-2.1, 1.25, 7.2], [0.2, 4.7, 0], { fov: 42, roll: 2 });
  shot(frame, [0.5, 3.9, 5.2], [-0.4, 4.4, -12], { fov: 40 });
  shot(frame, [-0.3, 4.3, -1.2], [10, 7, -30], { fov: 50, dwell: false, f: 2.25, par: 0.25, flash: 0.08, flashColor: '#ffb090' });
  // low over the dunes with the thread, the sun ahead
  shot(frame, [13, 5.6, -30], [24, 4.5, -90], { fov: 54, dwell: false, f: 2.5, roll: -3 });
  shot(frame, [22, 6.5, -80], work.w(0, 4, 0), { fov: 50, dwell: false, f: 2.75, roll: 2 });

  // 4 · the work: a wide, then round the ring one project at a time
  shot(work, [14, 10, 27], [0, 3.6, 0], { fov: 40, f: 3 });
  shot(work, [8.5, 5.6, 14], [0, 3.5, 0], { fov: 34, par: 0.8 });
  for (let k = 0; k < world.work.count; k++) {
    const p = world.work.panelShot(k);
    world.work.shotS[k] = shot(work, p.pos, p.look, { fov: k % 2 ? 31 : 33, par: 0.6, roll: k % 2 ? 0.6 : -0.6 });
  }
  // Enter the ring, then hold a centred view through cracking, emergence and a standing beat.
  const hatch = shot(work, [0, 4.1, 7.2], [0, 3.1, 0], { fov: 39, par: 0.12, L: coreL });
  const crack = shot(work, [0, 3.8, 6.6], [0, 3.15, 0], { fov: 40, par: 0.08, L: coreL });
  const burst = shot(work, [0, 3.8, 6.6], [0, 3.15, 0], { fov: 40, par: 0.08, L: coreL });
  const wake = shot(work, [0, 3.65, 6.7], [0, 2.95, 0], { fov: 39, par: 0.08, L: coreL });
  const stand = shot(work, [0, 3.5, 6.9], [0, 2.8, 0], { fov: 37, par: 0.08, L: coreL });
  shot(work, [0, 3.5, 6.9], [0, 2.8, 0], { fov: 37, par: 0.08, L: coreL });
  const leave = shot(work, [0, 3.6, 7.2], [0, 3, 0], { fov: 39, par: 0.12, L: coreL });

  // the ride: down the thread, along the path, through the gate
  const p0 = base[4];
  ride(work, coreL + 0.8, { f: 3.2, back: 4.6, lift: 1.4, side: 1, ahead: 4, dwell: false });
  ride(work, coreL + 2, { f: 3.4, fov: 56, dwell: false });
  ride(work, coreL + 2.8, { f: 3.55, fov: 58, dwell: false });
  ride(path, p0 - 0.1, { f: 3.7, fov: 58, dwell: false });
  ride(path, p0 + 1.2, { f: 4 });
  ride(path, p0 + 3, { f: 4.05, side: -1.2 });
  ride(path, p0 + 5, { f: 4.1, side: 1.4, lift: 1.9 });
  ride(path, p0 + 7, { f: 4.2, back: 6, lift: 2.2, side: -0.6, fov: 46 });
  ride(path, p0 + 9, { f: 4.4, fov: 52, dwell: false, flash: 0.04, flashColor: '#ff4a30' });
  ride(path, p0 + world.path.gateIndex, { f: 4.6, fov: 58, dwell: false, flash: 0.42, flashColor: '#c8200e' });

  // 6 · the lanterns
  const l0 = base[5];
  ride(lanterns, l0 + 0.2, { f: 4.85, fov: 54, dwell: false, flash: 0.05, flashColor: '#c8200e' });
  ride(lanterns, l0 + 2, { f: 5 });
  ride(lanterns, l0 + 4, { f: 5.05, side: -1.4 });
  ride(lanterns, l0 + 5.5, { f: 5.15, back: 7, lift: 2.4, fov: 46 });
  ride(lanterns, l0 + 7, { f: 5.4, back: 9, lift: 3, side: 3, fov: 48, dwell: false });

  // the pull-back: the spark climbs on alone
  shot(finale, [58, -34, 110], [0, -30, 0], { fov: 44, f: 5.8, L: l0 + 8.5, dwell: false });
  shot(finale, [40, 20, 190], [0, -10, 0], { fov: 40, f: 6, L: l0 + 9.6 });
  shot(finale, [16, 70, 250], [0, 10, 0], { fov: 38, f: 6, L: l0 + 10 });

  return new Story(keys, starts, { hatch, crack, burst, wake, stand, leave });
}
