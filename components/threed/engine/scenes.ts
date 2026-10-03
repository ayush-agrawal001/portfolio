import * as THREE from 'three';
import { FOG_F, FOG_PARS_F, FOG_PARS_V, FOG_V, NOISE } from './glsl';
import { clamp, damp, fbm, rng, smooth } from './math';
import { Chapter, G, THREAD, barkMaterial, makeGrass, mossMaterial, rockGeometry, sandMaterial, type Quality } from './world';
import { foundationArtifact, signalField } from './setpieces';
import { projectArtwork } from './project-art';
import { makeEgg } from './egg';
import { makeRockSurface } from './rock-surface';

export type PanelInfo = { name: string; dates: string; tint: string; tech: string[] };

export type Env = {
  quality: Quality;
  stone: THREE.MeshStandardMaterial;
  fonts: { sans: string; mono: string };
  panels: PanelInfo[];
  /** Called when the project in focus changes: `hot` means the pointer is on it. */
  onPanel: (index: number, hot: boolean) => void;
};

const fogUniforms = () => THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
const hdr = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);

/* ── 0 · The target ───────────────────────────────────────────────────────── */

/** A line of light between two points: a hot core, a soft glow, and breaks where it is interrupted. */
function beam(from: [number, number], to: [number, number], o: { width?: number; intensity?: number; centre?: number; gaps?: number[]; run?: number } = {}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  const gaps = [...(o.gaps ?? []), 999, 999, 999].slice(0, 3);
  const uniforms = {
    uLen: { value: length },
    uCentre: { value: o.centre ?? 0 },
    uGaps: { value: new THREE.Vector3(...gaps) },
    uColor: { value: hdr(THREAD, o.intensity ?? 5) },
    uRun: { value: o.run ?? 0 },
    uAmt: { value: 1 },
    uTime: G.uTime,
  };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(length, o.width ?? 0.34),
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uLen, uCentre, uRun, uAmt, uTime;
        uniform vec3 uGaps, uColor;
        varying vec2 vUv;
        float gap(float at, float x) { return 1.0 - (smoothstep(at - 0.1, at - 0.06, x) - smoothstep(at + 0.06, at + 0.1, x)); }
        void main() {
          float x = abs((vUv.x - 0.5) * uLen);
          float y = vUv.y - 0.5;
          float core = exp(-y * y * 1100.0);
          float glow = exp(-y * y * 30.0) * 0.1;
          float on = smoothstep(uCentre, uCentre + 0.05, x) * gap(uGaps.x, x) * gap(uGaps.y, x) * gap(uGaps.z, x);
          float ends = smoothstep(uLen * 0.5, uLen * 0.5 - 1.4, x);
          // packets of brighter light running outward from the centre
          float run = pow(0.5 + 0.5 * sin(x * 1.5 - uTime * 3.2), 22.0) * uRun;
          gl_FragColor = vec4(uColor * (core * (1.0 + run * 1.6) + glow) * on * ends * uAmt, 1.0);
        }`,
    }),
  );
  mesh.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0);
  mesh.rotation.z = Math.atan2(dy, dx);
  return { mesh, uniforms };
}

/** A few lines of instrument text, redrawn as its numbers change, and shown through a faulty signal. */
function readout(font: string, w: number, h: number, px: number) {
  const cv = document.createElement('canvas');
  cv.height = Math.round(px * 3.4);
  cv.width = Math.round((w / h) * cv.height);
  const g = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv);
  let shown = '';
  const draw = (lines: string[]) => {
    const key = lines.join('|');
    if (key === shown) return;
    shown = key;
    g.clearRect(0, 0, cv.width, cv.height);
    g.font = `500 ${px}px ${font}`;
    g.fillStyle = '#fff';
    g.textBaseline = 'top';
    lines.forEach((line, i) => g.fillText(line, 4, 6 + i * px * 1.5));
    tex.needsUpdate = true;
  };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, uColor: { value: hdr(THREAD, 2.6) }, uTime: G.uTime, uSeed: { value: Math.random() * 10 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec3 uColor;
        uniform float uTime, uSeed;
        varying vec2 vUv;
        float h1(float n) { return fract(sin(n * 91.345 + uSeed) * 47453.5); }
        void main() {
          float row = floor(vUv.y * 10.0);
          float beat = floor(uTime * 11.0);
          // most of the time the signal is clean; now and then a few rows tear sideways
          float fault = step(0.82, h1(beat * 0.37));
          float tear = (h1(row * 3.7 + beat) - 0.5) * 0.16 * fault * step(0.5, h1(row + beat * 1.9));
          float a = texture2D(map, vUv + vec2(tear, 0.0)).a;
          float ghost = texture2D(map, vUv + vec2(tear + 0.014, 0.0)).a * 0.45 * fault;
          float scan = 0.72 + 0.28 * sin(vUv.y * 190.0 + uTime * 18.0);
          float blink = 1.0 - 0.7 * step(0.965, h1(beat * 1.3 + row));
          gl_FragColor = vec4(uColor * (a + ghost) * scan * blink, 1.0);
        }`,
    }),
  );
  return { mesh, draw };
}

