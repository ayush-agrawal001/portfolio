import * as THREE from 'three';
import type { Env, PanelInfo } from './scenes';

/** Bespoke editorial project covers, not screenshots or invented product metrics. */
export function projectArtwork(p: PanelInfo, index: number, total: number, fonts: Env['fonts']) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 640;
  const g = cv.getContext('2d')!;
  g.fillStyle = ['#101a30', '#f0e8dd', '#153226', '#eee6dc', '#e9edf2', '#1d1538', '#142a35'][index % 7];
  g.fillRect(0, 0, 1024, 640);
  const light = [1, 3, 4].includes(index);
  const ink = light ? '#202423' : '#f2eee7';
  const faint = light ? '#20242325' : '#ffffff26';
  const accent = light ? '#65735c' : p.tint;
  g.strokeStyle = faint; g.lineWidth = 1;
  for (let x = 32; x < 1024; x += 48) { g.beginPath(); g.moveTo(x, 140); g.lineTo(x, 455); g.stroke(); }
  const line = (x: number, y: number, w: number, color = faint) => { g.fillStyle = color; g.fillRect(x, y, w, 5); };
  const box = (x: number, y: number, w: number, h: number, color: string) => { g.fillStyle = color; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); };
  if (index === 0 || index === 2) {
    // Distributed nodes / on-chain primitives.
    const nodes = [[512, 280], [300, 180], [720, 175], [245, 350], [790, 355], [510, 410]];
    g.strokeStyle = accent; g.lineWidth = 2;
    nodes.slice(1).forEach(([x, y]) => { g.beginPath(); g.moveTo(512, 280); g.lineTo(x, y); g.stroke(); });
    nodes.forEach(([x, y], i) => { box(x - 49, y - 30, 98, 60, i ? '#27483d' : accent); g.fillStyle = i ? ink : '#14221f'; g.font = `400 22px ${fonts.mono}`; g.textAlign = 'center'; g.fillText(index === 0 ? ['AI', 'API', 'BOT', 'WEB', 'DATA', 'CHAIN'][i] : ['RWA', 'ASSET', 'RISK', 'CDS', 'VAULT', 'CHAIN'][i], x, y + 8); });
  } else if (index === 1) {
    box(245, 146, 540, 286, '#fffaf0');
    g.fillStyle = ink; g.font = `300 72px ${fonts.sans}`; g.fillText('Ideas, shared.', 280, 232);
    line(280, 265, 395); line(280, 282, 330); line(280, 299, 370);
    for (let i = 0; i < 3; i++) box(280 + i * 151, 337, 131, 61, ['#a7b59f', '#dec0a9', '#b5b9cc'][i]);
  } else if (index === 3) {
    g.fillStyle = '#2b352c'; g.font = `300 122px ${fonts.sans}`; g.fillText('ZENQOR', 70, 325);
    g.strokeStyle = '#8a9979'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(800, 278, 70 + i * 6, 115 + i * 5, -0.3, 0, Math.PI * 2); g.stroke(); }
  } else if (index === 4) {
    [0, 1, 2].forEach((i) => { g.save(); g.translate(340 + i * 110, 280); g.rotate((i - 1) * 0.12); box(-115, -135, 230, 270, i === 2 ? '#fff' : '#c7d1dc'); g.fillStyle = '#293b52'; g.font = `500 20px ${fonts.mono}`; g.fillText('INVOICE', -87, -85); for (let j = 0; j < 6; j++) line(-87, -44 + j * 23, 166 - (j % 2) * 32); box(-87, 95, 166, 5, '#798f73'); g.restore(); });
  } else if (index === 5) {
    g.strokeStyle = '#ae96ff'; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(512, 282, 90 + i * 19, 100 + i * 9, 0.35, 0, Math.PI * 2); g.stroke(); }
    box(451, 247, 122, 89, '#bca6f0'); g.fillStyle = '#342156'; g.font = `400 52px ${fonts.sans}`; g.textAlign = 'center'; g.fillText('V', 512, 310);
  } else {
    for (let i = 0; i < 3; i++) { box(181 + i * 230, 175 + (i % 2) * 45, 205, 205, ['#475b74', '#527b71', '#805f6c'][i]); g.fillStyle = '#ffffff65'; g.beginPath(); g.arc(283 + i * 230, 248 + (i % 2) * 45, 31, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(283 + i * 230, 321 + (i % 2) * 45, 58, 38, 0, Math.PI, Math.PI * 2); g.fill(); }
  }
  g.textAlign = 'left'; g.fillStyle = ink; g.font = `400 20px ${fonts.mono}`;
  g.fillText(`SELECTED WORK / ${String(index + 1).padStart(2, '0')}`, 48, 57);
  g.textAlign = 'right'; g.fillText(`${String(index + 1).padStart(2, '0')} — ${String(total).padStart(2, '0')}`, 976, 57);
  g.textAlign = 'left'; g.font = `400 ${p.name.length > 32 ? 36 : 48}px ${fonts.sans}`;
  g.fillText(p.name, 48, 526, 928);
  g.font = `400 19px ${fonts.mono}`; g.globalAlpha = 0.65; g.fillText(p.tech.slice(0, 4).join('  /  '), 48, 577, 920); g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}
