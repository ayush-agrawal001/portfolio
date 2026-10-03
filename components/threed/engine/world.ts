import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FOG_F, FOG_PARS_F, FOG_PARS_V, FOG_V, NOISE } from './glsl';
import type { Look } from './looks';
import { clamp, noise3, rng } from './math';

/** The thread's colour: Kanagawa peach red, the akai ito. */
export const THREAD = '#ff4a3a';

export type Quality = {
  name: 'low' | 'med' | 'high';
  maxDpr: number;
  msaa: number;
  dust: number;
  stalks: number;
  leaves: number;
  lanterns: number;
  dofRadius: number;
};

/** Values every material shares. */
export const G = {
  uTime: { value: 0 },
  uPixelRatio: { value: 1 },
  /** Pixels per world unit at one unit from the camera, so points keep their size on any screen. */
  uProjScale: { value: 600 },
  /** The line from the camera through the pointer. */
  uRayO: { value: new THREE.Vector3() },
  uRayD: { value: new THREE.Vector3(0, 0, -1) },
  /** How hard the pointer is moving, 0 to 1. It decays when the pointer rests. */
  uPluck: { value: 0 },
  /** How fast the camera is travelling, 0 to 1. */
  uRush: { value: 0 },
};

export type UpdateCtx = {
  t: number;
  dt: number;
  /** Fractional chapter position of the camera. */
  f: number;
  /** Position in the shot list. */
  s: number;
  /** How hard the pointer is moving, 0 to 1. */
  pluck: number;
  camera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  pointerMoved: boolean;
  modal: boolean;
  look: Look;
};

type LightSpec = { pos: THREE.Vector3; color: THREE.Color; intensity: number; distance: number };
type KeySpec = { dir: THREE.Vector3; color: THREE.Color; intensity: number };

/** One place in the world: its objects, its lights and the stretch of thread that runs through it. */
export class Chapter {
  origin: THREE.Vector3;
  group = new THREE.Group();
  lights: LightSpec[] = [];
  key: KeySpec | null = null;
  /** Thread waypoints, in world space. */
  thread: THREE.Vector3[] = [];
  onHide?: () => void;
  /** How much longer than usual the chapter stays drawn after the camera has moved on, in chapters. */
  linger = 0;
  /** Lowest height the camera may be at a world position, where there is ground to stay above. */
  floorAt?: (p: THREE.Vector3) => number;
  private updaters: ((c: UpdateCtx) => void)[] = [];

  constructor(public id: string, public index: number, origin: [number, number, number]) {
    this.origin = new THREE.Vector3(...origin);
    this.group.position.copy(this.origin);
  }

  /** A point given relative to this chapter, in world space. */
  w(x: number, y: number, z: number) {
    return new THREE.Vector3(x, y, z).add(this.origin);
  }

  light(pos: [number, number, number], color: string, intensity: number, distance = 40) {
    this.lights.push({ pos: this.w(...pos), color: new THREE.Color(color), intensity, distance });
  }

  setKey(dir: [number, number, number], color: string, intensity: number) {
    this.key = { dir: new THREE.Vector3(...dir).normalize(), color: new THREE.Color(color), intensity };
  }

  onUpdate(fn: (c: UpdateCtx) => void) {
    this.updaters.push(fn);
  }

  update(c: UpdateCtx) {
    for (const fn of this.updaters) fn(c);
  }
}

/**
 * A fixed set of lights shared by every chapter. Each chapter describes up to three point lights and
 * a key light; the rig fades between the two chapters nearest the camera, so the number of lights in
 * the scene never changes and no material has to be recompiled mid-scroll.
 */
