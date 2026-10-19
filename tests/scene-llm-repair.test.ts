import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLlmSceneRepairer,
  extractJsonObject,
  formatSceneRepairPrompt,
  repairSceneSpec,
  validateSceneSpec,
} from '../packages/scene/src/index.ts';

test('formatSceneRepairPrompt includes vocabulary, errors, and previous intent', () => {
  const prompt = formatSceneRepairPrompt({
    attempt: 2,
    previous: { version: 1, environment: 'dusk', camera: { type: 'orbit' }, entities: [] },
    errors: [{ path: 'environment', message: 'environment must be one of: studio, sunset, night' }],
  });
  assert.match(prompt, /Attempt: 2/);
  assert.match(prompt, /environment must be one of/);
  assert.match(prompt, /"dusk"/);
  assert.match(prompt, /Repaired SceneSpec JSON/);
});

test('extractJsonObject accepts raw JSON and fenced blocks', () => {
  assert.deepEqual(extractJsonObject('{"version":1}'), { version: 1 });
  assert.deepEqual(
    extractJsonObject('Sure.\n```json\n{"version":1,"environment":"night"}\n```\n'),
    { version: 1, environment: 'night' },
  );
  assert.throws(() => extractJsonObject('no json here'), /JSON object/);
});

test('LLM repairer adapter converges when completion returns a valid SceneSpec', async () => {
  const broken = {
    version: 1,
    environment: 'dusk',
    camera: { type: 'orbit', target: 'hero' },
    entities: [
      {
        id: 'hero',
        type: 'mesh',
        geometry: 'box',
        material: { type: 'standard', color: 'orange' },
        components: ['orbit-target', 'fly-around'],
      },
    ],
  };
  assert.equal(validateSceneSpec(broken).ok, false);

  const repairer = createLlmSceneRepairer({
    complete: async (prompt) => {
      assert.match(prompt, /fly-around|orange|dusk|unknown entity|environment/i);
      return [
        '```json',
        JSON.stringify({
          version: 1,
          environment: 'night',
          camera: { type: 'orbit', target: 'hero', radius: 5 },
          entities: [
            {
              id: 'hero',
              type: 'mesh',
              geometry: 'box',
              material: { type: 'standard', color: '#ff4500', roughness: 0.3 },
              components: ['orbit-target'],
            },
          ],
        }),
        '```',
      ].join('\n');
    },
  });

  const result = await repairSceneSpec(broken, { repairer });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.spec.environment, 'night');
  assert.equal(result.spec.entities[0]?.type, 'mesh');
  if (result.spec.entities[0]?.type === 'mesh') {
    assert.equal(result.spec.entities[0].material.color, '#ff4500');
  }
});
