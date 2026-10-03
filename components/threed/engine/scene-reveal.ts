import * as THREE from 'three';

/** Fade the terrain and emissive vegetation as one scene, including custom shaders. */
export function makeSceneReveal(group: THREE.Group, shared: Set<THREE.Material>) {
  const amount = { value: 0 };
  const scoped = new Map<THREE.Material, THREE.Material>();
  const wrap = (original: THREE.Material) => {
    const existing = scoped.get(original);
    if (existing) return existing;
    // The grove's stone is also used by the opening asteroids. Keep their visibility independent.
    const material = shared.has(original) ? original.clone() : original;
    const compile = original.onBeforeCompile;
    const key = original.customProgramCacheKey();
    material.onBeforeCompile = (shader, renderer) => {
      compile.call(material, shader, renderer);
      shader.uniforms.uSceneReveal = amount;
      shader.fragmentShader = 'uniform float uSceneReveal;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(/}\s*$/, 'gl_FragColor.a *= uSceneReveal;\n}');
    };
    material.customProgramCacheKey = () => key + '-scene-reveal-v1';
    material.transparent = true;
    material.needsUpdate = true;
    scoped.set(original, material);
    return material;
  };
  group.traverse(object => {
    const renderable = object as THREE.Mesh;
    if (!renderable.material) return;
    renderable.material = Array.isArray(renderable.material) ? renderable.material.map(wrap) : wrap(renderable.material);
  });
  return amount;
}
