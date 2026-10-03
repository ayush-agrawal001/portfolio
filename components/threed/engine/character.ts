import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { damp, lerp, smooth } from './math';

/** Original articulated young adult character. Rebuild with scripts/build-thread-character.mjs. */
const URL = '/models/thread-traveler.glb';

type Angles = [x: number, y: number, z: number];
type JointName =
  | 'chest' | 'head'
  | 'upperArmL' | 'forearmL' | 'handL' | 'upperArmR' | 'forearmR' | 'handR'
  | 'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR';
type Pose = Record<JointName, Angles>;

// Angles are in degrees, measured from a limb hanging straight down. The figure faces +z, and L is
// its +x side. Negative x swings a limb forward, positive x swings it back, and z lifts it out to the side.

/** Asleep in the core: knees up, arms round them, head down. */
const CURLED: Pose = {
  chest: [24, 0, 0], head: [22, 0, 0],
  upperArmL: [-58, 0, 10], forearmL: [-80, 0, -14], handL: [-8, 0, 0],
  upperArmR: [-54, 0, -10], forearmR: [-86, 0, 14], handR: [-8, 0, 0],
  thighL: [-98, 0, 6], shinL: [108, 0, 0], footL: [0, 0, 0],
  thighR: [-94, 0, -6], shinR: [104, 0, 0], footR: [0, 0, 0],
};

/** Standing with both feet planted after the shell opens. */
const AWAKE: Pose = {
  chest: [0, 0, 0], head: [0, 0, 0],
  upperArmL: [0, 0, 6], forearmL: [-8, 0, 0], handL: [0, 0, 0],
  upperArmR: [0, 0, -6], forearmR: [-8, 0, 0], handR: [0, 0, 0],
  thighL: [0, 0, 0], shinL: [0, 0, 0], footL: [0, 0, 0],
  thighR: [0, 0, 0], shinR: [0, 0, 0], footR: [0, 0, 0],
};

/** Flying: face down along the thread, one arm stretched out toward the light ahead. */
const FLY: Pose = {
  chest: [-8, 0, 0], head: [-28, 0, 0],
  upperArmL: [20, 0, 18], forearmL: [-18, 0, 0], handL: [-4, 0, 0],
  upperArmR: [-150, 0, -8], forearmR: [-12, 0, 0], handR: [-4, 0, 0],
  thighL: [10, 0, 5], shinL: [12, 0, 0], footL: [12, 0, 0],
  thighR: [-6, 0, -6], shinR: [30, 0, 0], footR: [10, 0, 0],
};

const JOINTS = Object.keys(AWAKE) as JointName[];
const RAD = Math.PI / 180;

export async function loadCharacter() {
  const group = new THREE.Group();
  group.name = 'character';
  const fill = new THREE.PointLight('#cfd6ff', 0, 7, 2);
  fill.position.set(0, 0.2, -1.7);
  group.add(fill);

  const rim = { uRim: { value: 0.3 }, uRimColor: { value: new THREE.Color('#ffb9a0') } };
  const gltf = await new GLTFLoader().loadAsync(URL);
  const root = gltf.scene;
  // The story moves and rotates the figure about his hips, not his feet.
  root.position.y = -0.94;
  group.add(root);
  const joints = {} as Record<JointName, THREE.Object3D>;
  for (const name of JOINTS) {
    const node = root.getObjectByName(name);
    if (!node) throw new Error('Character is missing joint: ' + name);
    joints[name] = node;
  }
  const materials = new Set<THREE.MeshStandardMaterial>();
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of list) {
      if (material instanceof THREE.MeshStandardMaterial) materials.add(material);
    }
  });
  for (const material of materials) {
    material.envMapIntensity = 0.65;
    // A restrained rim keeps the indigo clothing legible during the night flight.
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, rim);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uRim;\nuniform vec3 uRimColor;')
        .replace('#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uRimColor * uRim * pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 4.0);');
    };
    material.customProgramCacheKey = () => 'thread-traveler-rim-v1';
  }

  const pose = {} as Pose;
  for (const j of JOINTS) pose[j] = [0, 0, 0];
  const toCamera = new THREE.Vector3();
  let lookYaw = 0;
  let lookPitch = 0;

  /**
   * @param awake 0 curled up, 1 awake
   * @param go 0 at the core, 1 flying
   */
  function update({ t, dt, awake, emerge, go, camera }: { t: number; dt: number; awake: number; emerge: number; go: number; camera: THREE.Camera }) {
    for (const j of JOINTS) {
      for (let k = 0; k < 3; k++) pose[j][k] = lerp(lerp(CURLED[j][k], AWAKE[j][k], awake), FLY[j][k], go);
    }

    // breathing, and the slow drift of limbs with nothing to rest on
    const loose = 0.25 * (1 - awake) + go;
    pose.chest[0] += Math.sin(t * 1.3) * 1.4;
    for (const [side, phase] of [['L', 0], ['R', 1.9]] as const) {
      const s = (rate: number, shift: number, amount: number) => Math.sin(t * rate + phase + shift) * amount * loose;
      pose[`upperArm${side}`][0] += s(0.9, 0, 4);
      pose[`upperArm${side}`][2] += s(0.7, 0.9, 3) * (side === 'L' ? 1 : -1);
      pose[`forearm${side}`][0] += s(0.9, 1.3, 6);
      pose[`hand${side}`][0] += s(1.1, 2.2, 8);
      pose[`thigh${side}`][0] += s(0.8, 0.4, 3) + Math.sin(t * 2.3 + phase) * 4 * go;
      pose[`shin${side}`][0] += s(0.8, 1.5, 5);
    }

    // once awake, and until he leaves, he looks at whoever is looking at him, and waves
    const watch = smooth(0.45, 0.9, awake) * (1 - go);
    const wave = smooth(0.85, 1, emerge) * (1 - smooth(0, 0.3, go));
    // Independent shoulder and elbow pivots keep the wave clear of the jacket.
    const raised: Angles = [-4, 0, -34];
    const waving: Angles = [-6, 0, -112 + Math.sin(t * 6) * 16];
    for (let k = 0; k < 3; k++) {
      pose.upperArmR[k] = lerp(pose.upperArmR[k], raised[k], wave);
      pose.forearmR[k] = lerp(pose.forearmR[k], waving[k], wave);
    }
    joints.chest.worldToLocal(toCamera.copy(camera.position));
    toCamera.y -= 0.7;
    const yaw = THREE.MathUtils.clamp(Math.atan2(toCamera.x, toCamera.z), -0.5, 0.5);
    const pitch = THREE.MathUtils.clamp(-Math.atan2(toCamera.y, Math.hypot(toCamera.x, toCamera.z)), -0.35, 0.35);
    lookYaw = damp(lookYaw, yaw * watch, 4, dt);
    lookPitch = damp(lookPitch, pitch * watch, 4, dt);

    for (const j of JOINTS) joints[j].rotation.set(pose[j][0] * RAD, pose[j][1] * RAD, pose[j][2] * RAD);
    joints.head.rotation.x += lookPitch;
    joints.head.rotation.y += lookYaw;

    fill.intensity = 2 + go * 4;
    rim.uRim.value = 0.1 + go * 0.2;
  }

  return { group, update };
}
export type Character = Awaited<ReturnType<typeof loadCharacter>>;
