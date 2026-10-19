import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { applySceneSpec, validateSceneSpec } from '../packages/scene/src/index.ts';

const consumersRoot = resolve(import.meta.dirname, '../fixtures/scenes/consumers');

async function loadConsumer(name: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(consumersRoot, name), 'utf8')) as unknown;
}

test('FilteredLivingPainting Wren Camp blockout validates and applies', async () => {
  const input = await loadConsumer('filtered-wren-camp-blockout.json');
  const validated = validateSceneSpec(input);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  assert.equal(validated.spec.meta?.source, 'FilteredLivingPainting');
  assert.equal(validated.spec.entities.length, 10);

  const scene = new THREE.Scene();
  const applied = await applySceneSpec(scene, validated.spec);
  assert.deepEqual([...applied.entities.keys()].sort(), [
    'bench',
    'dog',
    'fire',
    'floor',
    'hearth',
    'radio',
    'wall-back',
    'wall-left',
    'wall-right',
    'window',
  ]);
  assert.deepEqual([...applied.rotatableIds], ['fire']);
  assert.ok(applied.entities.get('radio'));
  applied.dispose();
});

test('Mercenary4VR orbit blockout validates and applies', async () => {
  const input = await loadConsumer('mercenary-orbit-blockout.json');
  const validated = validateSceneSpec(input);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  assert.equal(validated.spec.meta?.source, 'Mercenary4VR');
  assert.ok(validated.spec.meta?.note?.includes('1/300'));

  const scene = new THREE.Scene();
  const applied = await applySceneSpec(scene, validated.spec);
  assert.equal(applied.entities.size, 5);
  assert.ok(applied.entities.get('planet'));
  assert.ok(applied.entities.get('craft-hull'));
  assert.deepEqual([...applied.rotatableIds], ['planet']);
  assert.ok(Math.abs(applied.cameraRadius - 3.1) < 1e-9);
  applied.dispose();
});

test('realmfront R0 blockout validates and applies', async () => {
  const input = await loadConsumer('realmfront-r0-blockout.json');
  const validated = validateSceneSpec(input);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  assert.equal(validated.spec.meta?.source, 'realmfront-rts');
  assert.ok(validated.spec.entities.length >= 10);

  const scene = new THREE.Scene();
  const applied = await applySceneSpec(scene, validated.spec);
  assert.ok(applied.entities.get('arena'));
  assert.ok(applied.entities.get('blue-hq'));
  assert.ok(applied.entities.get('red-hq'));
  assert.deepEqual([...applied.rotatableIds], []);
  assert.ok(Math.abs(applied.cameraRadius - 53) < 1e-9);
  applied.dispose();
});
