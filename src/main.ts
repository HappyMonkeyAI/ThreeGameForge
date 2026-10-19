import * as THREE from 'three';
import './style.css';
import { FixedStepRuntime, RuntimeDiagnostics, RuntimeLifecycle } from '../packages/runtime/src/index';
import { KeyboardInput } from '../packages/input/src/index';
import { OrbitCameraRig } from '../packages/camera/src/index';
import { QualityController } from '../packages/renderer/src/index';
import { createGltfLoadModel } from '../packages/assets/src/index';
import {
  applySceneSpec,
  createLlmSceneRepairer,
  createOpenAiCompatibleComplete,
  repairSceneSpec,
  validateSceneSpec,
  type ApplySceneResult,
  type SceneSpec,
} from '../packages/scene/src/index';
import {
  FILTERED_CRATE_VITE_FS_URL,
  SANDBOX_CRATE_ASSET_ID,
} from './sandboxAssets';
import { resolveLlmHost } from './llmHost';
import goldenScene from '../fixtures/scenes/golden.json';
import filteredWrenCamp from '../fixtures/scenes/consumers/filtered-wren-camp-blockout.json';
import mercenaryOrbit from '../fixtures/scenes/consumers/mercenary-orbit-blockout.json';
import modelCrate from '../fixtures/scenes/model-crate.json';
import brokenNamedColor from '../fixtures/scenes/repair/broken-named-color.json';

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

async function loadModel(assetId: string): Promise<THREE.Object3D> {
  if (assetId !== SANDBOX_CRATE_ASSET_ID) throw new Error(`Unknown playground asset: ${assetId}`);
  try {
    return await loadSandboxGltf(assetId);
  } catch (error) {
    console.warn('Sandbox GLB unavailable; using box fallback', error);
    return crateBoxFallback(assetId);
  }
}

function parseDraft(text: string): unknown {
  return JSON.parse(text) as unknown;
}

