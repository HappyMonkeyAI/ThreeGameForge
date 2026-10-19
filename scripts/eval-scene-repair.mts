/**
 * Live SceneSpec repair eval against a local OpenAI-compatible LLM.
 *
 *   npm run eval:repair-scene
 *   TGF_LLM_BASE_URL  TGF_LLM_MODEL  TGF_EVAL_CASE=<id>
 *
 * Writes artifacts/llm-repair/eval-<stamp>.json (gitignored).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  createLlmSceneRepairer,
  createOpenAiCompatibleComplete,
  repairSceneSpec,
  validateSceneSpec,
  type SceneSpec,
} from '../packages/scene/src/index.ts';

type EvalChecks = {
  entityIds?: string[];
  colorIsHex?: boolean;
  forbiddenComponents?: string[];
  environmentOneOf?: string[];
  cameraTargetExists?: boolean;
  materialType?: string;
  geometryOneOf?: string[];
  atMostOneOrbitTarget?: boolean;
  cameraTypeOneOf?: string[];
  hasModelAsset?: boolean;
};

type EvalCase = {
  id: string;
  fixture: string;
  expectOk?: boolean;
  maxAttempts?: number;
  checks?: EvalChecks;
};

type EvalManifest = {
  version: 1;
  defaults?: { maxAttempts?: number; expectOk?: boolean };
  cases: EvalCase[];
};

type CaseResult = {
  id: string;
  passed: boolean;
  elapsedMs: number;
  attempts?: number;
  initialInvalid: boolean;
  repairOk?: boolean;
  failures: string[];
  errors?: unknown;
};

const HEX = /^#([0-9a-fA-F]{6})$/;
const root = resolve(import.meta.dirname, '..');
const baseUrl = process.env.TGF_LLM_BASE_URL ?? 'http://192.168.5.229:1234/v1';
const model = process.env.TGF_LLM_MODEL ?? 'google/gemma-4-e2b';
const onlyCase = process.env.TGF_EVAL_CASE;
const evalRoot = resolve(root, 'fixtures/scenes/repair/eval');

function scoreChecks(spec: SceneSpec, checks: EvalChecks | undefined): string[] {
  if (!checks) return [];
  const failures: string[] = [];
  const ids = spec.entities.map((entity) => entity.id);

  if (checks.entityIds) {
    for (const id of checks.entityIds) {
      if (!ids.includes(id)) failures.push(`missing entity id: ${id}`);
    }
  }
  if (checks.environmentOneOf && !checks.environmentOneOf.includes(spec.environment)) {
    failures.push(`environment ${spec.environment} not in ${checks.environmentOneOf.join('|')}`);
  }
  if (checks.cameraTypeOneOf && !checks.cameraTypeOneOf.includes(spec.camera.type)) {
    failures.push(`camera.type ${spec.camera.type} not allowed`);
  }
  if (checks.cameraTargetExists && spec.camera.target && !ids.includes(spec.camera.target)) {
    failures.push(`camera.target ${spec.camera.target} missing`);
  }
  if (checks.atMostOneOrbitTarget) {
    const count = spec.entities.filter((entity) => entity.components?.includes('orbit-target')).length;
    if (count > 1) failures.push(`orbit-target count ${count} > 1`);
  }
  if (checks.forbiddenComponents) {
    for (const entity of spec.entities) {
      for (const component of entity.components ?? []) {
        if (checks.forbiddenComponents.includes(component)) {
          failures.push(`forbidden component ${component} on ${entity.id}`);
        }
      }
    }
  }
  if (checks.colorIsHex || checks.materialType || checks.geometryOneOf) {
    for (const entity of spec.entities) {
      if (entity.type !== 'mesh') continue;
      if (checks.colorIsHex && !HEX.test(entity.material.color)) {
        failures.push(`non-hex color on ${entity.id}: ${entity.material.color}`);
      }
      if (checks.materialType && entity.material.type !== checks.materialType) {
        failures.push(`material.type on ${entity.id}: ${entity.material.type}`);
      }
      if (checks.geometryOneOf && !checks.geometryOneOf.includes(entity.geometry)) {
        failures.push(`geometry on ${entity.id}: ${entity.geometry}`);
      }
    }
  }
  if (checks.hasModelAsset) {
    const models = spec.entities.filter((entity) => entity.type === 'model');
    if (models.length === 0) failures.push('expected a model entity');
    for (const entity of models) {
      if (entity.type !== 'model') continue;
      if (!entity.model.asset.trim()) failures.push(`empty model.asset on ${entity.id}`);
    }
  }
  return failures;
}

const manifest = JSON.parse(await readFile(resolve(evalRoot, 'manifest.json'), 'utf8')) as EvalManifest;
const cases = onlyCase
  ? manifest.cases.filter((entry) => entry.id === onlyCase)
  : manifest.cases;
if (cases.length === 0) throw new Error(`No eval cases selected (TGF_EVAL_CASE=${onlyCase ?? ''})`);

console.log(`LLM: ${model} @ ${baseUrl}`);
console.log(`Cases: ${cases.map((entry) => entry.id).join(', ')}`);

const complete = createOpenAiCompatibleComplete({
  baseUrl,
  model,
  temperature: 0.1,
  maxTokens: 4096,
});
const repairer = createLlmSceneRepairer({ complete });

const results: CaseResult[] = [];
const suiteStarted = performance.now();

for (const entry of cases) {
  const fixturePath = resolve(evalRoot, entry.fixture);
  const input = JSON.parse(await readFile(fixturePath, 'utf8')) as unknown;
  const initial = validateSceneSpec(input);
  const expectOk = entry.expectOk ?? manifest.defaults?.expectOk ?? true;
  const maxAttempts = entry.maxAttempts ?? manifest.defaults?.maxAttempts ?? 4;
  const failures: string[] = [];
  if (initial.ok) failures.push('fixture was already valid before repair');

  process.stdout.write(`• ${entry.id} … `);
  const started = performance.now();
  let repairOk = false;
  let attempts: number | undefined;
  let errors: unknown;
  try {
    const repaired = await repairSceneSpec(input, { repairer, maxAttempts });
    attempts = repaired.attempts;
    repairOk = repaired.ok;
    if (repaired.ok !== expectOk) {
      failures.push(`expected ok=${expectOk}, got ok=${repaired.ok}`);
    }
    if (repaired.ok) {
      failures.push(...scoreChecks(repaired.spec, entry.checks));
    } else {
      errors = repaired.errors;
      if (expectOk) failures.push('repair did not converge');
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
  const elapsedMs = Math.round(performance.now() - started);
  const passed = failures.length === 0;
  results.push({
    id: entry.id,
    passed,
    elapsedMs,
    attempts,
    initialInvalid: !initial.ok,
    repairOk,
    failures,
    errors,
  });
  console.log(`${passed ? 'PASS' : 'FAIL'} (${elapsedMs}ms, attempts=${attempts ?? '—'})`);
  if (!passed) for (const failure of failures) console.log(`    - ${failure}`);
}

const passedCount = results.filter((entry) => entry.passed).length;
const report = {
  version: 1,
  model,
  baseUrl,
  startedAt: new Date().toISOString(),
  elapsedMs: Math.round(performance.now() - suiteStarted),
  passed: passedCount,
  total: results.length,
  results,
};

const outDir = resolve(root, 'artifacts/llm-repair');
await mkdir(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = resolve(outDir, `eval-${stamp}.json`);
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`\n${passedCount}/${results.length} passed in ${report.elapsedMs}ms`);
console.log(`Wrote ${outPath}`);
if (passedCount !== results.length) process.exitCode = 1;
