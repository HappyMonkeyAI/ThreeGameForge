import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerAdmittedAsset } from '../packages/mcp/src/pipeline/admit.ts';
import {
  assertComfyQueueIdle,
  pollComfyPrompt,
  submitComfyPrompt,
} from '../packages/mcp/src/pipeline/comfyClient.ts';
import { applyConceptOverrides } from '../packages/mcp/src/pipeline/recipeLoad.ts';

test('assertComfyQueueIdle refuses busy queue', async () => {
  await assert.rejects(
    () =>
      assertComfyQueueIdle('http://comfy.test', async () =>
        new Response(JSON.stringify({ queue_running: [[0, 'a']], queue_pending: [] }), { status: 200 }),
      ),
    /queue busy/,
  );
});

test('submitComfyPrompt posts when idle', async () => {
  const calls: string[] = [];
  const result = await submitComfyPrompt(
    'http://comfy.test/',
    { '1': { class_type: 'Noop', inputs: {} } },
    async (url, init) => {
      calls.push(String(url));
      if (String(url).endsWith('/queue')) {
        return new Response(JSON.stringify({ queue_running: [], queue_pending: [] }), { status: 200 });
      }
      assert.equal(init?.method, 'POST');
      return new Response(JSON.stringify({ prompt_id: 'p-1' }), { status: 200 });
    },
  );
  assert.equal(result.promptId, 'p-1');
  assert.equal(result.baseUrl, 'http://comfy.test');
  assert.equal(result.workflowSha256.length, 64);
  assert.ok(calls.some((u) => u.endsWith('/prompt')));
});

test('pollComfyPrompt returns pending from queue when history empty', async () => {
  const polled = await pollComfyPrompt('http://comfy.test', 'p-9', async (url) => {
    if (String(url).includes('/history/')) {
      return new Response(JSON.stringify({}), { status: 200 });
    }
    return new Response(
      JSON.stringify({ queue_running: [[1, 'p-9']], queue_pending: [] }),
      { status: 200 },
    );
  });
  assert.equal(polled.status, 'pending');
  if (polled.status === 'pending') {
    assert.deepEqual(polled.runningIds, ['p-9']);
  }
});

test('applyConceptOverrides patches flux prompt node', () => {
  const graph: Record<string, unknown> = {
    '76': { class_type: 'PrimitiveStringMultiline', inputs: { value: 'old' } },
    '75:73': { class_type: 'RandomNoise', inputs: { noise_seed: 1 } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'x' } },
  };
  applyConceptOverrides('concept-flux2-klein', graph, { prompt: 'crate prop', seed: 42 });
  assert.equal((graph['76'] as { inputs: { value: string } }).inputs.value, 'crate prop');
  assert.equal((graph['75:73'] as { inputs: { noise_seed: number } }).inputs.noise_seed, 42);
});

test('registerAdmittedAsset writes glb + provenance', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tgf-admit-'));
  const source = join(dir, 'raw.glb');
  await writeFile(source, Buffer.from('glTF-binary-fake'));
  const admitted = await registerAdmittedAsset({
    admitDir: join(dir, 'admit'),
    localGlbPath: source,
    assetId: 'sandbox-crate',
    meta: { recipeId: 'i2_3d-pixal3d' },
  });
  assert.equal(admitted.assetId, 'sandbox-crate');
  assert.equal(admitted.bytes, 16);
  const provenance = JSON.parse(await readFile(admitted.provenancePath, 'utf8')) as {
    sha256: string;
    rights: string;
  };
  assert.equal(provenance.sha256, admitted.sha256);
  assert.match(provenance.rights, /sandbox-only/);
});
