import assert from 'node:assert/strict';
import test from 'node:test';
import { listPipelineRecipes, PIPELINE_RECIPES } from '../packages/mcp/src/pipeline/catalog.ts';
import { getComfyHostStatus } from '../packages/mcp/src/pipeline/comfyStatus.ts';

test('pipeline catalog exposes closed recipe ids', () => {
  const listed = listPipelineRecipes('/tmp/threejs-pipeline');
  assert.equal(listed.recipes.length, PIPELINE_RECIPES.length);
  assert.equal(listed.refRoot, '/tmp/threejs-pipeline');
  assert.equal(listed.queueTools, 'planned');
  assert.ok(listed.recipes.some((r) => r.id === 'concept-flux2-klein'));
  assert.ok(listed.recipes.some((r) => r.id === 'i2_3d-pixal3d'));
});

test('comfy status reports missing env without fetching', async () => {
  const status = await getComfyHostStatus(undefined, async () => {
    throw new Error('fetch should not run');
  });
  assert.equal(status.configured, false);
  assert.equal(status.ok, false);
});

test('comfy status parses successful system_stats', async () => {
  const status = await getComfyHostStatus('http://comfy.example:8188/', async (url) => {
    assert.equal(String(url), 'http://comfy.example:8188/system_stats');
    return new Response(JSON.stringify({ system: { comfyui_version: '0.38.0' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  assert.equal(status.configured, true);
  assert.equal(status.ok, true);
  assert.equal(status.baseUrl, 'http://comfy.example:8188');
});
