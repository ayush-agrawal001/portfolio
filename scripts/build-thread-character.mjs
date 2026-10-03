/** Original, texture-free character for One Thread. Run: node scripts/build-thread-character.mjs */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mkdir, writeFile } from 'node:fs/promises';

// The exporter only needs the asynchronous Blob reader when there are no image textures.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => { this.result = result; this.onloadend?.(); });
  }
};

const mat = (name, color, roughness = 0.8, metalness = 0) => {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  m.name = name;
  return m;
};
const M = {
  skin: mat('Warm honey skin', '#c88d67'),
  ear: mat('Ear and lip warmth', '#a96551'),
  hair: mat('Espresso hair', '#211d25', 0.86),
  hairLight: mat('Swept hair highlights', '#302735'),
  jacket: mat('Midnight indigo twill', '#343f62'),
  rib: mat('Indigo cuffs and collar', '#222c46'),
  seam: mat('Raised jacket seams', '#53607e'),
  shirt: mat('Terracotta shirt', '#bf6658'),
  pants: mat('Charcoal tapered trousers', '#272d3b'),
  shoe: mat('Warm ivory sneakers', '#e5decc'),
  sole: mat('Rubber soles', '#bdb6a6'),
  eye: mat('Dark brown eyes', '#231e21', 0.45),
  white: mat('Eye catchlights', '#fff1d8', 0.4),
  metal: mat('Brushed silver hardware', '#b6becb', 0.35, 0.65),
};
const model = new THREE.Group();
model.name = 'ThreadTraveler';
model.userData = { author: 'One Thread portfolio', description: 'Original stylized young adult man, approximately 21. Articulated at named joints; forward is +Z; height is 1.88 metres.' };
const joints = {};
const joint = (name, parent, x, y, z = 0) => {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  (parent ? joints[parent] : model).add(g);
  joints[name] = g;
  return g;
};
joint('hips', null, 0, 0.94);
joint('chest', 'hips', 0, 0.07);
joint('head', 'chest', 0, 0.53);
for (const [s, sign] of [['L', 1], ['R', -1]]) {
  joint(`upperArm${s}`, 'chest', sign * 0.225, 0.395);
  joint(`forearm${s}`, `upperArm${s}`, 0, -0.275);
  joint(`hand${s}`, `forearm${s}`, 0, -0.245);
  joint(`thigh${s}`, 'hips', sign * 0.103, -0.055);
  joint(`shin${s}`, `thigh${s}`, 0, -0.405);
  joint(`foot${s}`, `shin${s}`, 0, -0.38);
}

function mesh(parent, geometry, material, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.rotation.set(...rot);
  parent.add(m);
  return m;
}
const sphere = new THREE.SphereGeometry(1, 20, 14);
const ball = (p, m, pos, scale, rot) => mesh(p, sphere, m, pos, scale, rot);
// Ring profiles sculpt a continuous silhouette without image textures.
function profile(parent, material, rings, depth = 0.65, segments = 24) {
  const geo = new THREE.LatheGeometry(rings.map(([y, r]) => new THREE.Vector2(r, y)), segments);
  return mesh(parent, geo, material, [0, 0, 0], [1, 1, depth]);
}
function line(parent, material, points, radius = 0.003) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return mesh(parent, new THREE.TubeGeometry(curve, 12, radius, 6, false), material);
}

