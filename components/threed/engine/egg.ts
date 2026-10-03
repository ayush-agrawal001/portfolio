import * as THREE from 'three';
import { lerp, rng, smooth } from './math';
import { roughMaterial } from './world';

/** Scroll-sampled shell fragments: scrolling backwards reconstructs the same egg. */
export function makeEgg() {
  const group = new THREE.Group();
  group.name = 'hatching-egg';
  const material = roughMaterial(
    { color: '#e5daca', roughness: 0.58, metalness: 0.04, side: THREE.DoubleSide },
    {
      key: 'eggshell',
      height: 'return vnoise(p * 65.0) * 0.0015;',
      tint: 'diffuseColor.rgb *= 0.91 + 0.09 * vnoise(vObj * 48.0);',
    },
  );
  const crackMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color('#ff6847').multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false });
  const random = rng(137);
  const fragments: { mesh: THREE.Mesh; base: THREE.Vector3; destination: THREE.Vector3; rotation: THREE.Vector3; delay: number }[] = [];
  const bands = 3, sectors = 8, resolution = 10;
  const radius = 1.26, halfHeight = 1.75;

  // Adjacent patches share the same jagged boundaries, so the closed egg has no gaps.
  const point = (u: number, v: number, inset = 0) => {
    const theta = Math.PI * v + Math.sin(Math.PI * v) * (0.065 * Math.sin(u * 31) + 0.033 * Math.sin(u * 79));
    const phi = Math.PI * 2 * u + 0.06 * Math.sin(v * 47) * Math.sin(Math.PI * v);
    const width = (radius - inset) * Math.sin(theta) * (1 - 0.2 * Math.cos(theta));
    return new THREE.Vector3(width * Math.cos(phi), (halfHeight - inset) * Math.cos(theta), width * Math.sin(phi));
  };
  for (let band = 0; band < bands; band++) for (let sector = 0; sector < sectors; sector++) {
    const vertices: number[] = [], indices: number[] = [];
    const base = point((sector + 0.5) / sectors, (band + 0.5) / bands);
    const stride = resolution + 1, faceSize = stride * stride;
    for (let side = 0; side < 2; side++) for (let y = 0; y <= resolution; y++) for (let x = 0; x <= resolution; x++) {
      const p = point((sector + x / resolution) / sectors, (band + y / resolution) / bands, side * 0.055).sub(base);
      vertices.push(p.x, p.y, p.z);
    }
    for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
      const a = y * stride + x, b = a + 1, c = a + stride, d = c + 1;
      indices.push(a, b, c, b, d, c, a + faceSize, c + faceSize, b + faceSize, b + faceSize, c + faceSize, d + faceSize);
    }
    const boundary: number[] = [];
    for (let x = 0; x <= resolution; x++) boundary.push(x);
    for (let y = 1; y <= resolution; y++) boundary.push(y * stride + resolution);
    for (let x = resolution - 1; x >= 0; x--) boundary.push(resolution * stride + x);
    for (let y = resolution - 1; y > 0; y--) boundary.push(y * stride);
    for (let i = 0; i < boundary.length; i++) {
      const a = boundary[i], b = boundary[(i + 1) % boundary.length];
      indices.push(a, a + faceSize, b, b, a + faceSize, b + faceSize);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material); mesh.position.copy(base); group.add(mesh);
    const border = boundary.map(i => new THREE.Vector3(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]));
    border.push(border[0].clone());
    mesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(border), crackMaterial));
    let angle = Math.atan2(base.z, base.x);
    // Leave the front of the platform clear so the standing figure remains visible.
    if (Math.sin(angle) > 0.55) angle = Math.cos(angle) > 0 ? 0.35 : Math.PI - 0.35;
    const distance = 2 + random() * 0.8;
    const rotation = new THREE.Vector3((random() - 0.5) * 3.2, (random() - 0.5) * 2, (random() - 0.5) * 2.6);
    const finalRotation = new THREE.Euler(rotation.x, rotation.y, rotation.z);
    let bottom = Infinity;
    for (let i = 0; i < vertices.length; i += 3) {
      const p = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]).multiplyScalar(0.75).applyEuler(finalRotation);
      bottom = Math.min(bottom, p.y);
    }
    fragments.push({ mesh, base, destination: new THREE.Vector3(Math.cos(angle) * distance, -1.74 - bottom, Math.sin(angle) * distance - 0.5), rotation, delay: random() * 0.1 });
  }

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.85, 3.05, 0.24, 64), new THREE.MeshStandardMaterial({ color: '#27232c', roughness: 0.72, metalness: 0.25 }));
  pedestal.position.y = -1.87; group.add(pedestal);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.88, 0.014, 6, 100), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff503c').multiplyScalar(1.8) }));
  rim.rotation.x = Math.PI / 2; rim.position.y = -1.76; group.add(rim);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({ color: '#050407', transparent: true, opacity: 0, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1, 0.65, 1); shadow.position.y = -1.748; group.add(shadow);
  const light = new THREE.PointLight('#ffe4c3', 0, 7, 2); light.position.set(0, 0.5, 1.8); group.add(light);

  function update(crack: number, burst: number, emerge = 0, awake = 0, go = 0) {
    shadow.position.z = 1.25 * emerge;
    shadow.material.opacity = awake * (1 - go) * 0.36;
    crackMaterial.opacity = smooth(0.05, 0.9, crack) * (1 - smooth(0.1, 0.6, burst)) * 0.85;
    light.intensity = 3 + Math.sin(crack * Math.PI) * 7;
    for (const fragment of fragments) {
      const p = smooth(fragment.delay, 1, burst);
      // A brief outward lift, then the fragments settle beside the platform.
      fragment.mesh.position.lerpVectors(fragment.base, fragment.destination, p);
      fragment.mesh.position.y += Math.sin(p * Math.PI) * 1.1;
      const separation = crack * 0.012 * (1 - p);
      fragment.mesh.position.addScaledVector(fragment.base, separation);
      fragment.mesh.rotation.set(fragment.rotation.x * p, fragment.rotation.y * p, fragment.rotation.z * p);
      fragment.mesh.scale.setScalar(lerp(1, 0.75, p));
    }
  }
  update(0, 0);
  return { group, update };
}
