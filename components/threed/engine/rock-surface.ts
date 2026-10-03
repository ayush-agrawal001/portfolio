import * as THREE from 'three';

/** One continuous island: the terrain and its exposed rock share the same irregular edge. */
export function makeRockSurface(height: (x: number, z: number) => number, surface: THREE.Material, stone: THREE.Material) {
  const group = new THREE.Group();
  const segments = 96;
  const rings = 48;
  const edge = (a: number) => 1 + Math.sin(a * 5 + 0.8) * 0.055 + Math.sin(a * 11) * 0.025;
  const vertices: number[] = [], indices: number[] = [];
  for (let ring = 0; ring <= rings; ring++) {
    for (let j = 0; j <= segments; j++) {
      const a = j / segments * Math.PI * 2;
      const radius = ring / rings * edge(a);
      const x = Math.cos(a) * 70 * radius, z = Math.sin(a) * 90 * radius;
      vertices.push(x, height(x, z), z);
      if (ring < rings && j < segments) {
        const k = ring * (segments + 1) + j, n = k + segments + 1;
        indices.push(k, k + 1, n, k + 1, n + 1, n);
      }
    }
  }
  const top = new THREE.BufferGeometry();
  top.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  top.setIndex(indices); top.computeVertexNormals();
  group.add(new THREE.Mesh(top, surface));

  const rock: number[] = [], faces: number[] = [];
  const profile = [[1, 0], [1.02, -10], [0.88, -28], [0.62, -47], [0.22, -64], [0, -69]];
  for (let ring = 0; ring < profile.length; ring++) {
    for (let j = 0; j <= segments; j++) {
      const a = j / segments * Math.PI * 2;
      const [scale, y] = profile[ring];
      const radius = edge(a) * scale;
      const x = Math.cos(a) * 70 * radius, z = Math.sin(a) * 90 * radius;
      const ridge = ring === 0 ? height(x, z) - 0.04 : Math.sin(a * 9 + ring) * 2.3 * scale;
      rock.push(x, y + ridge, z);
      if (ring < profile.length - 1 && j < segments) {
        const k = ring * (segments + 1) + j, n = k + segments + 1;
        faces.push(k, k + 1, n, k + 1, n + 1, n);
      }
    }
  }
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.Float32BufferAttribute(rock, 3));
  base.setIndex(faces); base.computeVertexNormals();
  group.add(new THREE.Mesh(base, stone));
  return group;
}
