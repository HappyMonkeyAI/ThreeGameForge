import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { applySceneSpec, validateSceneSpec } from '../packages/scene/src/index.ts';

const fixturesRoot = resolve(import.meta.dirname, '../fixtures/scenes');

async function loadFixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(fixturesRoot, name), 'utf8')) as unknown;
}

test('golden SceneSpec validates and applies into a Three.js scene', async () => {
  const input = await loadFixture('golden.json');
  const validated = validateSceneSpec(input);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;

  const scene = new THREE.Scene();
  const applied = await applySceneSpec(scene, validated.spec);
  assert.equal(applied.entities.size, 2);
  assert.deepEqual([...applied.rotatableIds], ['forge']);
  assert.ok(applied.entities.get('forge'));
  assert.ok(applied.entities.get('platform'));
  assert.equal(applied.cameraTarget.y, 1);
  assert.equal(scene.children.length >= 4, true);

  applied.dispose();
  assert.equal(scene.children.length, 0);
});

test('invalid SceneSpec returns structured repair errors and never applies', async () => {
  const input = await loadFixture('invalid-missing-target.json');
  const validated = validateSceneSpec(input);
  assert.equal(validated.ok, false);
  if (validated.ok) return;
  assert.ok(validated.errors.some((issue) => issue.path === 'camera.target'));

  const scene = new THREE.Scene();
  await assert.rejects(() => applySceneSpec(scene, input), /Invalid SceneSpec/);
  assert.equal(scene.children.length, 0);
});

test('SceneSpec rejects invented material colors and unknown components', () => {
  const validated = validateSceneSpec({
    version: 1,
    environment: 'studio',
    camera: { type: 'fixed' },
    entities: [
      {
        id: 'bad',
        type: 'mesh',
        geometry: 'box',
        material: { type: 'standard', color: 'orange' },
        components: ['fly-around'],
      },
    ],
  });
  assert.equal(validated.ok, false);
  if (validated.ok) return;
  const paths = validated.errors.map((issue) => issue.path);
  assert.ok(paths.includes('entities[0].material.color'));
  assert.ok(paths.includes('entities[0].components[0]'));
});