const hips = joints.hips;
profile(hips, M.pants, [[-0.11, 0], [-0.10, 0.135], [-0.04, 0.169], [0.035, 0.159], [0.06, 0]], 0.67);
const chest = joints.chest;
const torsoRings = [[-0.05, 0], [-0.035, 0.157], [0.015, 0.167], [0.17, 0.171], [0.32, 0.209], [0.38, 0.213], [0.415, 0.154], [0.44, 0.075], [0.445, 0]].map(([y, r]) => new THREE.Vector2(r, y));
// The shirt and jacket occupy complementary arcs of the same surface, so they cannot intersect.
mesh(chest, new THREE.LatheGeometry(torsoRings, 32, 0.42, Math.PI * 2 - 0.84), M.jacket, [0, 0, 0], [1, 1, 0.64]);
mesh(chest, new THREE.LatheGeometry(torsoRings, 10, -0.42, 0.84), M.shirt, [0, 0, 0], [1, 1, 0.64]);
profile(chest, M.rib, [[-0.045, 0.15], [-0.04, 0.165], [0, 0.167], [0.005, 0.156]], 0.65);
for (const sign of [-1, 1]) {
  line(chest, M.rib, torsoRings.slice(2, -1).map(p => [sign * Math.sin(0.42) * p.x, p.y, Math.cos(0.42) * p.x * 0.64 + 0.002]), 0.007);
  line(chest, M.seam, [[sign * 0.129, 0.12, 0.09], [sign * 0.157, 0.20, 0.083]], 0.0035);
}
ball(chest, M.metal, [0.074, 0.16, 0.133], [0.007, 0.014, 0.004]);
ball(chest, M.shirt, [-0.14, 0.30, 0.108], [0.024, 0.006, 0.004]);
// Collar and neck conceal the head articulation.
profile(chest, M.skin, [[0.409, 0.057], [0.48, 0.054], [0.555, 0.062]], 0.88);
profile(chest, M.rib, [[0.418, 0.077], [0.449, 0.075], [0.458, 0.063]], 0.84);

const head = joints.head;
profile(head, M.skin, [[-0.032, 0], [-0.025, 0.043], [0.005, 0.077], [0.052, 0.102], [0.119, 0.111], [0.185, 0.101], [0.228, 0.072], [0.241, 0]], 0.91, 32);
for (const sign of [-1, 1]) {
  ball(head, M.skin, [sign * 0.109, 0.078, -0.003], [0.023, 0.039, 0.025]);
  ball(head, M.ear, [sign * 0.123, 0.081, 0.009], [0.007, 0.021, 0.012]);
  // Small inset eyes and sculpted upper lids keep an adult, understated face.
  ball(head, M.eye, [sign * 0.042, 0.113, 0.092], [0.014, 0.009, 0.005]);
  ball(head, M.white, [sign * 0.042 - 0.003, 0.116, 0.0965], [0.003, 0.003, 0.0015]);
  line(head, M.skin, [[sign * 0.023, 0.119, 0.093], [sign * 0.042, 0.124, 0.097], [sign * 0.059, 0.118, 0.087]], 0.005);
  line(head, M.hair, [[sign * 0.023, 0.141, 0.090], [sign * 0.042, 0.146, 0.093], [sign * 0.063, 0.139, 0.082]], 0.0048);
}
ball(head, M.skin, [0, 0.084, 0.098], [0.014, 0.03, 0.02]);
ball(head, M.skin, [0, 0.069, 0.11], [0.019, 0.012, 0.014]);
line(head, M.ear, [[-0.026, 0.035, 0.083], [-0.013, 0.031, 0.091], [0.009, 0.030, 0.094], [0.026, 0.036, 0.084]], 0.0028);
// Close-cut sides, shaped cap, and a few broad swept locks, rather than a helmet.
mesh(head, new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair, [0, 0.165, -0.008], [0.117, 0.123, 0.105]);
ball(head, M.hair, [0, 0.14, -0.067], [0.105, 0.105, 0.053]);
for (const sign of [-1, 1]) {
  ball(head, M.hair, [sign * 0.101, 0.148, -0.025], [0.018, 0.065, 0.065]);
}
for (let i = 0; i < 5; i++) {
  ball(head, i % 2 ? M.hairLight : M.hair, [-0.068 + i * 0.031, 0.234 + Math.sin(i * 0.65) * 0.013, 0.035], [0.034, 0.058, 0.09], [-0.24, -0.25, -0.48]);
}
ball(head, M.hair, [-0.074, 0.187, 0.062], [0.034, 0.054, 0.047], [0, 0.2, -0.55]);