async function boot(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Application root is missing');
  const root = app;
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('scene') ?? 'golden';
  const startInRepair = params.get('mode') === 'repair' || requested === 'repair';
  const sceneInput = startInRepair ? goldenScene : SCENE_CATALOG[requested];
  if (!sceneInput) {
    throw new Error(`Unknown scene "${requested}". Allowed: ${Object.keys(SCENE_CATALOG).join(', ')}, repair`);
  }

  const llm = resolveLlmHost();
  const scene = new THREE.Scene();
  let validation = validateSceneSpec(sceneInput);
  if (!validation.ok) {
    throw new Error(
      `SceneSpec failed validation: ${validation.errors.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`,
    );
  }
  let spec: SceneSpec = validation.spec;
  let sceneLabel = startInRepair ? 'golden (repair mode)' : requested;
  let applied: ApplySceneResult = await applySceneSpec(scene, spec, { loadModel });
  let repairLog = 'Ready. Load a broken draft, then Validate or Repair + Apply.';

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
  root.appendChild(status);

  const panel = document.createElement('section');
  panel.className = 'repair-panel';
  panel.innerHTML = `
    <h1>SceneSpec repair</h1>
    <p>Validate locally, or repair via ${llm.model} then apply to the canvas.</p>
    <textarea spellcheck="false" aria-label="SceneSpec JSON draft"></textarea>
    <div class="repair-actions">
      <button type="button" data-action="load-broken">Load broken sample</button>
      <button type="button" data-action="validate">Validate</button>
      <button type="button" data-action="repair">Repair + Apply</button>
      <button type="button" data-action="apply">Apply draft</button>
    </div>
    <pre class="repair-log" aria-live="polite"></pre>
  `;
  root.appendChild(panel);
  const draftNode = panel.querySelector('textarea');
  const logNode = panel.querySelector('.repair-log');
  const buttonNodes = [...panel.querySelectorAll('button')];
  if (!(draftNode instanceof HTMLTextAreaElement) || !(logNode instanceof HTMLPreElement)) {
    throw new Error('Repair panel failed to mount');
  }
  const draftArea: HTMLTextAreaElement = draftNode;
  const logEl: HTMLPreElement = logNode;

  draftArea.value = JSON.stringify(startInRepair ? brokenNamedColor : sceneInput, null, 2);

  function setBusy(busy: boolean): void {
    for (const button of buttonNodes) {
      if (button instanceof HTMLButtonElement) button.disabled = busy;
    }
  }

  function writeLog(message: string): void {
    repairLog = message;
    logEl.textContent = message;
  }

  async function replaceScene(nextSpec: SceneSpec, label: string): Promise<void> {
    applied.dispose();
    spec = nextSpec;
    sceneLabel = label;
    applied = await applySceneSpec(scene, spec, { loadModel });
    cameraRig.radius = applied.cameraRadius;
    cameraRig.elevation = applied.cameraElevation;
    cameraRig.target.copy(applied.cameraTarget);
    cameraRig.applyTo(camera);
  }

  async function validateDraft(): Promise<{ ok: boolean; errors?: unknown }> {
    try {
      const draft = parseDraft(draftArea.value);
      const result = validateSceneSpec(draft);
      if (result.ok) {
        writeLog('Valid SceneSpec.');
        return { ok: true };
      }
      writeLog(
        `Invalid:\n${result.errors.map((issue) => `- ${issue.path || '/'}: ${issue.message}`).join('\n')}`,
      );
      return { ok: false, errors: result.errors };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeLog(`Parse error: ${message}`);
      return { ok: false, errors: [{ path: '', message }] };
    }
  }

  async function applyDraft(): Promise<{ ok: boolean; error?: string }> {
    try {
      const draft = parseDraft(draftArea.value);
      const result = validateSceneSpec(draft);
      if (!result.ok) {
        writeLog(
          `Cannot apply:\n${result.errors.map((issue) => `- ${issue.path || '/'}: ${issue.message}`).join('\n')}`,
        );
        return { ok: false, error: 'invalid' };
      }
      await replaceScene(result.spec, 'draft');
      draftArea.value = JSON.stringify(result.spec, null, 2);
      writeLog(`Applied ${result.spec.entities.length} entities (${result.spec.environment}).`);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeLog(`Apply failed: ${message}`);
      return { ok: false, error: message };
    }
  }

  async function repairAndApply(): Promise<{ ok: boolean; attempts?: number; error?: string }> {
    setBusy(true);
    writeLog(`Repairing with ${llm.model}…`);
    try {
      const draft = parseDraft(draftArea.value);
      const complete = createOpenAiCompatibleComplete({
        baseUrl: llm.baseUrl,
        model: llm.model,
        temperature: 0.1,
        maxTokens: 4096,
      });
      const repairer = createLlmSceneRepairer({ complete });
      const started = performance.now();
      const result = await repairSceneSpec(draft, { repairer, maxAttempts: 4 });
      const elapsedMs = Math.round(performance.now() - started);
      if (!result.ok) {
        writeLog(
          `Repair failed after ${result.attempts} attempt(s) (${elapsedMs}ms)\n`
          + result.errors.map((issue) => `- ${issue.path || '/'}: ${issue.message}`).join('\n'),
        );
        return { ok: false, attempts: result.attempts, error: 'repair-failed' };
      }
      await replaceScene(result.spec, `repaired/${llm.model}`);
      draftArea.value = JSON.stringify(result.spec, null, 2);
      writeLog(
        `Repaired in ${result.attempts} attempt(s), ${elapsedMs}ms\n`
        + `history rounds: ${result.history.length}\n`
        + `entities: ${result.spec.entities.length}`,
      );
      return { ok: true, attempts: result.attempts };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeLog(`Repair error: ${message}`);
      return { ok: false, error: message };
    } finally {
      setBusy(false);
    }
  }

  panel.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.action;
    if (action === 'load-broken') {
      draftArea.value = JSON.stringify(brokenNamedColor, null, 2);
      writeLog('Loaded broken-named-color sample.');
      return;
    }
    if (action === 'validate') {
      void validateDraft();
      return;
    }
    if (action === 'apply') {
      void applyDraft();
      return;
    }
    if (action === 'repair') {
      void repairAndApply();
    }
  });

  writeLog(repairLog);

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
        `scene: ${sceneLabel}`,
        `source: ${spec.meta?.source ?? 'local'}`,
        `environment: ${spec.environment}`,
        `entities: ${applied.entities.size}`,
        `llm: ${llm.model}`,
        `lifecycle: ${lifecycle.state}`,
        `simulation steps: ${runtime.stats.simulationSteps}`,
        `frames: ${frame.frames}`,
        `quality tier: ${quality.tier}`,
        `draw calls: ${renderer.info.render.calls}`,
        `triangles: ${renderer.info.render.triangles}`,
        'switch: ?scene=golden|…  repair: ?mode=repair',
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
    hideDebugUi: () => {
      status.hidden = true;
      panel.hidden = true;
    },
    getSceneSpec: () => spec,
    getEntityIds: () => [...applied.entities.keys()],
    getRepairLog: () => repairLog,
    setRepairDraft: (json: string) => {
      draftArea.value = json;
    },
    validateRepairDraft: () => validateDraft(),
    repairAndApplyDraft: () => repairAndApply(),
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
