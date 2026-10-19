import assert from 'node:assert/strict';
import test from 'node:test';
import { createGltfLoadModel } from '../packages/assets/src/index.ts';

test('createGltfLoadModel rejects empty resolved sources', async () => {
  const load = createGltfLoadModel(() => '   ');
  await assert.rejects(() => load('crate-pixal3d'), /Empty model source/);
});