function buildOrigin(env: Env) {
  const c = new Chapter('origin', 0, [0, 0, 0]);
  const r = rng(11);

  // the stones: eight boulders on the diagonals, leaving the two axes clear for the crosshair
  const ring = new THREE.Group();
  c.group.add(ring);
  type Stone = { m: THREE.Mesh; base: THREE.Vector3; rot: THREE.Euler; spin: THREE.Vector3; ang: number; phase: number; push: number; small: boolean };
  const stones: Stone[] = [];
  const R = 6.3;
  for (let i = 0; i < 8; i++) {
    const ang = Math.PI / 8 + (Math.PI / 4) * i + (r() - 0.5) * 0.16;
    const m = new THREE.Mesh(
      rockGeometry(100 + i * 3, { detail: 5, cuts: 10 + (i % 3), cutDepth: 0.46, amp: 0.16, scale: [1.2, 0.8 + r() * 0.22, 1] }),
      env.stone,
    );
    m.scale.setScalar(1.7 + r() * 0.8);
    const rad = R + (r() - 0.5) * 0.9;
    m.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, 2.6 + (r() - 0.5) * 1.2);
    m.rotation.set(r() * 6.28, r() * 6.28, r() * 6.28);
    ring.add(m);
    stones.push({ m, base: m.position.clone(), rot: m.rotation.clone(), spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.1), ang, phase: r() * 10, push: 0, small: false });
  }
  for (let i = 0; i < 14; i++) {
    const ang = r() * Math.PI * 2;
    const m = new THREE.Mesh(rockGeometry(300 + i, { detail: 2, cuts: 5, amp: 0.3 }), env.stone);
    m.scale.setScalar(0.08 + r() * 0.22);
    const rad = R * (0.75 + r() * 0.55);
    m.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, 1.4 + r() * 2.4);
    ring.add(m);
    stones.push({ m, base: m.position.clone(), rot: new THREE.Euler(r() * 6, r() * 6, 0), spin: new THREE.Vector3(r(), r(), r()).multiplyScalar(0.7), ang, phase: r() * 10, push: 0, small: true });
  }

  const debris = new THREE.InstancedMesh(rockGeometry(77, { detail: 2, cuts: 6 }), env.stone, 70);
  const o = new THREE.Object3D();
  for (let i = 0; i < debris.count; i++) {
    const a = r() * Math.PI * 2;
    const rad = 15 + r() * 30;
    o.position.set(Math.cos(a) * rad, (r() - 0.5) * 34, Math.sin(a) * rad * 0.8 - 8);
    o.rotation.set(r() * 6, r() * 6, r() * 6);
    o.scale.setScalar(0.15 + r() * r() * 1.4);
    o.updateMatrix();
    debris.setMatrixAt(i, o.matrix);
  }
  c.group.add(debris);

  // The crosshair extends into the thread; keep its centre clear of decorative rings.
  const target = new THREE.Group();
  c.group.add(target);
  const upright = beam([0, -8.6], [0, 8.6], { width: 0.4, intensity: 5.5, centre: 0.12, gaps: [2.2, 4.9] });
  const level = beam([-9.2, 0], [9.2, 0], { width: 0.4, intensity: 8, centre: 0.12, gaps: [1.2, 3.6, 5.6], run: 0.7 });
  target.add(upright.mesh, level.mesh);
  for (const [x, y, half, vertical] of [
    [0, 1.6, 0.34, 0], [0, -1.6, 0.34, 0], [1.6, 0, 0.34, 1], [-1.6, 0, 0.34, 1],
    [0, 3.1, 0.2, 0], [0, -3.1, 0.2, 0], [3.1, 0, 0.2, 1], [-3.1, 0, 0.2, 1],
  ]) {
    const tick = vertical ? beam([x, -half], [x, half], { width: 0.12, intensity: 3.2 }) : beam([-half, y], [half, y], { width: 0.12, intensity: 3.2 });
    target.add(tick.mesh);
  }
  const big = () => readout(env.fonts.mono, 3.4, 0.56, 26);
  const small = () => readout(env.fonts.mono, 1.9, 0.32, 26);
  const notes = [big(), small(), big(), small()];
  notes[0].mesh.position.set(-4.5, 0.5, 0.02);
  notes[1].mesh.position.set(3.5, 0.36, 0.02);
  notes[2].mesh.position.set(4.7, -0.5, 0.02);
  notes[3].mesh.position.set(-3.5, -0.36, 0.02);
  notes.forEach((n) => target.add(n.mesh));

  // embers circling the centre, faster the nearer they are
  const emberCount = 800;
  const emberPos = new Float32Array(emberCount * 3);
  const emberSeed = new Float32Array(emberCount);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3] = 0.6 + r() * r() * 7.2;
    emberPos[i * 3 + 1] = r() * Math.PI * 2;
    emberPos[i * 3 + 2] = (r() - 0.5) * 1.8;
    emberSeed[i] = r();
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  emberGeo.setAttribute('aSeed', new THREE.BufferAttribute(emberSeed, 1));
  const embers = new THREE.Points(
    emberGeo,
    new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uProjScale: G.uProjScale },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uProjScale;
        varying float vGlow;
        void main() {
          // position holds radius, angle and depth
          float a = position.y + uTime * 0.5 / (0.5 + position.x * 0.35);
          vec4 mv = modelViewMatrix * vec4(cos(a) * position.x, sin(a) * position.x, position.z, 1.0);
          vGlow = 0.4 + 0.6 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 50.0);
          gl_PointSize = clamp((0.025 + aSeed * 0.03) * uProjScale / -mv.z, 1.0, 14.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vGlow;
        void main() {
          float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
          gl_FragColor = vec4(vec3(3.0, 0.55, 0.3) * a * a * vGlow, 1.0);
        }`,
    }),
  );
  embers.frustumCulled = false;
  c.group.add(embers);

  c.light([0, -0.5, 3.7], '#ff2412', 1150, 26);
  c.light([4, 16, 10], '#d9dbe3', 2100, 80);
  c.light([0, -16, -2], '#4a5260', 180, 48);
  c.setKey([0.25, 1, 0.55], '#9db0cc', 0.8);
  // straight down through the centre of the target, then off toward the grove
  c.thread.push(c.w(0, 70, 0), c.w(0, 24, 0), c.w(0, 0, 0), c.w(4, -4, -24), c.w(17, -12, -70));

  const at = new THREE.Vector3();
  const rel = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let redraw = 0;
  c.onUpdate(({ t, dt, s, raycaster, pluck, camera }) => {
    const lock = clamp(s / 3);
    ring.rotation.z = -0.4 + lock * 0.8 + t * 0.012;
    ring.updateMatrixWorld();

    // the stones give way to the pointer, as the thread does
    const ray = raycaster.ray;
    for (const st of stones) {
      at.copy(st.base).applyMatrix4(ring.matrixWorld);
      rel.copy(at).sub(ray.origin);
      const depth = Math.max(rel.dot(ray.direction), 0);
      const gap = rel.addScaledVector(ray.direction, -depth).length();
      st.push = damp(st.push, Math.exp(-(gap * gap) / 6) * (0.6 + pluck * 1.6), 4, dt);
      const out = st.push * (st.small ? 2.2 : 1.1);
      st.m.position.set(
        st.base.x + Math.cos(st.ang) * out,
        st.base.y + Math.sin(st.ang) * out + Math.sin(t * 0.4 + st.phase) * 0.12,
        st.base.z + out * 0.6,
      );
      st.m.rotation.set(st.rot.x + t * st.spin.x + st.push * 0.4, st.rot.y + t * st.spin.y, st.rot.z + t * st.spin.z);
    }

    // the crosshair leans a little toward wherever the pointer is
    if (ray.intersectPlane(plane, hit)) {
      target.position.x = damp(target.position.x, clamp(hit.x * 0.08, -0.6, 0.6), 2.5, dt);
      target.position.y = damp(target.position.y, clamp(hit.y * 0.08, -0.6, 0.6), 2.5, dt);
    }
    const flicker = 0.86 + 0.14 * Math.sin(t * 3.1);
    upright.uniforms.uAmt.value = flicker;
    level.uniforms.uAmt.value = flicker * (0.7 + lock * 0.3);

    redraw -= dt;
    if (redraw <= 0) {
      redraw = 0.12;
      const range = camera.position.distanceTo(c.origin).toFixed(2).padStart(5, '0');
      const pct = (lock * 100).toFixed(1).padStart(5, '0');
      notes[0].draw(['TARGET // AYUSH AGRAWAL', 'UNIT // ONE-MAN ARMY']);
      notes[1].draw([`DEPTH ${range}`]);
      notes[2].draw(['THREAD 01 // LIVE', `SIGNAL ${pct}%`]);
      notes[3].draw([lock > 0.98 ? '> ON THREAD' : '> TRACKING']);
    }
  });
  return c;
}

/* ── 1 · The forest ───────────────────────────────────────────────────────── */

/** A trunk that wanders as it climbs: a tube along a bent line, wide at the foot and thin at the top. */
function trunkGeometry(r: () => number, height: number, radius: number) {
  const points = [new THREE.Vector3()];
  let x = 0;
  let z = 0;
  for (let i = 1; i <= 5; i++) {
    x += (r() - 0.5) * height * 0.16;
    z += (r() - 0.5) * height * 0.16;
    points.push(new THREE.Vector3(x, (height * i) / 5, z));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 30, radius, 8, false);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const centre = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    curve.getPointAt(u, centre);
    const taper = (1 - u * 0.78) * (1 + 1.1 * Math.exp(-u * 14));
    p.fromBufferAttribute(pos, i).sub(centre).multiplyScalar(taper).add(centre);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  return { geo, top: curve.getPointAt(1), lean: curve.getTangentAt(1) };
}

/**
 * The cap that sits on a trunk, like a mushroom's: dark on top, and lit from within underneath,
 * with gills. The light is written into the vertices, so the cap needs no lamp of its own.
 */
function capGeometry(radius: number, glow: [number, number, number], top: THREE.Vector3, lean: THREE.Vector3) {
  const profile = [
    [0, 0.34], [0.3, 0.32], [0.62, 0.24], [0.86, 0.12], [1, -0.02], [0.96, -0.08], [0.6, -0.02], [0.2, 0.04], [0, 0.05],
  ].map(([x, y]) => new THREE.Vector2(Math.max(x, 0.001) * radius, y * radius));
  const SEG = 30;
  const geo = new THREE.LatheGeometry(profile, SEG);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    // the lathe writes its vertices one spoke at a time, each spoke running down the profile
    const ring = i % profile.length;
    const spoke = Math.floor(i / profile.length);
    const under = ring >= 5;
    // every other spoke is a gill: brighter, as if the light were coming through thinner flesh
    const k = under ? (spoke % 2 ? 1.5 : 0.5) * (ring === 5 ? 1.3 : 0.9) : ring === 4 ? 0.5 : 0.022;
    colors[i * 3] = glow[0] * k;
    colors[i * 3 + 1] = glow[1] * k;
    colors[i * 3 + 2] = glow[2] * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), lean.clone().lerp(new THREE.Vector3(0, 1, 0), 0.5).normalize()));
  geo.translate(top.x, top.y, top.z);
  return geo;
}

function buildGrove(env: Env) {
  const c = new Chapter('grove', 1, [26, -28, -170]);
  const r = rng(21);
  const pathX = (z: number) => 1.6 * Math.sin(z * 0.09);
  // the way through: nothing tall grows here, and it widens where the camera comes down into it
  const open = (x: number, z: number) => Math.abs(x - pathX(z)) < 10 + Math.max(0, z - 24) * 0.4;
  const height = (x: number, z: number) => {
    const d = Math.abs(x - pathX(z));
    return fbm(x * 0.05, 0, z * 0.05, 3, 3) * 2.6 * smooth(3, 18, d) + fbm(x * 0.21, 1, z * 0.21, 2, 5) * 0.22;
  };

  c.group.add(makeRockSurface(height, mossMaterial('#12301c'), env.stone));

  // the trees: a few shapes, each with its own colour of light, planted many times over
  const GLOWS: [number, number, number][] = [
    [0.12, 0.65, 0.38], [0.25, 0.7, 0.22], [0.1, 0.5, 0.33], [0.12, 0.6, 0.43],
  ];
  const bark = barkMaterial('#27352e');
  const capMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const VARIANTS = 8;
  const perVariant = Math.max(4, Math.round(env.quality.stalks / 45));
  const o = new THREE.Object3D();
  const feet: THREE.Vector3[] = [];
  for (let v = 0; v < VARIANTS; v++) {
    const tall = 14 + r() * 12;
    const trunk = trunkGeometry(r, tall, 0.32 + r() * 0.3);
    const cap = capGeometry(2 + r() * 2.6, GLOWS[v % GLOWS.length], trunk.top, trunk.lean);
    const trunks = new THREE.InstancedMesh(trunk.geo, bark, perVariant);
    const caps = new THREE.InstancedMesh(cap, capMat, perVariant);
    for (let i = 0; i < perVariant; i++) {
      let x = 0;
      let z = 0;
      do {
        x = (r() - 0.5) * 76;
        z = -56 + r() * 108;
      } while (open(x, z));
      // one in four is a sapling, so there is light at eye level too and not only overhead
      const scale = r() < 0.26 ? 0.14 + r() * 0.2 : 0.75 + r() * 0.6;
      o.position.set(x, height(x, z) - 0.2, z);
      o.rotation.set(0, r() * Math.PI * 2, 0);
      o.scale.setScalar(scale);
      o.updateMatrix();
      trunks.setMatrixAt(i, o.matrix);
      caps.setMatrixAt(i, o.matrix);
      feet.push(o.position.clone());
    }
    trunks.frustumCulled = false;
    caps.frustumCulled = false;
    c.group.add(trunks, caps);
  }

  // small glowing fungi, in drifts round the feet of the trees and along the edge of the path
  const fungus = new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  fungus.scale(1, 0.62, 1);
  const stalk = new THREE.CylinderGeometry(0.16, 0.22, 1, 5);
  stalk.translate(0, 0.5, 0);
  const PER = 150;
  const stalks = new THREE.InstancedMesh(stalk, new THREE.MeshStandardMaterial({ color: '#31443a', roughness: 0.9 }), PER * 3);
  [[0.3, 2.6, 1.9], [2.4, 0.5, 2.1], [0.9, 2.6, 0.4]].forEach((glow, k) => {
    const heads = new THREE.InstancedMesh(fungus, new THREE.MeshBasicMaterial({ color: new THREE.Color(...(glow as [number, number, number])) }), PER);
    for (let i = 0; i < PER; i++) {
      let x = 0;
      let z = 0;
      if (r() < 0.55) {
        const foot = feet[Math.floor(r() * feet.length)];
        const a = r() * Math.PI * 2;
        const d = 0.4 + r() * 2.4;
        x = foot.x + Math.cos(a) * d;
        z = foot.z + Math.sin(a) * d;
      } else {
        z = -44 + r() * 90;
        x = pathX(z) + (r() < 0.5 ? -1 : 1) * (1.6 + r() * r() * 9);
      }
      const size = 0.05 + r() * r() * 0.26;
      const tall = size * (1.2 + r() * 2.4);
      const y = height(x, z);
      o.rotation.set((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5);
      o.position.set(x, y, z);
      o.scale.set(size * 0.5, tall, size * 0.5);
      o.updateMatrix();
      stalks.setMatrixAt(k * PER + i, o.matrix);
      o.position.y = y + tall * Math.cos(o.rotation.x) * Math.cos(o.rotation.z);
      o.scale.setScalar(size);
      o.updateMatrix();
      heads.setMatrixAt(i, o.matrix);
    }
    heads.frustumCulled = false;
    c.group.add(heads);
  });
  stalks.frustumCulled = false;
  c.group.add(stalks);

  // undergrowth: blades whose tips hold a little light
  c.group.add(
    makeGrass({
      count: Math.round(env.quality.leaves * 3.2),
      seed: 23,
      place: (rand, out) => {
        const z = -50 + rand() * 100;
        const x = pathX(z) + (rand() - 0.5) * (rand() < 0.6 ? 16 : 56);
        if (Math.abs(x - pathX(z)) < 0.7) return false;
        out.set(x, height(x, z) - 0.02, z);
        return true;
      },
      hMin: 0.18,
      hMax: 1.25,
      width: 0.05,
      base: [0.004, 0.02, 0.012],
      tip: [0.02, 0.16, 0.1],
      glow: [0.03, 0.42, 0.3],
    }),
  );

  for (let i = 0; i < 16; i++) {
    const z = 40 - i * 5.6 + r() * 3;
    const side = i % 2 ? -1 : 1;
    const x = pathX(z) + side * (2.4 + r() * 5);
    const m = new THREE.Mesh(rockGeometry(210 + i, { detail: 3, scale: [1.3, 0.6, 1] }), env.stone);
    m.position.set(x, height(x, z) + 0.05, z);
    m.scale.setScalar(0.3 + r() * 0.9);
    m.rotation.set(r() * 0.4, r() * 6, r() * 0.4);
    c.group.add(m);
  }

  // spores adrift: most of them the forest's green, a few the violet of the caps
  const sporeCount = 420;
  const pos = new Float32Array(sporeCount * 3);
  const seed = new Float32Array(sporeCount);
  for (let i = 0; i < sporeCount; i++) {
    const z = -46 + r() * 92;
    pos[i * 3] = pathX(z) + (r() - 0.5) * 30;
    pos[i * 3 + 1] = 0.3 + r() * r() * 11;
    pos[i * 3 + 2] = z;
    seed[i] = r();
  }
  const sporeGeo = new THREE.BufferGeometry();
  sporeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sporeGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const spores = new THREE.Points(
    sporeGeo,
    new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uProjScale: G.uProjScale },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uProjScale;
        varying float vGlow, vSeed;
        void main() {
          vec3 p = position + vec3(sin(uTime * 0.5 + aSeed * 30.0), sin(uTime * 0.35 + aSeed * 50.0) * 1.4, cos(uTime * 0.45 + aSeed * 20.0)) * 0.9;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vGlow = pow(0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 1.6) + aSeed * 80.0), 2.0);
          vSeed = aSeed;
          gl_PointSize = clamp((0.07 + aSeed * 0.1) * uProjScale / -mv.z, 1.0, 30.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vGlow, vSeed;
        void main() {
          float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
          vec3 tone = vSeed > 0.8 ? vec3(1.9, 0.5, 2.2) : vec3(0.5, 2.4, 1.5);
          gl_FragColor = vec4(tone * a * a * a * (0.25 + 0.75 * vGlow), 1.0);
        }`,
    }),
  );
  spores.frustumCulled = false;
  c.group.add(spores);

  foundationArtifact(c, env.stone, env.fonts.mono);

  c.light([0, 7, 11], '#caffdf', 260, 32);
  c.light([-4, 5, -8], '#67cb97', 90, 36);
  c.light([3, 3, 26], '#40df98', 46, 28);
  c.setKey([-0.3, 1, 0.2], '#8fd8c4', 0.9);
  c.thread.push(
    c.w(pathX(36) + 0.5, 4, 36),
    c.w(pathX(22), 1.5, 22),
    c.w(pathX(10), 1.2, 10),
    c.w(pathX(-2), 1.25, -2),
    c.w(pathX(-14), 1.3, -14),
    c.w(pathX(-28), 3.2, -28),
  );
  const local = new THREE.Vector3();
  c.floorAt = (p) => {
    local.copy(p).sub(c.origin);
    return Math.hypot(local.x / 70, local.z / 90) < 0.95 ? c.origin.y + height(local.x, local.z) + 0.6 : -Infinity;
  };
  return c;
}

