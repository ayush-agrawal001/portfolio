import * as THREE from 'three';

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/** Depth of field: every pixel gathers its neighbours across a disc as wide as it is out of focus. */
const DOF_FRAG = /* glsl */ `
  uniform sampler2D tColor, tDepth;
  uniform vec2 uTexel;
  uniform float uNear, uFar, uFocus, uAperture, uMaxR;
  varying vec2 vUv;
  float dist(vec2 uv) {
    float d = texture2D(tDepth, uv).x;
    return (uNear * uFar) / (uFar - (uFar - uNear) * d);
  }
  // things nearer than the focus blur less than optics says they should, or the thread by the lens would vanish
  float coc(float z) { return clamp(uAperture * 1.2 * abs(1.0 / uFocus - 1.0 / z), 0.0, 1.0) * (z < uFocus ? 0.4 : 1.0); }
  void main() {
    float z0 = dist(vUv);
    float c0 = coc(z0);
    vec3 here = texture2D(tColor, vUv).rgb;
    here = min(max(here, vec3(0.0)), vec3(30.0));
    vec4 acc = vec4(here, 1.0);
    float blur = c0;
    // turn the sample pattern by a different amount at every pixel: the film grain hides noise, not a repeated pattern
    float turn = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2831853;
    const float N = 30.0;
    for (float i = 0.0; i < N; i++) {
      float r = sqrt((i + 0.5) / N);
      float a = i * 2.39996 + turn;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uMaxR * uTexel;
      float zs = dist(uv);
      float cs = coc(zs);
      // a blurred background must not smear over something sharp in front of it
      if (zs > z0) cs = min(cs, c0 * 2.0);
      float w = smoothstep(r - 0.15, r + 0.05, cs);
      vec3 tap = texture2D(tColor, uv).rgb;
      acc += vec4(min(max(tap, vec3(0.0)), vec3(30.0)) * w, w);
      blur += cs * w;
    }
    gl_FragColor = vec4(acc.rgb / acc.a, blur / acc.a);
  }
`;

const DOWN_FRAG = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uTexel;
  uniform float uThreshold, uKnee, uPrefilter;
  varying vec2 vUv;
  vec3 bright(vec3 c) {
    c = min(max(c, vec3(0.0)), vec3(40.0));
    float br = max(c.r, max(c.g, c.b));
    float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-4);
    return c * max(soft, br - uThreshold) / max(br, 1e-4);
  }
  void main() {
    vec3 sum = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 o = vec2(i == 0 || i == 2 ? -1.0 : 1.0, i < 2 ? -1.0 : 1.0);
      vec3 c = texture2D(tSrc, vUv + o * uTexel).rgb;
      float w = 1.0;
      if (uPrefilter > 0.5) {
        c = bright(c);
        // weigh down single very bright pixels so they do not flicker
        w = 1.0 / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722)));
      }
      sum += c * w;
      wsum += w;
    }
    gl_FragColor = vec4(sum / wsum, 1.0);
  }
`;

/** A soft 3x3 blur. Used to add the bloom levels back together, and to smooth the depth-of-field buffer. */
const TENT_FRAG = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec2 o = uTexel;
    vec4 c = texture2D(tSrc, vUv) * 4.0;
    c += (texture2D(tSrc, vUv + vec2(o.x, 0.0)) + texture2D(tSrc, vUv - vec2(o.x, 0.0))
        + texture2D(tSrc, vUv + vec2(0.0, o.y)) + texture2D(tSrc, vUv - vec2(0.0, o.y))) * 2.0;
    c += texture2D(tSrc, vUv + o) + texture2D(tSrc, vUv - o)
       + texture2D(tSrc, vUv + vec2(o.x, -o.y)) + texture2D(tSrc, vUv + vec2(-o.x, o.y));
    gl_FragColor = c / 16.0;
  }
`;

