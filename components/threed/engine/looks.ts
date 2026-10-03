import * as THREE from 'three';

/** Everything that gives a chapter its own film stock: sky, air, light and the grade. */
type LookSpec = {
  skyTop: string;
  skyHorizon: string;
  skyBottom: string;
  stars: number;
  sunGlow: string;
  fogColor: string;
  fogDensity: number;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  env: number;
  exposure: number;
  contrast: number;
  saturation: number;
  tint: [number, number, number];
  lift: [number, number, number];
  bloom: number;
  threshold: number;
  streak: number;
  streakTint: string;
  aperture: number;
  ca: number;
  lens: number;
  grain: number;
  vignette: number;
  dust: string;
  dustAmt: number;
  /** How big the motes are, as a multiple of the usual. */
  dustSize: number;
};

const BASE: LookSpec = {
  skyTop: '#000000',
  skyHorizon: '#000000',
  skyBottom: '#000000',
  stars: 0,
  sunGlow: '#000000',
  fogColor: '#000000',
  fogDensity: 0.01,
  hemiSky: '#ffffff',
  hemiGround: '#000000',
  hemi: 0.3,
  env: 0.2,
  exposure: 1,
  contrast: 1.05,
  saturation: 1,
  tint: [1, 1, 1],
  lift: [0, 0, 0],
  bloom: 1,
  threshold: 1,
  streak: 0.3,
  streakTint: '#ff6a55',
  aperture: 5,
  ca: 0.001,
  lens: 0.025,
  grain: 0.045,
  vignette: 0.55,
  dust: '#ffffff',
  dustAmt: 0.8,
  dustSize: 1,
};

/** One grade per chapter: neutral stone, green ruins, red desert, then deep space. */
const SPECS: Partial<LookSpec>[] = [
  // 0 · the ring: indigo night, cold stars
  {
    skyTop: '#000000', skyHorizon: '#020203', skyBottom: '#000000', stars: 0.7,
    fogColor: '#030304', fogDensity: 0.002, hemiSky: '#c2c4ce', hemiGround: '#050404', hemi: 0.3, env: 0.3,
    contrast: 1.1, bloom: 1.1, threshold: 1.0, streak: 0.6, streakTint: '#ff4738',
    aperture: 2.7, grain: 0.045, vignette: 0.48, dust: '#d5d3d0', dustAmt: 1.25, dustSize: 1.3,
  },
  // 1 · the forest: deep green, lit from within
  {
    skyTop: '#010504', skyHorizon: '#07201a', skyBottom: '#020706', stars: 0.25,
    fogColor: '#061a14', fogDensity: 0.024, hemiSky: '#5fb89a', hemiGround: '#04100a', hemi: 0.42, env: 0.25,
    exposure: 1.05, contrast: 1.1, saturation: 1.08, lift: [0, 0.01, 0.006], bloom: 1.05, threshold: 0.95, streak: 0.22, streakTint: '#7dffc8',
    aperture: 2.7, grain: 0.05, vignette: 0.5, dust: '#9af0cc', dustAmt: 0.7,
  },
  // 2 · the frame: red desert, the sun on the horizon
  {
    skyTop: '#3a0404', skyHorizon: '#d81c08', skyBottom: '#200604', stars: 0, sunGlow: '#8a2408',
    fogColor: '#4a0c06', fogDensity: 0.0085, hemiSky: '#ff7044', hemiGround: '#2a0804', hemi: 0.55, env: 0.6,
    exposure: 0.9, contrast: 1.1, saturation: 1.1, lift: [0.014, 0, 0], bloom: 0.8, threshold: 1.3, streak: 0.3, streakTint: '#ff9060',
    aperture: 3, ca: 0.0015, grain: 0.045, vignette: 0.5, dust: '#ffb478', dustAmt: 1.2, dustSize: 1.8,
  },
  // 3 · the work: ink black, a red ember left along the horizon
  {
    skyTop: '#010103', skyHorizon: '#10080f', skyBottom: '#030102', stars: 0.7,
    fogColor: '#0a0405', fogDensity: 0.012, hemiSky: '#5a5478', hemiGround: '#000000', hemi: 0.16, env: 0.3,
    contrast: 1.08, bloom: 0.8, threshold: 1.3, streak: 0.25, streakTint: '#c8b8ff',
    aperture: 3.5, ca: 0.0025, grain: 0.06, vignette: 0.7, dust: '#957fb8', dustAmt: 0.25,
  },
  // 4 · the path: overcast dawn, vermilion gate
  {
    skyTop: '#010103', skyHorizon: '#080a12', skyBottom: '#010103', stars: 1,
    fogColor: '#080910', fogDensity: 0.003, hemiSky: '#c0c8dd', hemiGround: '#08080a', hemi: 0.6, env: 0.4,
    contrast: 1.1, lift: [0, 0.002, 0.008], bloom: 1, streak: 0.5, streakTint: '#ff5038',
    aperture: 0.6, grain: 0.045, vignette: 0.5, dust: '#d5d3d0', dustAmt: 0.6,
  },
  // 5 · the lanterns: warm night
  {
    skyTop: '#010102', skyHorizon: '#130405', skyBottom: '#010102', stars: 0.9,
    fogColor: '#120405', fogDensity: 0.0035, hemiSky: '#cfb9c0', hemiGround: '#000000', hemi: 0.4, env: 0.3,
    exposure: 1.05, contrast: 1.1, saturation: 1.08, bloom: 1.15, threshold: 0.9, streak: 0.4, streakTint: '#ff4937',
    aperture: 2, ca: 0.0015, grain: 0.045, vignette: 0.5, dust: '#d1bcb8', dustAmt: 0.9,
  },
  // 6 · the pull-back
  {
    skyTop: '#03040a', skyHorizon: '#141022', skyBottom: '#04040a', stars: 1,
    fogColor: '#0c0a14', fogDensity: 0.0028, hemiSky: '#8a86b0', hemiGround: '#050505', hemi: 0.4, env: 0.3,
    exposure: 1.1, contrast: 1.06, lift: [0.006, 0.004, 0.012], bloom: 1.25, threshold: 0.85, streak: 0.5, streakTint: '#ff7a50',
    aperture: 2.5, ca: 0.004, lens: 0.07, grain: 0.07, vignette: 0.65, dust: '#c8c0e0', dustAmt: 0.5,
  },
];