/* ── 2 · The frame ────────────────────────────────────────────────────────── */

function buildFrame(env: Env) {
  // red desert at dusk. The ground stops short of the work chapter's far side, where the ride drops away.
  const c = new Chapter('frame', 2, [-14, -30, -410]);
  // it is still there, far below and dark, under the first shots of the next chapter
  c.linger = 0;
  const r = rng(31);
  const sunPos = new THREE.Vector3(230, 96, -900);
  const sunDir = sunPos.clone().normalize();

  // dunes: flat where the frame stands, rolling further out, and a low line of hills along the horizon behind
  const height = (x: number, z: number) => {
    const d = Math.hypot(x, z);
    const dunes = fbm(x * 0.017, 0, z * 0.017, 4, 31) * 6.5 * smooth(6, 60, d);
    const behind = smooth(0.25, -0.35, z / Math.max(d, 1));
    const hills = (1 - Math.abs(fbm(x * 0.012, 4, z * 0.012, 3, 37))) * 10 * smooth(105, 175, d) * behind;
    const mound = 1.1 * Math.exp(-(d * d) / 60);
    // falls away toward the forest, so the two grounds never cross
    return dunes + hills + mound - smooth(70, 200, z) * 9;
  };
  const SIZE = 420;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, 240, 240);
  geo.rotateX(-Math.PI / 2);
  const gp = geo.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, height(gp.getX(i), gp.getZ(i)));
  geo.computeVertexNormals();
  c.group.add(new THREE.Mesh(geo, sandMaterial('#5a3326')));

  // the sun, low and small, with a wide soft glow round it
  const sunUniforms = { uAmt: { value: 1 } };
  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(190, 190),
    new THREE.ShaderMaterial({
      uniforms: sunUniforms,
      fog: false,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uAmt;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float disc = smoothstep(0.085, 0.06, d);
          float halo = pow(max(1.0 - d, 0.0), 4.5);
          gl_FragColor = vec4((vec3(7.0, 2.4, 0.6) * disc + vec3(0.9, 0.16, 0.03) * halo) * uAmt, 1.0);
        }`,
    }),
  );
  sun.position.copy(sunPos);
  sun.renderOrder = -50;
  c.group.add(sun);

  // the outcrop the frame stands on, and loose rock scattered over the sand
  const outcrop: [number, number, number, number, [number, number, number]][] = [
    [-1.5, 0.75, 0.3, 2.3, [1.25, 0.62, 1.05]],
    [1.9, 0.7, -0.3, 1.9, [1.2, 0.6, 1.1]],
    [0.3, 0.45, 2.1, 1.25, [1.3, 0.55, 1]],
    [-3.8, 0.35, 1.9, 0.95, [1.2, 0.6, 1]],
    [3.9, 0.3, 1.7, 0.85, [1.1, 0.6, 1.2]],
    [0.6, 0.5, -2.4, 1.5, [1.3, 0.6, 1.1]],
  ];
  outcrop.forEach(([x, y, z, s, scale], i) => {
    const m = new THREE.Mesh(rockGeometry(300 + i, { detail: 4, cuts: 8, cutDepth: 0.4, scale }), env.stone);
    m.position.set(x, height(x, z) + y, z);
    m.scale.setScalar(s);
    m.rotation.set(r() * 0.3, r() * 6, r() * 0.3);
    c.group.add(m);
  });
  const loose = new THREE.InstancedMesh(rockGeometry(340, { detail: 3, cuts: 7, scale: [1.2, 0.7, 1] }), env.stone, 90);
  const o = new THREE.Object3D();
  for (let i = 0; i < loose.count; i++) {
    const a = r() * Math.PI * 2;
    const d = 9 + r() * r() * 120;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const s = 0.25 + r() * r() * 2.4;
    o.position.set(x, height(x, z) + s * 0.15, z);
    o.rotation.set(r() * 6, r() * 6, r() * 6);
    o.scale.setScalar(s);
    o.updateMatrix();
    loose.setMatrixAt(i, o.matrix);
  }
  c.group.add(loose);

  // dry grass, thick between the rocks and thinning out across the sand
  const tufts: { x: number; z: number; r: number; lift: number }[] = [];
  for (let i = 0; i < 150; i++) {
    const near = i < 70;
    const a = r() * Math.PI * 2;
    const d = near ? 0.8 + r() * 4.4 : 7 + r() * r() * 34;
    tufts.push({ x: Math.cos(a) * d, z: Math.sin(a) * d * (near ? 0.75 : 1), r: 0.25 + r() * (near ? 0.75 : 0.5), lift: near ? 0.2 + 0.5 * Math.exp(-(d * d) / 9) : 0 });
  }
  c.group.add(
    makeGrass({
      count: Math.round(env.quality.leaves * 1.6),
      seed: 33,
      place: (rand, out) => {
        // a blade belongs to a tuft: most tufts crowd the outcrop, the rest are scattered over the sand
        const tuft = tufts[Math.floor(rand() * tufts.length)];
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * tuft.r;
        const x = tuft.x + Math.cos(a) * d;
        const z = tuft.z + Math.sin(a) * d;
        out.set(x, height(x, z) + tuft.lift, z);
        return true;
      },
      hMin: 0.3,
      hMax: 1.35,
      width: 0.045,
      base: [0.03, 0.006, 0.003],
      tip: [0.95, 0.2, 0.035],
      glow: [0.5, 0.12, 0.02],
    }),
  );

  // the frame: a thick slab of dark glass, leaning, with the light catching its edges
  const frame = new THREE.Group();
  frame.position.set(0, 4.25, 0);
  frame.rotation.set(-0.07, 0.24, -0.1);
  const W = 3.5;
  const H = 5.4;
  const B = 0.46;
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, -H / 2);
  shape.lineTo(W / 2, -H / 2);
  shape.lineTo(W / 2, H / 2);
  shape.lineTo(-W / 2, H / 2);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-W / 2 + B, -H / 2 + B);
  hole.lineTo(-W / 2 + B, H / 2 - B);
  hole.lineTo(W / 2 - B, H / 2 - B);
  hole.lineTo(W / 2 - B, -H / 2 + B);
  hole.closePath();
  shape.holes.push(hole);
  const slab = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 });
  slab.translate(0, 0, -0.1);
  frame.add(
    new THREE.Mesh(
      slab,
      new THREE.MeshStandardMaterial({ color: '#160403', roughness: 0.18, metalness: 0.3, transparent: true, opacity: 0.84, envMapIntensity: 0.9 }),
    ),
  );
  frame.add(new THREE.LineSegments(new THREE.EdgesGeometry(slab, 40), new THREE.LineBasicMaterial({ color: new THREE.Color(0.95, 0.5, 0.4) })));
  c.group.add(frame);
  c.group.updateMatrixWorld(true);

  // where the labels are pinned: points on the frame's outer edge, and which way each label leads off
  const pins: [number, number, -1 | 1][] = [
    [-W / 2, H / 2 - 0.5, -1], [W / 2, H / 2 - 0.55, 1], [W / 2, -0.35, 1], [-W / 2, -0.75, -1],
  ];
  const anchors = pins.map(([x, y]) => frame.localToWorld(new THREE.Vector3(x, y, 0.1)));

  c.light([1.2, 3.4, 3.6], '#ff8a4a', 90, 18);
  c.light([-4, 2, 6], '#ff4a22', 80, 22);
  c.light([4, 2, -4], '#ffb060', 60, 18);
  c.setKey([sunDir.x, sunDir.y + 0.22, sunDir.z], '#ff6a34', 2.6);
  // in low from the left, through the frame, up in an arc and away toward the sun
  c.thread.push(
    c.w(-6.4, 1, 39), c.w(-5.2, 1.5, 25), c.w(-3, 2.6, 12), c.w(-1.1, 3.9, 4.2), c.w(0, 4.25, 0), c.w(2.6, 5, -5),
    c.w(9, 8.5, -14), c.w(17, 4.6, -42), c.w(26, 3.8, -92),
  );

  const local = new THREE.Vector3();
  c.floorAt = (p) => {
    local.copy(p).sub(c.origin);
    return Math.abs(local.x) < SIZE / 2 && Math.abs(local.z) < SIZE / 2 ? c.origin.y + height(local.x, local.z) + 0.7 : -Infinity;
  };
  c.onUpdate(({ f }) => {
    // seen from the next chapter the sun is a dull ember on the horizon
    sunUniforms.uAmt.value = 1 - 0.82 * smooth(2.3, 3, f);
  });
  return { chapter: c, sunDir, anchors };
}

/* ── 3 · The work ─────────────────────────────────────────────────────────── */

function buildWork(env: Env) {
  const c = new Chapter('work', 3, [16, -20, -600]);
  const r = rng(41);
  const center = new THREE.Vector3(0, 3.4, 0);

  const islands: [number, number, number, number][] = [
    [0, 0.5, 0, 2.3], [-9.5, 1.2, -6, 1.6], [10.5, 4.6, -4.5, 1.2], [-7.5, 7, 7.5, 0.9], [7, -1.8, 9.5, 1.5], [-3, -3.6, -11, 2.3], [13, 0.4, 6, 0.8],
  ];
  islands.forEach(([x, y, z, s], i) => {
    const m = new THREE.Mesh(rockGeometry(400 + i, { cuts: 10, cutDepth: 0.5, scale: [1.35, 0.55, 1.15] }), env.stone);
    m.position.set(x, y, z);
    m.scale.setScalar(s);
    m.rotation.set(r() * 0.3, r() * 6, r() * 0.3);
    c.group.add(m);
    c.group.add(makeGrass({
      count: Math.round(env.quality.leaves / 9), seed: 400 + i,
      place: (rand, out) => {
        const a = rand() * Math.PI * 2; const d = Math.sqrt(rand()) * s * 0.7;
        out.set(x + Math.cos(a) * d, y + s * 0.37, z + Math.sin(a) * d); return true;
      },
      hMin: 0.1, hMax: 0.42, width: 0.04,
      base: [0.015, 0.025, 0.035], tip: [0.12, 0.22, 0.3], glow: [0.14, 0.15, 0.4],
    }));
  });

  const egg = makeEgg();
  egg.group.position.copy(center);
  c.group.add(egg.group);

  const R = 6.2;
  const lifts = [0.35, -0.3, 0.5, -0.15, 0.3, -0.4, 0.1];
  const PW = 3.4;
  const PH = (PW * 640) / 1024;
  const fronts: THREE.Mesh[] = [];
  const panels = env.panels.map((p, k) => {
    // offset by half a step, so there is a gap in the ring facing the camera's way in
    const ang = ((k + 0.5) / env.panels.length) * Math.PI * 2;
    const base = new THREE.Vector3(Math.sin(ang) * R, center.y + lifts[k % lifts.length], Math.cos(ang) * R);
    const g = new THREE.Group();
    g.position.copy(base);
    g.lookAt(base.clone().multiplyScalar(2).setY(base.y));
    const baseRot = g.rotation.clone();
    const tint = new THREE.Color(p.tint);
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(PW + 0.12, PH + 0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: '#08080c', roughness: 0.25, metalness: 0.4 }),
    );
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(PW + 0.07, PH + 0.07), new THREE.MeshBasicMaterial({ color: tint.clone() }));
    edge.position.z = 0.042;
    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(PW, PH),
      new THREE.MeshBasicMaterial({ map: projectArtwork(p, k, env.panels.length, env.fonts), color: new THREE.Color(0.8, 0.8, 0.8) }),
    );
    front.position.z = 0.046;
    front.userData.panel = k;
    g.add(back, edge, front);
    c.group.add(g);
    fronts.push(front);
    return { g, base, baseRot, tint, edge: edge.material as THREE.MeshBasicMaterial, ang, hover: 0, focus: 0, phase: r() * 10, tiltX: 0, tiltY: 0 };
  });

  c.light([-4.5, 6.5, -5.5], '#D27E99', 220, 30);
  c.light([5, 5.5, -6], '#7FB4CA', 220, 30);
  c.light([0, 4.1, 2.8], '#957FB8', 30, 10);
  const lightBase = c.lights.map((l) => l.color.clone());
  c.setKey([0.25, 0.75, 0.65], '#e6e2ff', 0.7);
  // in under the panels at the front, rising to the core so it does not cross the character; out over the top at the back
  c.thread.push(c.w(10, 10, 24), c.w(5.5, 7, 10), c.w(0.5, 1.9, 5.6), c.w(0, 3.4, 0), c.w(1.4, 5.9, -5), c.w(0.8, 5.6, -13), c.w(1, 0, -26));

  /** Shot-list position of each panel's close-up, filled in when the shots are laid out. */
  const shotS: number[] = [];
  let hovered = -1;
  let active = -1;
  let activeHot = false;
  const local = new THREE.Vector3();
  const tint = new THREE.Color();
  let tintW = 0;

  c.onUpdate(({ t, dt, s, raycaster, pointerMoved, modal }) => {
    const hit = !modal && pointerMoved ? raycaster.intersectObjects(fronts, false)[0] : undefined;
    hovered = hit ? (hit.object.userData.panel as number) : -1;

    const hatching = shotS.length > 0 && s > shotS[shotS.length - 1] + 0.65;
    let focus = hatching ? -1 : hovered;
    if (focus < 0 && !modal) {
      for (let k = 0; k < shotS.length; k++) if (Math.abs(s - shotS[k]) < 0.5) focus = k;
    }
    if (focus !== active || (hovered >= 0) !== activeHot) {
      active = focus;
      activeHot = hovered >= 0;
      env.onPanel(active, activeHot);
    }

    if (focus >= 0) tint.copy(panels[focus].tint);
    tintW = damp(tintW, focus >= 0 ? 1 : 0, 3, dt);
    c.lights[0].color.copy(lightBase[0]).lerp(tint, tintW * 0.7);
    c.lights[1].color.copy(lightBase[1]).lerp(tint, tintW * 0.7);

    for (let k = 0; k < panels.length; k++) {
      const p = panels[k];
      const on = k === hovered ? 1 : 0;
      p.hover = damp(p.hover, on, 6, dt);
      p.focus = damp(p.focus, k === focus ? 1 : 0, 4, dt);
      let tx = 0;
      let ty = 0;
      if (on && hit) {
        p.g.worldToLocal(local.copy(hit.point));
        tx = clamp(local.x / (PW / 2), -1, 1);
        ty = clamp(local.y / (PH / 2), -1, 1);
      }
      p.tiltX = damp(p.tiltX, -ty * 0.14, 5, dt);
      p.tiltY = damp(p.tiltY, tx * 0.18, 5, dt);
      p.g.position.set(p.base.x, p.base.y + Math.sin(t * 0.6 + p.phase) * 0.12 + p.hover * 0.08, p.base.z);
      p.g.rotation.set(p.baseRot.x + p.tiltX + Math.sin(t * 0.4 + p.phase) * 0.02, p.baseRot.y + p.tiltY, p.baseRot.z);
      p.g.scale.setScalar(1 + p.hover * 0.04);
      p.edge.color.copy(p.tint).multiplyScalar(0.5 + p.focus * 1.4 + p.hover * 1.6);
    }
  });
  c.onHide = () => {
    hovered = -1;
    if (active !== -1) {
      active = -1;
      activeHot = false;
      env.onPanel(-1, false);
    }
  };

  const panelShot = (k: number, dist = 14, lead = 0.26) => {
    const p = panels[k];
    const a = p.ang + lead;
    return {
      pos: [Math.sin(a) * dist, p.base.y + 0.5, Math.cos(a) * dist] as [number, number, number],
      look: p.base.clone().lerp(center, 0.12).toArray() as [number, number, number],
    };
  };

  return { chapter: c, center, egg, panelShot, shotS, count: panels.length, coreIndex: 3, hovered: () => hovered };
}

/* ── 4 · The path ─────────────────────────────────────────────────────────── */

function buildPath(env: Env) {
  const c = new Chapter('path', 4, [6, -64, -800]);
  const r = rng(51);
  const pathX = (z: number) => 4 * Math.sin(z * 0.035 + 0.6);
  const height = (x: number, z: number) => {
    const d = Math.abs(x - pathX(z));
    const valley = smooth(6, 70, d);
    return fbm(x * 0.02, 0, z * 0.02, 4, 5) * 9 * valley + valley * valley * 16 + fbm(x * 0.11, 3, z * 0.11, 2, 9) * 0.35 * smooth(1.5, 6, d);
  };

  const geo = new THREE.PlaneGeometry(420, 420, 210, 210);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const ground = new THREE.Color('#14161b');
  const stone = new THREE.Color('#34363f');
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, height(x, z));
    col.copy(ground).lerp(stone, 1 - smooth(0.8, 2.2, Math.abs(x - pathX(z))));
    colors.set([col.r, col.g, col.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  c.group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })));

  const boulders = new THREE.InstancedMesh(rockGeometry(500, { detail: 2, scale: [1, 0.8, 1] }), env.stone, 60);
  const o = new THREE.Object3D();
  for (let i = 0; i < boulders.count; i++) {
    const z = 70 - r() * 170;
    const x = pathX(z) + (r() < 0.5 ? -1 : 1) * (5 + r() * r() * 60);
    const s = 0.4 + r() * r() * 3.2;
    o.position.set(x, height(x, z) + s * 0.2, z);
    o.rotation.set(r() * 6, r() * 6, r() * 6);
    o.scale.setScalar(s);
    o.updateMatrix();
    boulders.setMatrixAt(i, o.matrix);
  }
  c.group.add(boulders);

  // stone lanterns down both sides of the path
  const spots: THREE.Vector3[] = [];
  for (let z = 50, i = 0; z >= -50; z -= 10, i++) {
    const x = pathX(z) + (i % 2 ? -2.5 : 2.5);
    spots.push(new THREE.Vector3(x, height(x, z), z));
  }
  const dark = new THREE.MeshStandardMaterial({ color: '#1d1e24', roughness: 0.9 });
  const parts: [THREE.BufferGeometry, THREE.Material, number][] = [
    [new THREE.BoxGeometry(0.26, 1.5, 0.26), dark, 0.75],
    [new THREE.BoxGeometry(0.32, 0.28, 0.32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.55, 0.2) }), 1.75],
    [new THREE.ConeGeometry(0.62, 0.42, 4), dark, 2.2],
  ];
  for (const [g, m, y] of parts) {
    const inst = new THREE.InstancedMesh(g, m, spots.length);
    spots.forEach((p, i) => {
      o.position.set(p.x, p.y + y, p.z);
      o.rotation.set(0, Math.PI / 4, 0);
      o.scale.setScalar(1);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
    });
    c.group.add(inst);
  }

  // the torii
  const GATE_Z = -62;
  const gate = new THREE.Group();
  gate.position.set(pathX(GATE_Z), height(pathX(GATE_Z), GATE_Z) - 0.3, GATE_Z);
  const red = new THREE.MeshStandardMaterial({ color: '#c8321f', roughness: 0.5, emissive: '#c8321f', emissiveIntensity: 0.22 });
  const black = new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.6 });
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.48, 8.6, 18), red);
    pillar.position.set(side * 3.9, 4.3, 0);
    pillar.rotation.z = side * 0.04;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.7, 18), black);
    foot.position.set(side * 4.07, 0.35, 0);
    gate.add(pillar, foot);
  }
  const beams: [number, number, number, number, THREE.Material][] = [
    [11.8, 0.3, 1.15, 9.25, black],
    [11.2, 0.55, 0.95, 8.85, red],
    [9.6, 0.42, 0.5, 6.9, red],
    [0.5, 1.5, 0.3, 7.85, red],
  ];
  for (const [w, h, d, y, m] of beams) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.y = y;
    gate.add(b);
  }
  const veilUniforms = { uTime: G.uTime, uAmt: { value: 1 } };
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(7.3, 6.6),
    new THREE.ShaderMaterial({
      uniforms: veilUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uAmt;
        varying vec2 vUv;
        ${NOISE}
        void main() {
          vec2 p = vUv - 0.5;
          float mist = fbm3(vec3(p * vec2(3.0, 5.0), uTime * 0.18));
          float core = exp(-dot(p * vec2(1.6, 1.0), p * vec2(1.6, 1.0)) * 5.0);
          float edge = smoothstep(0.0, 0.12, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
          gl_FragColor = vec4(vec3(1.0, 0.3, 0.16) * (mist * 0.35 + core * 0.45) * edge * uAmt, 1.0);
        }`,
    }),
  );
  veil.position.y = 3.4;
  gate.add(veil);
  c.group.add(gate);

  c.light([gate.position.x, gate.position.y + 5.5, GATE_Z + 4], '#ff5a3a', 280, 46);
  c.light([spots[3].x, spots[3].y + 2.2, spots[3].z], '#E6C384', 26, 16);
  c.light([spots[7].x, spots[7].y + 2.2, spots[7].z], '#E6C384', 26, 16);
  c.setKey([-0.4, 0.7, 0.5], '#aab4cc', 1.4);

  for (const z of [56, 44, 32, 20, 8, -4, -16, -28, -40, -52]) c.thread.push(c.w(pathX(z), height(pathX(z), z) + 1.3, z));
  c.thread.push(c.w(gate.position.x, gate.position.y + 3.6, GATE_Z), c.w(pathX(-76), 7, -76));

  const local = new THREE.Vector3();
  c.floorAt = (p) => {
    local.copy(p).sub(c.origin);
    return c.origin.y + height(local.x, local.z) + 0.7;
  };
  c.onUpdate(({ t }) => {
    veilUniforms.uAmt.value = 0.8 + 0.2 * Math.sin(t * 0.9);
  });

  const anchors = [spots[3], spots[7]].map((p) => c.w(p.x, p.y + 3, p.z));
  return { chapter: c, anchors, gateIndex: 10 };
}

