/** Value noise and layered noise for shaders. */
export const NOISE = /* glsl */ `
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x);
    float b = mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x);
    float c = mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x);
    float d = mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x);
    return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
  }
  float fbm3(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.02 + vec3(17.1, 3.7, 9.2); a *= 0.5; }
    return s;
  }
`;

/** three.js scene fog for hand-written materials. The vertex shader must define `mvPosition`. */
export const FOG_PARS_V = `#include <fog_pars_vertex>`;
export const FOG_V = `#include <fog_vertex>`;
export const FOG_PARS_F = `#include <fog_pars_fragment>`;
export const FOG_F = `#include <fog_fragment>`;
