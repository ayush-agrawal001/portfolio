import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createAudio } from './audio';
import { createAudioCues } from './audio-events';
import { paceApproach } from './approach-motion';
import { makeSceneReveal } from './scene-reveal';
import { loadCharacter } from './character';
import { blendLook, makeLook } from './looks';
import { clamp, damp, smooth } from './math';
import { Post, type PostParams } from './post';
import { buildWorld, type PanelInfo } from './scenes';
import { buildStory } from './shots';
import { G, LightRig, makeDust, makeSky, makeSpark, makeThread, stoneMaterial, type Quality } from './world';

/** Scroll distance given to each shot, in viewport heights. */
const VH_PER_SHOT = 48;

export type EngineOptions = {
  /** The canvas is created inside this element. */
  mount: HTMLElement;
  /** The tall empty element whose height is the length of the film. */
  scroll: HTMLElement;
  footer: HTMLElement;
  /** Elements the engine moves every frame. Writing to them directly keeps React out of the render loop. */
  els: { intro: HTMLElement; finale: HTMLElement; cue: HTMLElement; railFill: HTMLElement; chapter: HTMLElement; labels: HTMLElement[] };
  panels: PanelInfo[];
  chapterCount: number;
  onProgress: (p: number) => void;
  /** The chapter whose title should be showing, or -1 between chapters. */
  onChapter: (index: number) => void;
  /** The chapter number for the counter in the header: 0 on the intro. */
  onCount: (n: number) => void;
  onPanel: (index: number, hot: boolean) => void;
  onOpen: (index: number) => void;
  onSound: (on: boolean) => void;
  onFooter: (on: boolean) => void;
};

function pickQuality(): Quality {
  const q = new URLSearchParams(location.search).get('q');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 700;
  if (q === 'low' || (coarse && small)) return { name: 'low', maxDpr: 1, msaa: 0, dust: 2500, stalks: 170, leaves: 1400, lanterns: 200, dofRadius: 7 };
  if (q === 'high') return { name: 'high', maxDpr: 2, msaa: 4, dust: 10000, stalks: 360, leaves: 4200, lanterns: 520, dofRadius: 11 };
  return { name: 'med', maxDpr: 1.5, msaa: 4, dust: 7000, stalks: 300, leaves: 3200, lanterns: 400, dofRadius: 10 };
}

