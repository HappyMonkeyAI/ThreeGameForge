import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateSceneSpec } from '../packages/scene/src/index.ts';

const evalRoot = resolve(import.meta.dirname, '../fixtures/scenes/repair/eval');

test('repair eval manifest fixtures are initially invalid SceneSpecs', async () => {
  const manifest = JSON.parse(await readFile(resolve(evalRoot, 'manifest.json'), 'utf8')) as {
    cases: Array<{ id: string; fixture: string }>;
  };
  assert.ok(manifest.cases.length >= 8);
  for (const entry of manifest.cases) {
    const input = JSON.parse(await readFile(resolve(evalRoot, entry.fixture), 'utf8')) as unknown;
    const validated = validateSceneSpec(input);
    assert.equal(validated.ok, false, `${entry.id} should start invalid`);
  }
});