/** A wide horizontal blur of the highlights: the streak an anamorphic lens draws through a bright light. */
const STREAK_FRAG = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uTexel;
  uniform float uStep, uCut;
  varying vec2 vUv;
  // only the very hottest pixels streak: a light source, not a lit surface
  vec3 hot(vec2 uv) {
    vec3 c = texture2D(tSrc, uv).rgb;
    float m = max(c.r, max(c.g, c.b));
    return c * max(m - uCut, 0.0) / max(m, 1e-4);
  }
  void main() {
    vec3 c = hot(vUv) * 0.19;
    for (int i = 1; i <= 6; i++) {
      float w = 0.17 * exp(-float(i * i) * 0.09);
      vec2 o = vec2(float(i) * uStep * uTexel.x, 0.0);
      c += (hot(vUv + o) + hot(vUv - o)) * w;
    }
    gl_FragColor = vec4(c, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D tScene, tDof, tBloom, tStreak, tDepth;
  uniform float uNear, uFar, uFocus, uAperture;
  uniform float uTime, uLens, uCA, uWarp, uRush, uBloom, uStreak, uExposure, uContrast, uSaturation, uVignette, uGrain, uFlash;
  uniform vec3 uTint, uLift, uFlashColor, uStreakTint;
  varying vec2 vUv;
  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
  vec3 scene(vec2 uv) {
    vec3 s = texture2D(tScene, uv).rgb;
    // one broken pixel must not reach the screen
    s = min(max(s, vec3(0.0)), vec3(64.0));
    // How blurred this pixel should be comes from its own depth, at full sharpness. The blurred
    // buffer's own measure has been softened along with its colour, and using it lets a
    // far background smear over the edges of whatever is in focus.
    float z = (uNear * uFar) / (uFar - (uFar - uNear) * texture2D(tDepth, uv).x);
    float blur = clamp(uAperture * 1.2 * abs(1.0 / uFocus - 1.0 / z), 0.0, 1.0) * (z < uFocus ? 0.4 : 1.0);
    return mix(s, texture2D(tDof, uv).rgb, smoothstep(0.03, 0.3, blur));
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 d = vUv - 0.5;
    vec2 uv = 0.5 + d * (1.0 + uLens * dot(d, d)) / (1.0 + uLens * 0.5);
    uv += uWarp * 0.012 * vec2(sin(uv.y * 24.0 + uTime * 3.0), cos(uv.x * 20.0 - uTime * 2.5));
    vec2 dir = uv - 0.5;
    vec3 col;
    if (uRush > 0.004) {
      // Travelling fast, the picture smears outward from its centre. Each step along the smear is
      // weighted toward a different colour, so the streaks split into fringes as a lens would make them.
      vec3 sum = vec3(0.0);
      vec3 wsum = vec3(0.0);
      for (int i = 0; i < 9; i++) {
        float t = float(i) / 8.0;
        vec3 w = vec3(1.0 - t, 1.0 - abs(2.0 * t - 1.0), t) + 0.12;
        sum += scene(0.5 + dir * (1.0 - uRush * 0.34 * t)) * w;
        wsum += w;
      }
      col = sum / wsum;
    } else {
      col = vec3(scene(uv + dir * uCA).r, scene(uv).g, scene(uv - dir * uCA).b);
    }
    col += texture2D(tBloom, uv).rgb * uBloom;
    col += texture2D(tStreak, uv).rgb * uStreakTint * uStreak;
    col *= uExposure;
    col += uFlashColor * uFlash;
    col *= mix(1.0, smoothstep(0.95, 0.25, length(d * vec2(1.0, 0.85))), uVignette);
    col = pow(aces(col), vec3(1.0 / 2.2));
    col = (col - 0.5) * uContrast + 0.5 + uLift;
    col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSaturation) * uTint;
    col += (hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * uGrain;
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;

export type PostParams = {
  focus: number;
  aperture: number;
  threshold: number;
  bloom: number;
  streak: number;
  streakTint: THREE.Color;
  lens: number;
  ca: number;
  warp: number;
  /** How much the picture smears with speed, 0 to 1. */
  rush: number;
  exposure: number;
  contrast: number;
  saturation: number;
  vignette: number;
  grain: number;
  flash: number;
  flashColor: THREE.Color;
  tint: THREE.Vector3;
  lift: THREE.Vector3;
  time: number;
};

const BLOOM_LEVELS = 5;

function pass(fragmentShader: string, uniforms: Record<string, THREE.IUniform>, extra: THREE.ShaderMaterialParameters = {}) {
  return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false, ...extra });
}

/** Renders the scene to an HDR buffer, then depth of field, bloom, streaks and the final grade. */
export class Post {
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  private scene = new THREE.Scene();
  private rtScene: THREE.WebGLRenderTarget;
  private rtDof: THREE.WebGLRenderTarget;
  private rtDofSoft: THREE.WebGLRenderTarget;
  private bloom: THREE.WebGLRenderTarget[];
  private streakA: THREE.WebGLRenderTarget;
  private streakB: THREE.WebGLRenderTarget;
  private dofMat: THREE.ShaderMaterial;
  private downMat: THREE.ShaderMaterial;
  private upMat: THREE.ShaderMaterial;
  private softMat: THREE.ShaderMaterial;
  private streakMat: THREE.ShaderMaterial;
  private compMat: THREE.ShaderMaterial;
  private width = 4;
  private height = 4;

  constructor(private renderer: THREE.WebGLRenderer, { samples = 4, dofRadius = 10 } = {}) {
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    const opts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    };
    this.rtScene = new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: true, samples });
    this.rtScene.depthTexture = new THREE.DepthTexture(4, 4);
    this.rtDof = new THREE.WebGLRenderTarget(4, 4, opts);
    this.rtDofSoft = new THREE.WebGLRenderTarget(4, 4, opts);
    this.bloom = Array.from({ length: BLOOM_LEVELS }, () => new THREE.WebGLRenderTarget(4, 4, opts));
    this.streakA = new THREE.WebGLRenderTarget(4, 4, opts);
    this.streakB = new THREE.WebGLRenderTarget(4, 4, opts);

    this.dofMat = pass(DOF_FRAG, {
      tColor: { value: this.rtScene.texture },
      tDepth: { value: this.rtScene.depthTexture },
      uTexel: { value: new THREE.Vector2() },
      uNear: { value: 0.1 },
      uFar: { value: 1000 },
      uFocus: { value: 10 },
      uAperture: { value: 5 },
      uMaxR: { value: dofRadius },
    });
    this.downMat = pass(DOWN_FRAG, {
      tSrc: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uThreshold: { value: 1 },
      uKnee: { value: 0.5 },
      uPrefilter: { value: 0 },
    });
    this.upMat = pass(TENT_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } }, { blending: THREE.AdditiveBlending, transparent: true });
    this.softMat = pass(TENT_FRAG, { tSrc: { value: this.rtDof.texture }, uTexel: { value: new THREE.Vector2() } });
    this.streakMat = pass(STREAK_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uStep: { value: 1 }, uCut: { value: 0 } });
    this.compMat = pass(COMPOSITE_FRAG, {
      tScene: { value: this.rtScene.texture },
      tDof: { value: this.rtDofSoft.texture },
      tBloom: { value: this.bloom[0].texture },
      tStreak: { value: this.streakA.texture },
      tDepth: { value: this.rtScene.depthTexture },
      uNear: { value: 0.1 },
      uFar: { value: 1000 },
      uFocus: { value: 10 },
      uAperture: { value: 5 },
      uTime: { value: 0 },
      uLens: { value: 0.05 },
      uCA: { value: 0.003 },
      uWarp: { value: 0 },
      uRush: { value: 0 },
      uBloom: { value: 0.2 },
      uStreak: { value: 0.3 },
      uExposure: { value: 1 },
      uContrast: { value: 1 },
      uSaturation: { value: 1 },
      uVignette: { value: 0.5 },
      uGrain: { value: 0.06 },
      uFlash: { value: 0 },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uLift: { value: new THREE.Vector3() },
      uFlashColor: { value: new THREE.Color(1, 1, 1) },
      uStreakTint: { value: new THREE.Color(1, 0.4, 0.3) },
    });
  }

  setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.rtScene.setSize(w, h);
    let bw = Math.max(1, Math.ceil(w / 2));
    let bh = Math.max(1, Math.ceil(h / 2));
    this.rtDof.setSize(bw, bh);
    this.rtDofSoft.setSize(bw, bh);
    for (const rt of this.bloom) {
      rt.setSize(bw, bh);
      bw = Math.max(1, Math.ceil(bw / 2));
      bh = Math.max(1, Math.ceil(bh / 2));
    }
    this.streakA.setSize(this.bloom[2].width, this.bloom[2].height);
    this.streakB.setSize(this.bloom[2].width, this.bloom[2].height);
  }

  private draw(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, p: PostParams) {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(scene, camera);

    const dof = this.dofMat.uniforms;
    dof.uTexel.value.set(1 / this.rtDof.width, 1 / this.rtDof.height);
    dof.uNear.value = camera.near;
    dof.uFar.value = camera.far;
    dof.uFocus.value = p.focus;
    dof.uAperture.value = p.aperture;
    this.draw(this.dofMat, this.rtDof);
    // The gather uses few samples, so a small light comes out as a ring of dots. Three soft blurs,
    // back and forth between the two buffers, join the dots into a disc.
    const soft = this.softMat.uniforms;
    const hops: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget, number][] = [
      [this.rtDof, this.rtDofSoft, 1.4],
      [this.rtDofSoft, this.rtDof, 2.6],
      [this.rtDof, this.rtDofSoft, 1.2],
    ];
    for (const [from, to, radius] of hops) {
      soft.tSrc.value = from.texture;
      soft.uTexel.value.set(radius / from.width, radius / from.height);
      this.draw(this.softMat, to);
    }

    const down = this.downMat.uniforms;
    let src: THREE.WebGLRenderTarget = this.rtScene;
    for (let i = 0; i < this.bloom.length; i++) {
      down.tSrc.value = src.texture;
      down.uTexel.value.set(1 / src.width, 1 / src.height);
      down.uPrefilter.value = i === 0 ? 1 : 0;
      down.uThreshold.value = p.threshold;
      this.draw(this.downMat, this.bloom[i]);
      src = this.bloom[i];
    }

    const streak = this.streakMat.uniforms;
    streak.uTexel.value.set(1 / this.streakA.width, 1 / this.streakA.height);
    const steps: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget, number, number][] = [
      [this.bloom[2], this.streakA, 1, 2.2],
      [this.streakA, this.streakB, 3, 0],
      [this.streakB, this.streakA, 9, 0],
    ];
    for (const [from, to, step, cut] of steps) {
      streak.tSrc.value = from.texture;
      streak.uStep.value = step;
      streak.uCut.value = cut;
      this.draw(this.streakMat, to);
    }

    const up = this.upMat.uniforms;
    for (let i = this.bloom.length - 2; i >= 0; i--) {
      const from = this.bloom[i + 1];
      up.tSrc.value = from.texture;
      up.uTexel.value.set(1 / from.width, 1 / from.height);
      this.draw(this.upMat, this.bloom[i]);
    }

    const u = this.compMat.uniforms;
    u.uTime.value = p.time;
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    u.uFocus.value = p.focus;
    u.uAperture.value = p.aperture;
    u.uLens.value = p.lens;
    u.uCA.value = p.ca;
    u.uWarp.value = p.warp;
    u.uRush.value = p.rush;
    u.uBloom.value = p.bloom / this.bloom.length;
    u.uStreak.value = p.streak;
    u.uStreakTint.value.copy(p.streakTint);
    u.uExposure.value = p.exposure;
    u.uContrast.value = p.contrast;
    u.uSaturation.value = p.saturation;
    u.uVignette.value = p.vignette;
    u.uGrain.value = p.grain;
    u.uFlash.value = p.flash;
    u.uFlashColor.value.copy(p.flashColor);
    u.uTint.value.copy(p.tint);
    u.uLift.value.copy(p.lift);
    this.draw(this.compMat, null);
  }

  dispose() {
    for (const rt of [this.rtScene, this.rtDof, this.rtDofSoft, this.streakA, this.streakB, ...this.bloom]) rt.dispose();
    for (const m of [this.dofMat, this.downMat, this.upMat, this.softMat, this.streakMat, this.compMat]) m.dispose();
    this.quad.geometry.dispose();
  }
}