export class LightRig {
  private points: THREE.PointLight[] = [];
  private key = new THREE.DirectionalLight(0xffffff, 0);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.3);
  private dir = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < 6; i++) {
      const p = new THREE.PointLight(0xffffff, 0, 40, 2);
      scene.add(p);
      this.points.push(p);
    }
    scene.add(this.key, this.key.target, this.hemi);
  }

  private assign(chapter: Chapter | undefined, slot: number, weight: number) {
    for (let i = 0; i < 3; i++) {
      const light = this.points[slot + i];
      const spec = chapter?.lights[i];
      if (!spec || weight < 1e-3) {
        light.intensity = 0;
        continue;
      }
      light.position.copy(spec.pos);
      light.color.copy(spec.color);
      light.intensity = spec.intensity * weight;
      light.distance = spec.distance;
    }
  }

  update(f: number, chapters: Chapter[], look: Look, camera: THREE.Camera) {
    const max = chapters.length - 1;
    const x = clamp(f, 0, max);
    const i = Math.floor(x);
    const j = Math.min(max, i + 1);
    const t = x - i;
    this.assign(chapters[i], 0, 1 - t);
    this.assign(i === j ? undefined : chapters[j], 3, t);

    const a = chapters[i].key;
    const b = chapters[j].key;
    const owner = t < 0.5 ? a : b;
    if (owner) {
      const fade = i === j ? 1 : Math.abs(1 - 2 * t);
      // keep the light a constant offset from the camera, so it reads as coming from the sky
      this.dir.copy(owner.dir).multiplyScalar(60);
      this.key.position.copy(camera.position).add(this.dir);
      this.key.target.position.copy(camera.position);
      this.key.target.updateMatrixWorld();
      this.key.color.copy(owner.color);
      this.key.intensity = owner.intensity * fade;
    } else {
      this.key.intensity = 0;
    }
    this.hemi.color.copy(look.hemiSky);
    this.hemi.groundColor.copy(look.hemiGround);
    this.hemi.intensity = look.hemi;
  }
}

/** A sphere around the camera painted with the look's sky gradient, a sun glow and stars. */
export function makeSky() {
  const uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
    uSunGlow: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 0.03, -1).normalize() },
    uStars: { value: 0 },
    uTime: G.uTime,
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uHorizon, uBottom, uSunGlow, uSunDir;
        uniform float uStars, uTime;
        varying vec3 vDir;
        ${NOISE}
        void main() {
          vec3 d = normalize(vDir);
          vec3 col = d.y > 0.0
            ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.75, d.y), 0.55))
            : mix(uHorizon, uBottom, smoothstep(0.0, -0.3, d.y));
          float sun = max(dot(d, uSunDir), 0.0);
          col += uSunGlow * (pow(sun, 6.0) * 0.35 + pow(sun, 60.0) * 0.7);
          vec3 p = d * 220.0;
          vec3 cell = floor(p);
          float h = hash13(cell);
          float star = step(0.9972, h) * smoothstep(0.42, 0.0, length(fract(p) - 0.5));
          float twinkle = 0.65 + 0.35 * sin(uTime * 1.7 + h * 90.0);
          col += vec3(0.85, 0.9, 1.0) * star * twinkle * uStars * 1.6 * smoothstep(-0.05, 0.25, d.y);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return {
    mesh,
    update(look: Look) {
      uniforms.uTop.value.copy(look.skyTop);
      uniforms.uHorizon.value.copy(look.skyHorizon);
      uniforms.uBottom.value.copy(look.skyBottom);
      uniforms.uSunGlow.value.copy(look.sunGlow);
      uniforms.uStars.value = look.stars;
    },
  };
}