for (const [side, sign] of [['L', 1], ['R', -1]]) {
  const arm = joints[`upperArm${side}`];
  ball(arm, M.jacket, [0, -0.021, 0], [0.077, 0.083, 0.076]);
  profile(arm, M.jacket, [[-0.29, 0.048], [-0.26, 0.059], [-0.10, 0.069], [-0.025, 0.073], [0.035, 0]], 0.95);
  const forearm = joints[`forearm${side}`];
  ball(forearm, M.jacket, [0, 0, 0], [0.057, 0.06, 0.055]);
  profile(forearm, M.jacket, [[-0.231, 0.04], [-0.2, 0.047], [-0.07, 0.054], [0.012, 0.051]], 0.96);
  profile(forearm, M.rib, [[-0.247, 0.037], [-0.241, 0.044], [-0.208, 0.045], [-0.203, 0.042]], 0.97);
  const hand = joints[`hand${side}`];
  ball(hand, M.skin, [0, -0.023, 0], [0.032, 0.05, 0.023]);
  for (let i = 0; i < 4; i++) {
    ball(hand, M.skin, [-0.021 + i * 0.014, -0.069 + Math.abs(i - 1.5) * 0.003, 0.002], [0.008, 0.029 - Math.abs(i - 1.5) * 0.003, 0.010]);
  }
  ball(hand, M.skin, [-sign * 0.032, -0.033, 0.008], [0.012, 0.029, 0.012], [0.15, 0, -sign * 0.4]);
  if (side === 'L') {
    profile(forearm, M.rib, [[-0.21, 0.047], [-0.19, 0.047]], 1.02);
    ball(forearm, M.metal, [0, -0.2, 0.048], [0.022, 0.022, 0.005]);
    ball(forearm, M.eye, [0, -0.2, 0.053], [0.018, 0.018, 0.003]);
  }
  const thigh = joints[`thigh${side}`];
  ball(thigh, M.pants, [0, -0.02, 0], [0.087, 0.094, 0.089]);
  profile(thigh, M.pants, [[-0.425, 0.056], [-0.38, 0.066], [-0.11, 0.084], [0.01, 0.082]], 1.03);
  const shin = joints[`shin${side}`];
  ball(shin, M.pants, [0, 0, 0], [0.062, 0.066, 0.064]);
  profile(shin, M.pants, [[-0.365, 0.039], [-0.30, 0.045], [-0.12, 0.064], [0.01, 0.06]], 1.06);
  profile(shin, M.rib, [[-0.375, 0.043], [-0.355, 0.044], [-0.334, 0.045]], 1.04);
  const foot = joints[`foot${side}`];
  ball(foot, M.sole, [0, -0.062, 0.039], [0.06, 0.021, 0.124]);
  ball(foot, M.shoe, [0, -0.039, 0.035], [0.056, 0.043, 0.118]);
  ball(foot, M.rib, [0, -0.004, -0.024], [0.043, 0.022, 0.036]);
  for (let i = 0; i < 3; i++) {
    line(foot, M.sole, [[-0.028, 0.001 - i * 0.006, 0.019 + i * 0.02], [0, 0.009 - i * 0.006, 0.021 + i * 0.02], [0.028, 0.001 - i * 0.006, 0.019 + i * 0.02]], 0.003);
  }
  line(foot, M.shirt, [[sign * 0.05, -0.035, -0.01], [sign * 0.057, -0.041, 0.028], [sign * 0.047, -0.044, 0.074]], 0.005);
}

// Bake each joint's pieces into one mesh per material to keep the draw-call count modest.
for (const g of Object.values(joints)) {
  const batches = new Map();
  for (const child of [...g.children]) {
    if (!child.isMesh) continue;
    child.updateMatrix();
    const geo = child.geometry.clone().applyMatrix4(child.matrix);
    if (!batches.has(child.material)) batches.set(child.material, []);
    batches.get(child.material).push(geo);
    g.remove(child);
  }
  for (const [material, geometries] of batches) {
    const part = new THREE.Mesh(mergeGeometries(geometries), material);
    part.name = `${g.name}_${material.name.replaceAll(' ', '_')}`;
    g.add(part);
    geometries.forEach((geo) => geo.dispose());
  }
}
const glb = await new GLTFExporter().parseAsync(model, { binary: true });
await mkdir(new URL('../public/models/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/models/thread-traveler.glb', import.meta.url), Buffer.from(glb));
console.log(`Created thread-traveler.glb (${(glb.byteLength / 1024).toFixed(0)} KB)`);