/* ── 5 · The lanterns ─────────────────────────────────────────────────────── */

function buildLanterns(env: Env) {
  const c = new Chapter('lanterns', 5, [6, -34, -990]);
  signalField(c, env.quality.lanterns, env.fonts.sans);
  c.light([0, 10, 0], '#ff3122', 400, 80);
  c.light([-10, 30, -8], '#ff5842', 260, 70);
  c.setKey([0.2, 1, 0.3], '#e2c6c0', 0.6);
  c.thread.push(
    c.w(-2, -20, 96), c.w(3, -12, 68), c.w(-4, -5, 42), c.w(4, 2, 18), c.w(0, 8, 0), c.w(-6, 17, -10),
    c.w(0, 27, -14), c.w(7, 37, -6), c.w(2, 50, 2), c.w(0, 72, 0), c.w(0, 120, -4),
  );
  return c;
}

/* ── The world ────────────────────────────────────────────────────────────── */

export function buildWorld(env: Env) {
  const origin = buildOrigin(env);
  const grove = buildGrove(env);
  const frame = buildFrame(env);
  const work = buildWork(env);
  const path = buildPath(env);
  const lanterns = buildLanterns(env);
  const finale = new Chapter('finale', 6, [6, 26, -990]);
  finale.setKey([0.2, 1, 0.3], '#c8c0e0', 0.5);
  finale.light([0, -40, 0], '#FFA066', 400, 160);
  return {
    chapters: [origin, grove, frame.chapter, work.chapter, path.chapter, lanterns, finale],
    frame,
    work,
    path,
    /** World positions for the labels drawn over the canvas, and the chapter each belongs to. */
    anchors: [...frame.anchors.map((p) => ({ p, chapter: 2 })), ...path.anchors.map((p) => ({ p, chapter: 4 }))],
  };
}
export type World = ReturnType<typeof buildWorld>;
