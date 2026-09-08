import * as THREE from 'three';
import './style.css';
import { FixedStepRuntime, RuntimeDiagnostics, RuntimeLifecycle } from '../packages/runtime/src/index';
import { KeyboardInput } from '../packages/input/src/index';
import { OrbitCameraRig } from '../packages/camera/src/index';
import { QualityController } from '../packages/renderer/src/index';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application root is missing');
const root = app;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111f);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
const cameraRig = new OrbitCameraRig({ radius: 6, elevation: 0.28 });
cameraRig.target.set(0, 0.8, 0);
cameraRig.applyTo(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xa8c7ff, 0x182033, 2));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(3, 5, 4);
scene.add(keyLight);

const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(2.4, 2.4, 0.25, 48),
  new THREE.MeshStandardMaterial({ color: 0x263c59, metalness: 0.35, roughness: 0.6 }),
);
platform.position.y = -0.15;
scene.add(platform);

const forge = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.85, 2),
  new THREE.MeshStandardMaterial({ color: 0x4ee6c1, emissive: 0x103d3a, emissiveIntensity: 1.5, roughness: 0.3 }),
);
forge.position.y = 1;
scene.add(forge);

const status = document.createElement('pre');
status.className = 'status';
status.textContent = 'ThreeGameForge runtime booting…';
root.appendChild(status);
const lifecycle = new RuntimeLifecycle();
const diagnostics = new RuntimeDiagnostics();
const quality = new QualityController();
lifecycle.start();
const input = new KeyboardInput([
  { action: 'rotate-left', code: 'ArrowLeft' },
  { action: 'rotate-right', code: 'ArrowRight' },
]);

function resize(): void {
  const width = root.clientWidth || window.innerWidth;
  const height = root.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

const runtime = new FixedStepRuntime(
  (dt) => {
    const direction = Number(input.isPressed('rotate-right')) - Number(input.isPressed('rotate-left'));
    forge.rotation.y += dt * (0.8 + direction * 1.6);
    cameraRig.rotate(direction * dt * 0.8, 0);
    forge.rotation.x += dt * 0.35;
  },
  () => {
    cameraRig.applyTo(camera);
    diagnostics.recordFrame(performance.now(), runtime.stats.simulationSteps);
    renderer.render(scene, camera);
    const frame = diagnostics.snapshot();
    quality.observe(frame.frameDeltaMs);
    status.textContent = [
      'ThreeGameForge runtime playground',
      `lifecycle: ${lifecycle.state}`,
      `fixed step: ${runtime.fixedStep.toFixed(4)}s`,
      `simulation steps: ${runtime.stats.simulationSteps}`,
      `elapsed: ${runtime.stats.elapsed.toFixed(1)}s`,
      `frames: ${frame.frames}`,
      `quality tier: ${quality.tier}`,
      `draw calls: ${renderer.info.render.calls}`,
      `triangles: ${renderer.info.render.triangles}`,
    ].join('\n');
  },
);

window.__THREE_GAME_TEST_HOOKS__ = {
  seed: async (_seed: number) => ({ seed: _seed }),
  setState: async (state: string) => {
    if (state !== 'active-play') throw new Error(`Unknown test state: ${state}`);
    return { state };
  },
  setPausedForScreenshot: (paused: boolean) => runtime.setPaused(paused),
  hideDebugUi: () => { status.hidden = true; },
};

runtime.start();
window.addEventListener('beforeunload', () => input.dispose());
