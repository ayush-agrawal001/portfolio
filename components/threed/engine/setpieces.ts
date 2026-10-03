import * as THREE from 'three';
import { rng } from './math';
import { Chapter, rockGeometry } from './world';

/** Original scene assets, built locally rather than relying on third-party model downloads. */
export function foundationArtifact(chapter: Chapter, stone: THREE.MeshStandardMaterial, font: string) {
  const artifact = new THREE.Group();
  artifact.position.set(1.2, 0.9, 2);
  artifact.rotation.set(-0.14, -0.15, -0.18);
  chapter.group.add(artifact);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(4.6, 9.4, 1.8, 8, 16, 4), stone);
  slab.position.y = 4.7;
  artifact.add(slab);

  const dark = new THREE.MeshStandardMaterial({ color: '#0b1914', roughness: 0.9, metalness: 0.2 });
  const recess = new THREE.Mesh(new THREE.BoxGeometry(3.7, 3.1, 0.2), dark);
  recess.position.set(0, 6.85, 0.96);
  artifact.add(recess);
  const cv = document.createElement('canvas');
  cv.width = 768; cv.height = 640;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#06120c'; g.fillRect(0, 0, 768, 640);
  g.strokeStyle = '#214737'; g.lineWidth = 1;
  for (let x = 0; x < 768; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 640); g.stroke(); }
  for (let y = 0; y < 640; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(768, y); g.stroke(); }
  g.fillStyle = '#a6fbc7'; g.textAlign = 'center'; g.font = `300 190px ${font}`;
  g.fillText('</>', 384, 340);
  g.font = `400 25px ${font}`; g.fillText('LEARN. BUILD. REPEAT.', 384, 485);
  g.fillStyle = '#60a783'; g.font = `400 17px ${font}`; g.fillText('FOUNDATIONS / 2024 — 2027', 384, 552);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.75), new THREE.MeshBasicMaterial({ map: tex }));
  display.position.set(0, 6.85, 1.075); artifact.add(display);

  const keyGeo = new THREE.BoxGeometry(0.89, 0.62, 0.3);
  const keys = new THREE.InstancedMesh(keyGeo, stone, 12);
  const o = new THREE.Object3D();
  for (let i = 0; i < 12; i++) {
    o.position.set((i % 3 - 1) * 1.12, 1.8 + Math.floor(i / 3) * 0.87, 1.03);
    o.rotation.z = Math.sin(i * 34) * 0.035; o.updateMatrix(); keys.setMatrixAt(i, o.matrix);
  }
  artifact.add(keys);
  const r = rng(230);
  for (let i = 0; i < 16; i++) {
    const rubble = new THREE.Mesh(rockGeometry(800 + i, { detail: 2, cuts: 7 }), stone);
    rubble.position.set((r() - 0.5) * 10 + 1, r() * 0.5, (r() - 0.5) * 5 + 2);
    rubble.scale.set(0.5 + r(), 0.3 + r() * 0.6, 0.6 + r()); rubble.rotation.set(r(), r() * 6, r());
    chapter.group.add(rubble);
  }

  const holo = document.createElement('canvas'); holo.width = 512; holo.height = 640;
  const h = holo.getContext('2d')!;
  h.strokeStyle = '#79ffc4'; h.fillStyle = '#79ffc4'; h.lineWidth = 2;
  h.strokeRect(20, 20, 472, 600); h.font = `400 24px ${font}`;
  h.fillText('SYSTEM / FOUNDATIONS', 44, 67);
  for (let i = 0; i < 7; i++) { h.strokeRect(85 + i * 15, 170 + i * 9, 220 - i * 10, 220 - i * 10); }
  h.font = `400 19px ${font}`;
  ['01   COMPUTER SCIENCE', '02   WEB + DEVOPS', '03   SOLANA'].forEach((s, i) => h.fillText(s, 44, 478 + i * 41));
  const holoTex = new THREE.CanvasTexture(holo); holoTex.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.25), new THREE.MeshBasicMaterial({ map: holoTex, transparent: true, opacity: 0.65, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  plane.position.set(-4.1, 4.7, 6); plane.rotation.y = 0.2; chapter.group.add(plane);
  chapter.onUpdate(({ t }) => { plane.position.y = 4.7 + Math.sin(t * 0.5) * 0.1; });
}

export function signalField(chapter: Chapter, count: number, font: string) {
  const r = rng(61);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.09, 1, 5), new THREE.MeshStandardMaterial({ color: '#292225', metalness: 0.65, roughness: 0.5 }), count);
  const tips = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.32, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2315').multiplyScalar(2.5) }), count);
  const o = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2; const radius = 9 + Math.sqrt(r()) * 70;
    const height = 12 + r() * 30; const y = r() * 100 - 30;
    o.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius + 18); o.scale.set(1, height, 1); o.updateMatrix(); poles.setMatrixAt(i, o.matrix);
    o.position.y += height / 2; o.scale.setScalar(1); o.updateMatrix(); tips.setMatrixAt(i, o.matrix);
  }
  chapter.group.add(poles, tips);
  ['BUILD', 'CONNECT', 'CREATE'].forEach((word, index) => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 1024;
    const g = cv.getContext('2d')!; g.fillStyle = '#120605'; g.fillRect(0, 0, 128, 1024);
    g.fillStyle = '#ff5742'; g.font = `500 80px ${font}`; g.textAlign = 'center';
    [...word].forEach((letter, i) => g.fillText(letter, 64, 130 + i * 128));
    // Small unlit spaces make the banners read as LED matrices at close range.
    g.fillStyle = '#0009';
    for (let y = 0; y < 1024; y += 5) g.fillRect(0, y, 128, 1);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 10.4), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, color: new THREE.Color(1.7, 1.7, 1.7) }));
    banner.position.set(index % 2 ? 10 : -8, 7 + index * 15, 16 - index * 18);
    banner.rotation.y = index % 2 ? -0.3 : 0.3; chapter.group.add(banner);
  });
  const metal = new THREE.MeshStandardMaterial({ color: '#252023', metalness: 0.85, roughness: 0.45 });
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8 + i * 2, 0.09, 6, 100), metal);
    ring.rotation.x = Math.PI / 2; ring.position.set(0, 50 + i * 0.35, -4); chapter.group.add(ring);
  }
}
