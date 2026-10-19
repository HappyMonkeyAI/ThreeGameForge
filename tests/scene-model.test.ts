import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { AssetManifest, AssetRegistry } from '../packages/assets/src/index.ts';
import { applySceneSpec, validateSceneSpec } from '../packages/scene/src/index.ts';

const fixturesRoot = resolve(import.meta.dirname, '../fixtures/scenes');

test('model entity validates and requires loadModel at apply time', async () => {
  const input = JSON.parse(await readFile(resolve(fixturesRoot, 'model-crate.json'), 'utf8')) as unknown;
  const validated = validateSceneSpec(input);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  assert.equal(validated.spec.entities[1]?.type, 'model');

  const scene = new THREE.Scene();
  await assert.rejects(() => applySceneSpec(scene, validated.spec), /loadModel/);
});

test('model entity applies through AssetRegistry-backed loadModel', async () => {
  const input = JSON.parse(await readFile(resolve(fixturesRoot, 'model-crate.json'), 'utf8')) as unknown;
  const manifest = new AssetManifest();
  manifest.register({
    id: 'crate-pixal3d',
    source: 'local://fixture-crate',
    license: 'test-fixture',
  });
  let loads = 0;
  const registry = new AssetRegistry<THREE.Object3D>(
    manifest,
    async () => {
      loads += 1;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b }),
      );
      mesh.name = 'crate-root';
      return mesh;
    },
    (asset) => {
      asset.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          const material = mesh.material;
          if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
          else material.dispose();
        }
      });
    },
  );

  const scene = new THREE.Scene();
  const applied = await applySceneSpec(scene, input, {
    loadModel: (assetId) => registry.loadAsset(assetId),
  });
  assert.equal(loads, 1);
  assert.equal(applied.entities.size, 2);
  assert.equal(applied.entities.get('crate')?.name, 'crate');
  assert.deepEqual([...applied.rotatableIds], ['crate']);
  applied.dispose();
  await registry.release('crate-pixal3d');
});
