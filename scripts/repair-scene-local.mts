/**
 * LAN-sandbox SceneSpec repair demo against a local OpenAI-compatible server.
 *
 * Defaults target Stephen's lab host; override with:
 *   TGF_LLM_BASE_URL  TGF_LLM_MODEL  TGF_REPAIR_FIXTURE
 *
 * Do not treat these defaults as a public runtime contract.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  createLlmSceneRepairer,
  createOpenAiCompatibleComplete,
  repairSceneSpec,
  validateSceneSpec,
} from '../packages/scene/src/index.ts';

const root = resolve(import.meta.dirname, '..');
const baseUrl = process.env.TGF_LLM_BASE_URL ?? 'http://192.168.5.229:1234/v1';
const model = process.env.TGF_LLM_MODEL ?? 'google/gemma-4-e2b';
const fixtureRel = process.env.TGF_REPAIR_FIXTURE ?? 'fixtures/scenes/repair/broken-named-color.json';
const fixturePath = resolve(root, fixtureRel);

const input = JSON.parse(await readFile(fixturePath, 'utf8')) as unknown;
const before = validateSceneSpec(input);
console.log(`LLM: ${model} @ ${baseUrl}`);
console.log(`Fixture: ${fixtureRel}`);
console.log(`Initial valid: ${before.ok}`);
if (!before.ok) {
  console.log('Initial errors:');
  for (const issue of before.errors) console.log(`  - ${issue.path || '/'}: ${issue.message}`);
}

const complete = createOpenAiCompatibleComplete({
  baseUrl,
  model,
  temperature: 0.1,
  maxTokens: 4096,
});
const repairer = createLlmSceneRepairer({
  complete: async (prompt) => {
    const text = await complete(prompt);
    console.log(`--- raw completion (${text.length} chars) ---`);
    console.log(text.slice(0, 1200));
    if (text.length > 1200) console.log('…');
    return text;
  },
});
const started = performance.now();
let result;
try {
  result = await repairSceneSpec(input, { repairer, maxAttempts: 4 });
} catch (error) {
  console.error('Repair threw:', error);
  process.exitCode = 1;
  throw error;
}
const elapsedMs = Math.round(performance.now() - started);

const outDir = resolve(root, 'artifacts/llm-repair');
await mkdir(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = resolve(outDir, `repair-${stamp}.json`);

const report = {
  ok: result.ok,
  attempts: result.attempts,
  elapsedMs,
  model,
  baseUrl,
  fixture: fixtureRel,
  history: result.history,
  ...(result.ok
    ? { spec: result.spec }
    : { errors: result.errors }),
};

await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (result.ok) {
  console.log(`Repaired in ${result.attempts} attempt(s), ${elapsedMs}ms`);
  console.log(JSON.stringify(result.spec, null, 2));
} else {
  console.error(`Failed after ${result.attempts} attempt(s), ${elapsedMs}ms`);
  for (const issue of result.errors) console.error(`  - ${issue.path || '/'}: ${issue.message}`);
  process.exitCode = 1;
}
console.log(`Wrote ${outPath}`);