const COLOR_KEYS = ['skyTop', 'skyHorizon', 'skyBottom', 'sunGlow', 'fogColor', 'hemiSky', 'hemiGround', 'streakTint', 'dust'] as const;
const VEC_KEYS = ['tint', 'lift'] as const;
type ColorKey = (typeof COLOR_KEYS)[number];
type VecKey = (typeof VEC_KEYS)[number];
type NumKey = Exclude<keyof LookSpec, ColorKey | VecKey>;

export type Look = { [K in ColorKey]: THREE.Color } & { [K in VecKey]: THREE.Vector3 } & { [K in NumKey]: number };

function resolve(spec: Partial<LookSpec>): Look {
  const s = { ...BASE, ...spec };
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(s) as (keyof LookSpec)[]) {
    if ((COLOR_KEYS as readonly string[]).includes(k)) out[k] = new THREE.Color(s[k] as string);
    else if ((VEC_KEYS as readonly string[]).includes(k)) out[k] = new THREE.Vector3(...(s[k] as [number, number, number]));
    else out[k] = s[k];
  }
  return out as Look;
}

export const LOOKS = SPECS.map(resolve);
export const makeLook = () => resolve({});

/** The look at a fractional chapter position, blended from the two chapters either side. */
export function blendLook(f: number, out: Look) {
  const max = LOOKS.length - 1;
  const x = Math.min(max, Math.max(0, f));
  const i = Math.floor(x);
  const a = LOOKS[i];
  const b = LOOKS[Math.min(max, i + 1)];
  const t = x - i;
  const k = t * t * (3 - 2 * t);
  for (const key of COLOR_KEYS) out[key].copy(a[key]).lerp(b[key], k);
  for (const key of VEC_KEYS) out[key].lerpVectors(a[key], b[key], k);
  for (const key of Object.keys(a) as (keyof Look)[]) {
    const v = a[key];
    if (typeof v === 'number') (out as Record<string, unknown>)[key] = v + ((b[key] as number) - v) * k;
  }
  return out;
}