/** Motes in the air. They live in a box that follows the camera and wrap around its edges. */
export function makeDust(count: number, box = 50) {
  const r = rng(99);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = r() * box;
    pos[i * 3 + 1] = r() * box;
    pos[i * 3 + 2] = r() * box;
    seed[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const uniforms = {
    uCam: { value: new THREE.Vector3() },
    uBox: { value: box },
    uColor: { value: new THREE.Color() },
    uAmt: { value: 1 },
    uSize: { value: 1 },
    uTime: G.uTime,
    uProjScale: G.uProjScale,
  };
  const points = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform vec3 uCam;
        uniform float uBox, uTime, uProjScale, uSize;
        varying float vFade;
        void main() {
          vec3 p = position;
          p.y += uTime * (0.05 + aSeed * 0.12);
          p.x += sin(uTime * 0.2 + aSeed * 40.0) * 0.6;
          p = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5 + uCam;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          vFade = smoothstep(uBox * 0.5, uBox * 0.3, length(p - uCam)) * smoothstep(0.4, 2.0, d)
                * (0.55 + 0.45 * sin(uTime * (0.6 + aSeed) + aSeed * 60.0));
          gl_PointSize = clamp((0.02 + aSeed * 0.035) * uSize * uProjScale / d, 1.0, 40.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uAmt;
        varying float vFade;
        void main() {
          float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
          gl_FragColor = vec4(uColor * a * a * vFade * uAmt * 0.9, 1.0);
        }`,
    }),
  );
  points.frustumCulled = false;
  return { points, uniforms };
}

/**
 * The thread: one curve through every chapter. Positions along it are measured in waypoints, so
 * `L = 3.5` is halfway between the fourth and fifth.
 */
export function makeThread(waypoints: THREE.Vector3[]) {
  const n = waypoints.length;
  const curve = new THREE.CatmullRomCurve3(waypoints, false, 'centripetal');
  const DIV = n * 24;
  const lengths = curve.getLengths(DIV);
  const total = lengths[DIV];

  const at = (L: number, out = new THREE.Vector3()) => curve.getPoint(clamp(L / (n - 1)), out);
  /** Waypoint position to fraction of the curve's length, which is what the tube's texture runs along. */
  const arc = (L: number) => {
    const x = clamp(L / (n - 1)) * DIV;
    const i = Math.min(DIV - 1, Math.floor(x));
    return (lengths[i] + (lengths[i + 1] - lengths[i]) * (x - i)) / total;
  };

  const samples: THREE.Vector3[] = [];
  const SAMPLES = n * 16;
  for (let i = 0; i <= SAMPLES; i++) samples.push(at((i / SAMPLES) * (n - 1)));
  const nearest = (p: THREE.Vector3) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i <= SAMPLES; i++) {
      const d = samples[i].distanceToSquared(p);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return (best / SAMPLES) * (n - 1);
  };

  const uniforms = {
    uHead: { value: 0 },
    uColor: { value: new THREE.Color(THREAD) },
    uGain: { value: 1 },
    uHeadAmt: { value: 2.5 },
    uLength: { value: total },
    uTime: G.uTime,
    uRayO: G.uRayO,
    uRayD: G.uRayD,
    uPluck: G.uPluck,
    uRush: G.uRush,
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
  };
  const RADIUS = 0.035;
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, n * 60, RADIUS, 6, false),
    new THREE.ShaderMaterial({
      uniforms,
      fog: true,
      vertexShader: /* glsl */ `
        uniform vec3 uRayO, uRayD;
        uniform float uPluck, uRush, uLength, uTime;
        varying float vU, vNear;
        ${FOG_PARS_V}
        void main() {
          vU = uv.x;
          float along = uv.x * uLength;
          vec3 centre = position - normal * ${RADIUS.toFixed(3)};

          // The thread is a string. A resting pointer holds it aside; a moving one plucks it, and
          // the pluck runs off along the string as a wave.
          vec3 rel = centre - uRayO;
          float depth = max(dot(rel, uRayD), 0.0);
          vec3 off = rel - uRayD * depth;
          float gap = length(off);
          vec3 away = gap > 1e-4 ? off / gap : vec3(1.0, 0.0, 0.0);
          float reach = exp(-gap * gap / (0.5 + depth * 0.012)) * smoothstep(140.0, 0.0, depth);
          float ring = sin(uTime * 32.0 - along * 1.7) * uPluck;
          centre += away * reach * (0.13 + 0.5 * uPluck + ring * 0.25);

          // and it shivers when the camera rushes along it
          centre += vec3(sin(along * 0.9 + uTime * 6.0), 0.3 * sin(along * 1.3 - uTime * 5.0), cos(along * 0.7 + uTime * 4.5)) * 0.16 * uRush;

          vec4 mvPosition = modelViewMatrix * vec4(centre + normal * ${RADIUS.toFixed(3)}, 1.0);
          // right by the lens the thread would blur into a wide bright band, so it dims as it gets close
          vNear = smoothstep(0.8, 4.0, -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          ${FOG_V}
        }`,
      fragmentShader: /* glsl */ `
        uniform float uHead, uHeadAmt, uTime, uGain;
        uniform vec3 uColor;
        varying float vU, vNear;
        ${FOG_PARS_F}
        void main() {
          float lit = smoothstep(uHead + 0.004, uHead - 0.004, vU);
          float pulse = 0.75 + 0.25 * sin(vU * 900.0 - uTime * 2.2);
          float head = exp(-abs(vU - uHead) * 260.0);
          gl_FragColor = vec4(uColor * (mix(0.22, 2.3 * pulse, lit) + head * uHeadAmt) * uGain * (0.12 + 0.88 * vNear), 1.0);
          ${FOG_F}
        }`,
    }),
  );
  mesh.frustumCulled = false;

  const P = new THREE.Vector3();
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const T = new THREE.Vector3();
  const S = new THREE.Vector3();
  const U = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  type Rider = { back: number; lift: number; side: number; ahead: number };
  /** Where a camera following something at `L` should sit and look. */
  const chase = (L: number, r: Rider, pos: THREE.Vector3, look: THREE.Vector3) => {
    at(L, P);
    T.subVectors(at(L + 0.3, A), at(L - 0.2, B)).normalize();
    S.crossVectors(T, UP);
    if (S.lengthSq() < 1e-4) S.set(1, 0, 0);
    S.normalize();
    U.crossVectors(S, T).normalize();
    pos.copy(P).addScaledVector(T, -r.back).addScaledVector(U, r.lift).addScaledVector(S, r.side);
    look.copy(P).addScaledVector(T, r.ahead).addScaledVector(U, 0.3);
  };

  /** Position and axes at `L`: forward along the thread, sideways, and up. */
  const frame = (L: number, out: { pos: THREE.Vector3; forward: THREE.Vector3; side: THREE.Vector3; up: THREE.Vector3 }) => {
    at(L, out.pos);
    out.forward.subVectors(at(L + 0.3, A), at(L - 0.2, B)).normalize();
    out.side.crossVectors(out.forward, UP);
    if (out.side.lengthSq() < 1e-4) out.side.set(1, 0, 0);
    out.side.normalize();
    out.up.crossVectors(out.side, out.forward).normalize();
    return out;
  };

  return { mesh, uniforms, curve, count: n, at, arc, nearest, chase, frame };
}
export type Thread = ReturnType<typeof makeThread>;

/** The light that travels the thread. */
export function makeSpark() {
  const group = new THREE.Group();
  const color = new THREE.Color(THREAD);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 20, 12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.75, 0.6).multiplyScalar(5), fog: false }),
  );
  const uniforms = { uColor: { value: color.clone().multiplyScalar(2.2) }, uTime: G.uTime, uAmt: { value: 1 } };
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // always face the camera
          vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mv.xy += position.xy;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uTime, uAmt;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float glow = pow(max(1.0 - d, 0.0), 3.0) * (0.85 + 0.15 * sin(uTime * 7.0));
          gl_FragColor = vec4(uColor * glow * uAmt, 1.0);
        }`,
    }),
  );
  const light = new THREE.PointLight(color, 0, 26, 2);
  group.add(core, halo, light);
  return { group, light, uniforms, core };
}

/**
 * A boulder: a sphere with slices taken off it, which gives the broad broken faces, then pushed
 * about by two sizes of noise. The finer grain is left to the material.
 */
export function rockGeometry(seed: number, { detail = 3, cuts = 9, cutDepth = 0.45, amp = 0.16, scale = [1, 1, 1] as [number, number, number] } = {}) {
  const r = rng(seed);
  const raw = new THREE.IcosahedronGeometry(1, detail);
  // share vertices between faces, so the surface shades as one rounded mass rather than flat triangles
  raw.deleteAttribute('normal');
  raw.deleteAttribute('uv');
  const geo = mergeVertices(raw, 1e-4);
  raw.dispose();
  const pos = geo.attributes.position;
  const planes: [THREE.Vector3, number][] = [];
  for (let i = 0; i < cuts; i++) {
    planes.push([new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize(), 1 - r() * cutDepth]);
  }
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    for (const [normal, d] of planes) {
      const over = p.dot(normal) - d;
      if (over > 0) p.addScaledVector(normal, -over);
    }
    const lumps = noise3(p.x * 1.7 + seed, p.y * 1.7, p.z * 1.7, seed);
    const pits = detail >= 3 ? noise3(p.x * 5.3, p.y * 5.3 + seed, p.z * 5.3, seed + 7) : 0;
    p.multiplyScalar(1 + amp * lumps + amp * 0.22 * pits);
    pos.setXYZ(i, p.x * scale[0], p.y * scale[1], p.z * scale[2]);
  }
  // smooth across the rounded parts, but keep a hard edge wherever a slice was taken off
  const creased = toCreasedNormals(geo, 0.5);
  geo.dispose();
  return creased;
}

