import * as THREE from 'three';
import './style.css';
import { FixedStepRuntime, RuntimeDiagnostics, RuntimeLifecycle } from '../packages/runtime/src/index';
import { KeyboardInput } from '../packages/input/src/index';
import { OrbitCameraRig } from '../packages/camera/src/index';
import { QualityController } from '../packages/renderer/src/index';
import { createGltfLoadModel } from '../packages/assets/src/index';
import { applySceneSpec, validateSceneSpec, type SceneSpec } from '../packages/scene/src/index';
import {
  FILTERED_CRATE_VITE_FS_URL,
  SANDBOX_CRATE_ASSET_ID,
} from './sandboxAssets';
import goldenScene from '../fixtures/scenes/golden.json';
import filteredWrenCamp from '../fixtures/scenes/consumers/filtered-wren-camp-blockout.json';
import mercenaryOrbit from '../fixtures/scenes/consumers/mercenary-orbit-blockout.json';
import modelCrate from '../fixtures/scenes/model-crate.json';

const SCENE_CATALOG: Record<string, unknown> = {
  golden: goldenScene,
  'filtered-wren-camp': filteredWrenCamp,
  'mercenary-orbit': mercenaryOrbit,
  'model-crate': modelCrate,
};

const loadSandboxGltf = createGltfLoadModel((assetId) => {
  if (assetId !== SANDBOX_CRATE_ASSET_ID) {
    throw new Error(`Unknown sandbox asset: ${assetId}`);
  }
  return FILTERED_CRATE_VITE_FS_URL;
});

function crateBoxFallback(assetId: string): THREE.Object3D {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.85, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.75, metalness: 0.05 }),
  );
  mesh.name = assetId;
  return mesh;
}

/** Prefer sibling Filtered GLB (local sandbox); fall back to a box if unavailable. */
async function loadModel(assetId: string): Promise<THREE.Object3D> {
  if (assetId !== SANDBOX_CRATE_ASSET_ID) throw new Error(`Unknown playground asset: ${assetId}`);
  try {
    return await loadSandboxGltf(assetId);
  } catch (error) {
    console.warn('Sandbox GLB unavailable; using box fallback', error);
    return crateBoxFallback(assetId);
  }
}

async function boot(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Application root is missing');
  const root = app;

  const requested = new URLSearchParams(window.location.search).get('scene') ?? 'golden';
  const sceneInput = SCENE_CATALOG[requested];
  if (!sceneInput) {
    throw new Error(`Unknown scene "${requested}". Allowed: ${Object.keys(SCENE_CATALOG).join(', ')}`);
  }

  const scene = new THREE.Scene();
  const validation = validateSceneSpec(sceneInput);
  if (!validation.ok) {
    throw new Error(
      `SceneSpec "${requested}" failed validation: ${validation.errors.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`,
    );
  }
  const spec: SceneSpec = validation.spec;

  const applied = await applySceneSpec(scene, spec, { loadModel });
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  const cameraRig = new OrbitCameraRig({
    radius: applied.cameraRadius,
    elevation: applied.cameraElevation,
  });
  cameraRig.target.copy(applied.cameraTarget);
  cameraRig.applyTo(camera);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  root.appendChild(renderer.domElement);

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
      cameraRig.rotate(direction * dt * 0.8, 0);
      for (const id of applied.rotatableIds) {
        const object = applied.entities.get(id);
        if (!object) continue;
        object.rotation.y += dt * (0.8 + direction * 1.6);
        object.rotation.x += dt * 0.35;
      }
    },
    () => {
      cameraRig.applyTo(camera);
      diagnostics.recordFrame(performance.now(), runtime.stats.simulationSteps);
      renderer.render(scene, camera);
      const frame = diagnostics.snapshot();
      quality.observe(frame.frameDeltaMs);
      status.textContent = [
        'ThreeGameForge SceneSpec playground',
        `scene: ${requested}`,
        `source: ${spec.meta?.source ?? 'local'}`,
        `environment: ${spec.environment}`,
        `entities: ${applied.entities.size}`,
        `lifecycle: ${lifecycle.state}`,
        `fixed step: ${runtime.fixedStep.toFixed(4)}s`,
        `simulation steps: ${runtime.stats.simulationSteps}`,
        `elapsed: ${runtime.stats.elapsed.toFixed(1)}s`,
        `frames: ${frame.frames}`,
        `quality tier: ${quality.tier}`,
        `draw calls: ${renderer.info.render.calls}`,
        `triangles: ${renderer.info.render.triangles}`,
        'switch: ?scene=golden|filtered-wren-camp|mercenary-orbit|model-crate',
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
    getSceneSpec: () => spec,
    getEntityIds: () => [...applied.entities.keys()],
  };

  runtime.start();
  window.addEventListener('beforeunload', () => {
    input.dispose();
    applied.dispose();
  });
}

boot().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const app = document.querySelector('#app');
  if (app) app.textContent = `ThreeGameForge boot failed: ${message}`;
  console.error(error);
});