export async function createEngine(o: EngineOptions) {
  const quality = pickQuality();
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  o.mount.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0x000000, 0.01);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 5000);
  scene.add(camera);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();

  o.onProgress(0.15);
  await document.fonts.ready.catch(() => undefined);
  const css = getComputedStyle(document.documentElement);
  const fonts = {
    sans: `${css.getPropertyValue('--font-geist').trim() || 'system-ui'}, system-ui, sans-serif`,
    mono: `${css.getPropertyValue('--font-geist-mono').trim() || 'ui-monospace'}, ui-monospace, monospace`,
  };
  // the panel textures are drawn once, so the faces they use have to be loaded first
  await Promise.all([document.fonts.load(`300 86px ${fonts.sans}`), document.fonts.load(`500 28px ${fonts.mono}`)]).catch(() => undefined);
  o.onProgress(0.3);

  const post = new Post(renderer, { samples: quality.msaa, dofRadius: quality.dofRadius });
  const rig = new LightRig(scene);
  const sky = makeSky();
  scene.add(sky.mesh);
  const dust = makeDust(quality.dust);
  scene.add(dust.points);

  const world = buildWorld({ quality, stone: stoneMaterial(), fonts, panels: o.panels, onPanel: o.onPanel });
  const chapters = world.chapters;
  for (const c of chapters) scene.add(c.group);
  const sharedMaterials = new Set<THREE.Material>();
  for (const c of chapters) if (c.index !== 1) c.group.traverse(object => {
    const material = (object as THREE.Mesh).material;
    if (material) (Array.isArray(material) ? material : [material]).forEach(m => sharedMaterials.add(m));
  });
  const groveReveal = makeSceneReveal(chapters[1].group, sharedMaterials);
  (sky.mesh.material as THREE.ShaderMaterial).uniforms.uSunDir.value.copy(world.frame.sunDir);

  const thread = makeThread(chapters.flatMap((c) => c.thread));
  scene.add(thread.mesh);
  const spark = makeSpark();
  scene.add(spark.group);
  const hero = await loadCharacter();
  scene.add(hero.group);
  const story = buildStory(world, thread);
  o.onProgress(0.55);

  const audio = createAudio(o.onSound);
  const cue = createAudioCues();
  const threadTouches = thread.curve.getPoints(1400);
  let nextTouchCheck = 0;
  let onThread = false;

  /* ── input ── */
  const abort = new AbortController();
  const on = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, opts: AddEventListenerOptions = {}) =>
    addEventListener(type, fn, { signal: abort.signal, ...opts });

  const pointer = new THREE.Vector2();
  const pointerFast = new THREE.Vector2();
  let pointerMoved = false;
  let pluck = 0;
  let scrollTarget = 0;
  let scroll = 0;
  let footerAmt = 0;
  let modal = false;
  const storyMax = () => Math.max(1, o.scroll.offsetHeight - innerHeight);
  const readScroll = () => {
    const max = storyMax();
    scrollTarget = clamp(scrollY / max);
    footerAmt = clamp((scrollY - max) / Math.max(1, o.footer.offsetHeight));
  };
  on('scroll', readScroll, { passive: true });
  on('pointermove', (e) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    // moving the pointer plucks the thread: the faster, the harder
    const moved = Math.hypot(e.movementX / innerWidth, e.movementY / innerHeight);
    pluck = Math.min(1, pluck + moved * 2.4);
    pointerMoved = true;
  }, { passive: true });
  on('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (modal || target?.closest('a, button, footer, [data-ui]')) return;
    const k = world.work.hovered();
    if (world.work.chapter.group.visible && k >= 0) o.onOpen(k);
  });
  on('pointerdown', (e) => {
    if (modal || (e.target as HTMLElement | null)?.closest('a, button, footer, [data-ui]')) return;
    pointer.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2);
    raycaster.setFromCamera(pointer, camera);
    if (thread.mesh.visible && raycaster.intersectObject(thread.mesh).length) {
      audio.sfx('pluck', pointer.x, 1); pluck = 1; return;
    }
    const targets: THREE.Object3D[] = [];
    for (const chapter of chapters) {
      if (!chapter.group.visible) continue;
      chapter.group.traverseVisible((object) => {
        const m = object as THREE.Mesh;
        if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || m.geometry.type === 'PlaneGeometry') return;
        targets.push(m);
      });
    }
    if (hero.group.visible) targets.push(hero.group);
    if (raycaster.intersectObjects(targets, true).some(hit => hit.distance < 90)) audio.sfx('touch', pointer.x);
  }, { passive: true });

  /* ── size ── */
  let dpr = Math.min(devicePixelRatio, quality.maxDpr);
  const bufferSize = new THREE.Vector2();
  const resize = () => {
    // a hidden or collapsed window reports no size; keep the last buffers rather than making empty ones
    if (innerWidth < 2 || innerHeight < 2) return;
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.getDrawingBufferSize(bufferSize);
    post.setSize(bufferSize.x, bufferSize.y);
    camera.aspect = innerWidth / innerHeight;
    G.uPixelRatio.value = dpr;
    o.scroll.style.height = `${story.count * VH_PER_SHOT}vh`;
    readScroll();
  };
  on('resize', resize);
  resize();

  /* ── per-frame state ── */
  const st = story.createState();
  const look = makeLook();
  const raycaster = new THREE.Raycaster();
  const chasePos = new THREE.Vector3();
  const chaseLook = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const lastPos = new THREE.Vector3();
  const sparkPos = new THREE.Vector3();
  const corePos = new THREE.Vector3();
  const coreQuat = new THREE.Quaternion();
  const rail = { pos: new THREE.Vector3(), forward: new THREE.Vector3(), side: new THREE.Vector3(), up: new THREE.Vector3() };
  const railAhead = { pos: new THREE.Vector3(), forward: new THREE.Vector3(), side: new THREE.Vector3(), up: new THREE.Vector3() };
  const flyPos = new THREE.Vector3();
  const midPos = new THREE.Vector3();
  const axisX = new THREE.Vector3(), axisY = new THREE.Vector3(), axisZ = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  const flyQuat = new THREE.Quaternion(), bankQuat = new THREE.Quaternion();
  let bank = 0;
  const coreEuler = new THREE.Euler();
  const coreCenter = world.work.chapter.w(world.work.center.x, world.work.center.y, world.work.center.z);
  const proj = new THREE.Vector3();
  const params: PostParams = {
    focus: 10, aperture: 5, threshold: 1, bloom: 1, streak: 0.3, streakTint: new THREE.Color(), lens: 0.05, ca: 0.003, warp: 0, rush: 0,
    exposure: 1, contrast: 1, saturation: 1, vignette: 0.5, grain: 0.06, flash: 0, flashColor: new THREE.Color(), tint: new THREE.Vector3(1, 1, 1),
    lift: new THREE.Vector3(), time: 0,
  };
  // pointer parallax runs on a spring, so the camera has a little weight
  const sway = { x: 0, y: 0, vx: 0, vy: 0 };
  let time = 0;
  let speed = 0;
  let focus = 20;
  let chapterShown = -2;
  let countShown = -1;
  let footerShown = false;
  let cueText = '';

  // shot positions where the camera crosses from one chapter into the next
  const seams: number[] = [];
  {
    const probe = story.createState();
    let prev = -1;
    for (let s = 0; s <= story.count - 1; s += 0.02) {
      const f = Math.round(story.sample(s, probe).f);
      if (prev >= 0 && f !== prev) seams.push(s);
      prev = f;
    }
  }
  const seamAt = (s: number) => seams.reduce((m, x) => Math.max(m, Math.exp(-(((s - x) / 0.3) ** 2))), 0);

  const visible = (index: number, f: number) =>
    index >= 5 ? f > 4.2 : f > (index === 1 ? 0.24 : index - 0.85) && f < index + 0.85 + chapters[index].linger;

  function frame(dt: number) {
    time += motionPreference.matches ? 0 : dt;
    G.uTime.value = time;
    const prevScroll = scroll;
    scroll = motionPreference.matches ? scrollTarget : damp(scroll, scrollTarget, 2.6, dt);
    if (!motionPreference.matches) scroll = paceApproach(prevScroll * (story.count - 1), scroll * (story.count - 1), story.starts[1], dt) / (story.count - 1);
    if (Math.abs(scroll - scrollTarget) < 1e-6) scroll = scrollTarget;
    const scrollV = (Math.abs(scroll - prevScroll) / Math.max(dt, 1e-4)) * story.count * 0.12;
    pointerFast.x = damp(pointerFast.x, pointer.x, 14, dt);
    pointerFast.y = damp(pointerFast.y, pointer.y, 14, dt);
    pluck = damp(pluck, 0, 1.6, dt);

    const s = scroll * (story.count - 1);
    story.sample(s, st);
    if (motionPreference.matches) {
      st.par = 0;
      st.roll = 0;
      st.flash = 0;
    }
    const f = st.f;

    // the camera: the shot list, handed over to the chase camera while riding the thread
    if (st.fly > 0.001) {
      thread.chase(st.L, st, chasePos, chaseLook);
      const k = smooth(0, 1, st.fly);
      st.pos.lerp(chasePos, k);
      st.look.lerp(chaseLook, k);
    }
    for (const c of chapters) {
      if (c.floorAt && visible(c.index, f)) st.pos.y = Math.max(st.pos.y, c.floorAt(st.pos));
    }
    const stiffness = 16;
    const damping = 2 * Math.sqrt(stiffness);
    const steps = Math.max(1, Math.ceil(dt * 240));
    for (let i = 0; i < steps; i++) {
      const h = dt / steps;
      sway.vx += ((pointer.x - sway.x) * stiffness - sway.vx * damping) * h;
      sway.vy += ((pointer.y - sway.y) * stiffness - sway.vy * damping) * h;
      sway.x += sway.vx * h;
      sway.y += sway.vy * h;
    }
    fwd.subVectors(st.look, st.pos).normalize();
    right.crossVectors(fwd, camera.up.set(0, 1, 0)).normalize();
    up.crossVectors(right, fwd);
    camPos.copy(st.pos).addScaledVector(right, sway.x * st.par).addScaledVector(up, sway.y * st.par * 0.55);
    camera.position.copy(camPos);
    camera.lookAt(st.look);
    camera.rotateY(motionPreference.matches ? 0 : -sway.x * 0.04);
    camera.rotateX(motionPreference.matches ? 0 : sway.y * 0.024);
    camera.rotateZ(st.roll);
    // on a tall screen, widen the lens so the subject still fits
    const widen = Math.sqrt(Math.max(1, 1.5 / camera.aspect));
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(st.fov) / 2) * widen));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    G.uProjScale.value = bufferSize.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

    speed = damp(speed, Math.min(200, camPos.distanceTo(lastPos) / Math.max(dt, 1e-4)), 4, dt);
    lastPos.copy(camPos);

    // the look
    blendLook(f, look);
    fog.color.copy(look.fogColor);
    fog.density = look.fogDensity;
    scene.environmentIntensity = look.env;
    sky.update(look);
    rig.update(f, chapters, look, camera);
    dust.uniforms.uCam.value.copy(camera.position);
    dust.uniforms.uColor.value.copy(look.dust);
    // dust is what the speed blur has to work with between chapters, so there is more of it then
    dust.uniforms.uAmt.value = look.dustAmt * (1 + G.uRush.value * 3);
    dust.uniforms.uSize.value = look.dustSize;

    // the chapters
    // Reveal the whole rock and its vegetation together, only during the nearby approach.
    // Scroll gating keeps it hidden throughout the opening, including pointer parallax.
    groveReveal.value = smooth(0.24, 0.52, f) * (1 - smooth(108, 156, camPos.distanceTo(chapters[1].origin)));
    raycaster.setFromCamera(pointerFast, camera);
    G.uRayO.value.copy(raycaster.ray.origin);
    G.uRayD.value.copy(raycaster.ray.direction);
    G.uPluck.value = pluck;
    if (pointerMoved && !modal && time > nextTouchCheck) {
      nextTouchCheck = time + 0.07;
      const touching = thread.mesh.visible && pluck > 0.015 && threadTouches.some(p =>
        p.distanceToSquared(camera.position) < 6400 && raycaster.ray.distanceSqToPoint(p) < 0.12);
      if (touching && !onThread) audio.sfx('pluck', pointer.x, Math.min(1, 0.4 + pluck));
      onThread = touching;
    }
    for (const c of chapters) {
      const show = visible(c.index, f) && (c.index !== 1 || groveReveal.value > 0.001);
      if (c.group.visible && !show) c.onHide?.();
      c.group.visible = show;
      if (show) c.update({ t: time, dt, f, s, pluck, camera, raycaster, pointerMoved, modal, look });
    }

    // the spark, and how much of the thread is lit
    const sparkOn = smooth(2.4, 2.9, f);
    const crack = smooth(story.marks.hatch + 0.1, story.marks.crack, s);
    const burst = smooth(story.marks.crack, story.marks.burst, s);
    const awake = smooth(story.marks.burst - 0.15, story.marks.wake + 0.3, s);
    const emerge = smooth(story.marks.wake, story.marks.stand, s);
    const go = smooth(story.marks.leave, story.marks.leave + 1, s);
    world.work.egg.update(crack, burst, 0, awake, go);
    // Give the hatch a clear silhouette; the red thread returns for takeoff.
    thread.uniforms.uGain.value = 1 - smooth(story.marks.hatch - 0.4, story.marks.hatch + 0.2, s) * (1 - smooth(story.marks.leave, story.marks.leave + 0.7, s));
    thread.mesh.visible = thread.uniforms.uGain.value > 0.001;
    thread.at(st.L, sparkPos);
    spark.group.position.copy(sparkPos);
    spark.group.visible = sparkOn > 0.01 && (burst < 0.05 || go > 0.01);
    // held small and dim while he sleeps round it, so it lights him rather than hiding him
    spark.group.scale.setScalar(0.45 + 0.25 * go);
    spark.uniforms.uAmt.value = sparkOn * (0.1 + 0.28 * go);
    spark.light.intensity = sparkOn * (0.7 + go * 10);
    (spark.core.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.75, 0.6).multiplyScalar(1.4 + go * 3.6);
    thread.uniforms.uHeadAmt.value = 0.3 + go * 2.2;
    const head = sparkOn > 0.5 ? st.L + 0.05 : thread.nearest(camera.position) + 2.2;
    thread.uniforms.uHead.value = thread.arc(head);

    // Stand at the centre until takeoff, then remain visible across every flight chapter.
    hero.group.visible = sparkOn > 0.01 && (world.work.chapter.group.visible || go > 0);
    if (hero.group.visible) {
      const asleep = 1 - awake;
      corePos.copy(coreCenter);
      // The egg sits on a platform at centre.y - 1.75. His hips finish 0.94 above it.
      corePos.y += -0.15 * asleep - 0.81 * awake;
      coreEuler.set(0.3 * asleep, Math.sin(time * 0.2) * 0.7 * asleep, 0.18 * asleep);
      coreQuat.setFromEuler(coreEuler);
      hero.group.position.copy(corePos);
      hero.group.quaternion.copy(coreQuat);

      if (go > 0) {
        thread.frame(st.L, rail);
        thread.frame(st.L + 0.5, railAhead);
        flyPos.copy(rail.pos)
          .addScaledVector(rail.forward, -2.3)
          .addScaledVector(rail.up, 0.6 + Math.sin(time * 1.1) * 0.08)
          .addScaledVector(rail.side, Math.sin(time * 0.7) * 0.18);
        // Head along the thread, chest facing down, with a slight lift and bank into turns.
        axisY.copy(rail.forward).multiplyScalar(Math.cos(0.12)).addScaledVector(rail.up, Math.sin(0.12)).normalize();
        axisZ.copy(rail.up).addScaledVector(axisY, -rail.up.dot(axisY)).normalize().negate();
        axisX.crossVectors(axisY, axisZ);
        flyQuat.setFromRotationMatrix(basis.makeBasis(axisX, axisY, axisZ));
        bank = damp(bank, clamp(-railAhead.forward.dot(rail.side) * 1.6, -0.7, 0.7), 2.2, dt);
        flyQuat.premultiply(bankQuat.setFromAxisAngle(axisY, bank));
        // Lift clear of the shell before joining the camera's thread path.
        midPos.copy(corePos).lerp(flyPos, 0.35);
        midPos.y = Math.max(corePos.y, flyPos.y) + 1.2;
        hero.group.position.set(0, 0, 0)
          .addScaledVector(corePos, (1 - go) ** 2)
          .addScaledVector(midPos, 2 * (1 - go) * go)
          .addScaledVector(flyPos, go ** 2);
        hero.group.quaternion.slerpQuaternions(coreQuat, flyQuat, smooth(0.1, 0.9, go));
      }
      hero.update({ t: time, dt, awake, emerge, go, camera });
    }

    // Keep the flying character sharp while the camera follows him through the scenes.
    const target = st.fly > 0.5 ? hero.group.position.distanceTo(camPos) : st.look.distanceTo(camPos);
    focus = damp(focus, Math.max(0.5, target), 5, dt);

    // Keep the long rock approach clear and steady, including its landing.
    const approach = smooth(3, 4, s) * (1 - smooth(story.starts[1], story.starts[1] + 1, s));
    const seam = seamAt(s) * (1 - approach);
    params.focus = focus;
    params.aperture = look.aperture * (1 - st.fly * 0.95) * (1 + seam * 1.5);
    params.threshold = look.threshold;
    params.bloom = look.bloom;
    params.streak = look.streak;
    params.streakTint.copy(look.streakTint);
    params.lens = look.lens - seam * 0.4;
    params.ca = look.ca + seam * 0.016 + st.flash * 0.004 + Math.min(1, speed / 80) * 0.003;
    params.warp = motionPreference.matches ? 0 : seam * 0.65;
    // between chapters the camera covers a lot of ground quickly: smear the picture and let the thread shiver
    const rush = clamp(seam * 0.85 + smooth(30, 110, speed) * 0.5) * (1 - st.fly * 0.6);
    params.rush = motionPreference.matches ? 0 : rush * (1 - approach);
    G.uRush.value = rush;
    params.exposure = look.exposure;
    params.contrast = look.contrast;
    params.saturation = look.saturation;
    params.vignette = look.vignette;
    params.grain = look.grain;
    params.flash = st.flash + footerAmt * 0.06;
    params.flashColor.copy(st.flashColor);
    params.tint.copy(look.tint);
    params.lift.copy(look.lift);
    params.time = time;
    post.render(scene, camera, params);

    audio.update({ f, scrollV, seam, flash: st.flash, fly: st.fly, speed, footer: footerAmt, modal });
    if (cue('gate', st.flash, f < 3 ? 0.055 : 0.26)) audio.sfx('gate');
    if (cue('seam', seam)) audio.sfx('seam');
    if (cue('crack', crack, 0.45)) audio.sfx('crack');
    if (cue('shell', burst, 0.3)) audio.sfx('crack');
    if (cue('takeoff', go, 0.2)) audio.sfx('ignite');

    /* ── the page ── */
    const intro = 1 - smooth(0.05, 0.7, s);
    o.els.intro.style.opacity = String(intro);
    o.els.intro.style.filter = intro < 0.99 ? `blur(${((1 - intro) * 10).toFixed(1)}px)` : '';
    o.els.intro.style.visibility = intro < 0.01 ? 'hidden' : 'visible';
    const finale = smooth(5.55, 5.95, st.f) * (1 - smooth(0, 0.35, footerAmt));
    o.els.finale.style.opacity = String(finale);
    o.els.finale.style.visibility = finale < 0.01 ? 'hidden' : 'visible';
    const hatchCloseup = s > story.marks.hatch - 0.5 && s < story.marks.leave + 0.7;
    const nextCue = hatchCloseup ? (burst < 0.95 ? 'Scroll to hatch ↓' : emerge < 0.95 ? 'Scroll to emerge ↓' : 'Keep following the thread ↓') : 'Scroll to explore ↓';
    if (nextCue !== cueText) { cueText = nextCue; o.els.cue.textContent = cueText; }
    o.els.cue.style.opacity = String(hatchCloseup ? 1 : Math.max(0, intro * 1.4 - 0.4));
    o.els.railFill.style.transform = `scaleY(${scroll.toFixed(4)})`;

    const near = Math.round(f);
    const titled = !hatchCloseup && approach < 0.1 && Math.abs(f - near) < 0.34 && near < o.chapterCount && intro < 0.5 && footerAmt < 0.15 ? near : -1;
    if (titled !== chapterShown) {
      chapterShown = titled;
      o.onChapter(titled);
      if (titled >= 0) audio.sfx('title');
    }
    const count = intro > 0.5 ? 0 : clamp(near + 1, 1, o.chapterCount);
    if (count !== countShown) {
      countShown = count;
      o.onCount(count);
    }
    const footerOn = footerAmt > 0.1;
    if (footerOn !== footerShown) {
      footerShown = footerOn;
      o.onFooter(footerOn);
    }

    world.anchors.forEach((a, i) => {
      const el = o.els.labels[i];
      if (!el) return;
      // a label belongs to something nearby: far off, several would pile up on one spot
      const w = clamp(1 - Math.abs(f - a.chapter) * 2.6) * (1 - footerAmt) * smooth(46, 30, a.p.distanceTo(camPos));
      proj.copy(a.p).project(camera);
      const shown = w > 0.01 && proj.z < 1 && Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1;
      el.style.opacity = shown ? String(w) : '0';
      if (shown) el.style.transform = `translate3d(${((proj.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-proj.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px, 0)`;
    });
  }

  /* ── loop ── */
  let raf = 0;
  let before = performance.now();
  let slowT = 0;
  let slowN = 0;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(Math.max(0, (now - before) / 1000), 1 / 20);
    before = now;
    frame(dt);
    // every two seconds, trade resolution for frame rate or give it back
    slowT += dt;
    slowN++;
    if (slowT > 2) {
      const avg = slowT / slowN;
      const top = Math.min(devicePixelRatio, quality.maxDpr);
      const floor = Math.min(1, top);
      if (avg > 1 / 36 && dpr > floor) {
        dpr = Math.max(floor, dpr - 0.1);
        resize();
      } else if (avg < 1 / 55 && dpr < top) {
        dpr = Math.min(top, dpr + 0.2);
        resize();
      }
      slowT = 0;
      slowN = 0;
    }
  };

  // compile every material up front, so nothing stutters the first time a chapter comes into view
  for (const c of chapters) c.group.visible = true;
  story.sample(0, st);
  camera.position.copy(st.pos);
  camera.lookAt(st.look);
  await renderer.compileAsync(scene, camera).catch(() => undefined);
  o.onProgress(0.85);
  frame(1 / 60);
  o.onProgress(1);
  raf = requestAnimationFrame(tick);

  const jumpTo = (shot: number, behavior: ScrollBehavior = 'smooth') =>
    scrollTo({ top: (shot / (story.count - 1)) * storyMax(), behavior: motionPreference.matches ? 'instant' : behavior });

  return {
    audio,
    /** Scroll positions of the chapter starts, 0 to 1, for laying out the rail. */
    stops: story.starts.slice(0, o.chapterCount).map((i) => i / (story.count - 1)),
    /** Scroll to a chapter: 0 is the intro, 1 the first chapter. */
    jump(chapter: number) {
      jumpTo(chapter <= 0 ? 0 : (story.starts[chapter - 1] ?? 0) + 0.35);
    },
    hatch() {
      jumpTo(story.marks.hatch);
    },
    setModal(open: boolean) {
      modal = open;
    },
    /** For debugging: where the film is. */
    state: () => ({ shot: st.s, chapter: st.f, scroll, scrollTarget, dpr, quality: quality.name }),
    /** For debugging: run the film forward a number of frames at once, to let everything settle. */
    step(frames = 60) {
      for (let i = 0; i < frames; i++) frame(1 / 30);
    },
    /** For debugging: jump straight to a shot. */
    seek(shot: number) {
      jumpTo(shot, 'instant');
      readScroll();
      scroll = scrollTarget;
    },
    dispose() {
      cancelAnimationFrame(raf);
      abort.abort();
      audio.dispose();
      post.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const m of mats) {
          (m as THREE.MeshBasicMaterial).map?.dispose();
          m.dispose();
        }
      });
      scene.environment?.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
export type Engine = Awaited<ReturnType<typeof createEngine>>;