type Surface = {
  /** Shared by every material with the same shader, so the program is compiled once. */
  key: string;
  /** Body of a GLSL function `float (vec3 p)`: the height of the surface grain at a point. */
  height: string;
  /** GLSL statements that may change `diffuseColor` from `vObj`, the point on the object. */
  tint?: string;
};

/**
 * The standard lit material with a grain. The height is a formula rather than a texture, so it
 * never repeats and never blurs up close; the shader tilts the normal by its slope.
 */
export function roughMaterial(params: THREE.MeshStandardMaterialParameters, surface: Surface) {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vObj;
        ${NOISE}
        float surfaceHeight(vec3 p) { ${surface.height} }
        // tilt the normal by the slope of a height field, measured from one pixel to the next
        vec3 bumped(vec3 at, vec3 n, float h) {
          vec3 sx = dFdx(at);
          vec3 sy = dFdy(at);
          vec3 r1 = cross(sy, n);
          vec3 r2 = cross(n, sx);
          float det = dot(sx, r1);
          vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
          // on a sliver of a triangle the slope cannot be measured: leave the normal alone there
          vec3 tilted = abs(det) * n - grad;
          float len = length(tilted);
          return len > 1e-7 ? tilted / len : n;
        }`,
      )
      .replace('#include <color_fragment>', `#include <color_fragment>\n${surface.tint ?? ''}`)
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        normal = bumped(-vViewPosition, normal, surfaceHeight(vObj));`,
      );
  };
  m.customProgramCacheKey = () => surface.key;
  return m;
}

/** Basalt: a rough grain in two sizes, patches of lighter and darker stone, and dark in the hollows. */
export const stoneMaterial = () =>
  roughMaterial(
    { color: '#46464c', roughness: 0.86, metalness: 0.02 },
    {
      key: 'stone',
      height: /* glsl */ `return fbm3(p * 2.3) * 0.11 + fbm3(p * 12.0 + 3.1) * 0.036 + vnoise(p * 42.0) * 0.007;`,
      tint: /* glsl */ `
        float patches = fbm3(vObj * 0.8 + 11.0);
        float hollows = smoothstep(0.22, 0.6, fbm3(vObj * 4.6 + 5.0));
        diffuseColor.rgb *= mix(0.5, 1.25, patches) * mix(0.4, 1.0, hollows);`,
    },
  );

/** Sand: ripples the wind has combed into it, which bend with the dune and fade with distance, over a fine grain. */
export const sandMaterial = (color: string) =>
  roughMaterial(
    { color, roughness: 0.95, metalness: 0 },
    {
      key: 'sand',
      height: /* glsl */ `
        vec2 w = p.xz + vec2(fbm3(vec3(p.xz * 0.05, 1.0)), fbm3(vec3(p.xz * 0.05, 7.0))) * 13.0;
        float ripple = sin(dot(w, vec2(0.34, 0.94)) * 5.2);
        float near = smoothstep(70.0, 6.0, length(vViewPosition));
        return (ripple * ripple * 0.024 + fbm3(p * 3.1) * 0.04 + vnoise(p * 34.0) * 0.007) * near;`,
      tint: /* glsl */ `diffuseColor.rgb *= mix(0.6, 1.2, fbm3(vObj * 0.13 + 4.0));`,
    },
  );

/** A forest floor: soft mounds of moss with a damp, darker mottle. */
export const mossMaterial = (color: string) =>
  roughMaterial(
    { color, roughness: 1, metalness: 0 },
    {
      key: 'moss',
      height: /* glsl */ `return fbm3(p * 1.3) * 0.16 + fbm3(p * 7.0 + 2.0) * 0.04 + vnoise(p * 40.0) * 0.006;`,
      tint: /* glsl */ `diffuseColor.rgb *= mix(0.35, 1.5, fbm3(vObj * 0.5 + 9.0)) * mix(0.6, 1.0, fbm3(vObj * 3.3));`,
    },
  );

/** Bark: ridges that run up the trunk. */
export const barkMaterial = (color: string) =>
  roughMaterial(
    { color, roughness: 0.9, metalness: 0 },
    {
      key: 'bark',
      height: /* glsl */ `return fbm3(vec3(p.x * 7.0, p.y * 0.7, p.z * 7.0)) * 0.07 + fbm3(p * 16.0) * 0.012;`,
      tint: /* glsl */ `diffuseColor.rgb *= mix(0.45, 1.3, fbm3(vec3(vObj.x * 3.0, vObj.y * 0.4, vObj.z * 3.0)));`,
    },
  );

type GrassOptions = {
  count: number;
  seed: number;
  /** Puts a blade's root in `out`. Return false to skip this try. */
  place: (rand: () => number, out: THREE.Vector3) => boolean;
  hMin: number;
  hMax: number;
  width: number;
  /** Colour at the root and at the tip. The blades are not lit, so these are the colours you see. */
  base: [number, number, number];
  tip: [number, number, number];
  /** Extra light added at the very tip, for grass that glows. */
  glow?: [number, number, number];
};

/** A field of blades: one tapered strip drawn thousands of times, bent and swayed in the shader. */
export function makeGrass(o: GrassOptions) {
  const r = rng(o.seed);
  const blade = new THREE.PlaneGeometry(1, 1, 1, 4);
  blade.translate(0, 0.5, 0);
  const uniforms = {
    uTime: G.uTime,
    uBase: { value: new THREE.Color(...o.base) },
    uTip: { value: new THREE.Color(...o.tip) },
    uGlow: { value: new THREE.Color(...(o.glow ?? [0, 0, 0])) },
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
  };
  const mesh = new THREE.InstancedMesh(
    blade,
    new THREE.ShaderMaterial({
      uniforms,
      fog: true,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying float vY, vRand;
        ${FOG_PARS_V}
        void main() {
          vec3 root = instanceMatrix[3].xyz;
          float h = fract(sin(dot(root.xz, vec2(12.9898, 78.233))) * 43758.5453);
          vec3 p = position;
          float t = p.y;
          p.x *= 1.0 - t * 0.9;
          // each blade leans its own amount, and they all lean a little more as the wind passes
          p.z += ((0.18 + 0.45 * h) + sin(uTime * 1.3 + root.x * 0.6 + root.z * 0.45 + h * 6.28) * 0.14) * t * t;
          vY = t;
          vRand = h;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          ${FOG_V}
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uBase, uTip, uGlow;
        varying float vY, vRand;
        ${FOG_PARS_F}
        void main() {
          // interpolation can leave the height a hair below zero, and a power of a negative number is not a number
          float y = clamp(vY, 0.0, 1.0);
          vec3 col = mix(uBase, uTip, pow(y, 1.4)) * (0.55 + 0.9 * vRand) + uGlow * pow(y, 5.0);
          gl_FragColor = vec4(col, 1.0);
          ${FOG_F}
        }`,
    }),
    o.count,
  );
  const obj = new THREE.Object3D();
  const at = new THREE.Vector3();
  let placed = 0;
  for (let tries = 0; placed < o.count && tries < o.count * 6; tries++) {
    if (!o.place(r, at)) continue;
    const h = o.hMin + r() * r() * (o.hMax - o.hMin);
    obj.position.copy(at);
    obj.rotation.set((r() - 0.5) * 0.25, r() * Math.PI * 2, (r() - 0.5) * 0.25);
    obj.scale.set(o.width * (0.7 + r() * 0.6), h, h);
    obj.updateMatrix();
    mesh.setMatrixAt(placed++, obj.matrix);
  }
  mesh.count = placed;
  mesh.frustumCulled = false;
  return mesh;
}
