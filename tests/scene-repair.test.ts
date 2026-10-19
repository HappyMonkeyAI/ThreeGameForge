import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  createScriptedSceneRepairer,
  repairSceneSpec,
  validateSceneSpec,
} from '../packages/scene/src/index.ts';

const repairRoot = resolve(import.meta.dirname, '../fixtures/scenes/repair');

async function load(name: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(repairRoot, name), 'utf8')) as unknown;
}

test('scripted repairer converges named color and unknown component', async () => {
  const input = await load('broken-named-color.json');
  assert.equal(validateSceneSpec(input).ok, false);

  const result = await repairSceneSpec(input, {
    repairer: createScriptedSceneRepairer(),
    maxAttempts: 4,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.attempts >= 2);
  assert.equal(result.spec.entities[0]?.material.color, '#ff4500');
  assert.deepEqual(result.spec.entities[0]?.components, ['orbit-target']);
});

test('scripted repairer retargets missing camera target and normalizes environment', async () => {
  const input = await load('broken-missing-target.json');
  const result = await repairSceneSpec(input, {
    repairer: createScriptedSceneRepairer(),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.spec.environment, 'night');
  assert.equal(result.spec.camera.target, 'box');
});

test('repair loop gives up when repairer cannot fix geometry vocabulary', async () => {
  const input = await load('unrecoverable.json');
  const result = await repairSceneSpec(input, {
    repairer: createScriptedSceneRepairer(),
    maxAttempts: 3,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  // Scripted repairer has no geometry rewrite, so the loop stops as soon as the
  // proposal matches the failing intent instead of burning the full budget.
  assert.equal(result.attempts, 1);
  assert.ok(result.errors.some((issue) => issue.path.includes('geometry')));
});

test('repair loop burns maxAttempts when repairer keeps returning invalid variants', async () => {
  let n = 0;
  const result = await repairSceneSpec(
    {
      version: 1,
      environment: 'night',
      camera: { type: 'orbit' },
      entities: [
        {
          id: 'seed-bad',
          type: 'mesh',
          geometry: 'torus-knot',
          material: { type: 'standard', color: '#00ff00' },
        },
      ],
    },
    {
      maxAttempts: 3,
      repairer: () => {
        n += 1;
        return {
          version: 1,
          environment: 'night',
          camera: { type: 'orbit' },
          entities: [
            {
              id: `bad-${n}`,
              type: 'mesh',
              geometry: 'torus-knot',
              material: { type: 'standard', color: '#00ff00' },
            },
          ],
        };
      },
    },
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.attempts, 3);
  assert.equal(result.history.length, 3);
});

test('repair loop stops when repairer returns an unchanged intent', async () => {
  const input = await load('unrecoverable.json');
  const result = await repairSceneSpec(input, {
    maxAttempts: 6,
    repairer: ({ previous }) => previous,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.attempts, 1);
});
