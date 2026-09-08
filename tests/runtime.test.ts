import assert from 'node:assert/strict';
import test from 'node:test';
import { RuntimeClock, RuntimeLifecycle } from '../packages/runtime/src/index.ts';
import { OrbitCameraRig } from '../packages/camera/src/index.ts';
import { AssetManifest, AssetRegistry } from '../packages/assets/src/index.ts';
import { ChunkResidency, DirtyChunkQueue, chunkFromWorld, chunkKey } from '../packages/world/src/index.ts';
import { PredictionClient, SnapshotBuffer } from '../packages/networking/src/index.ts';
import { AdapterHost, AdapterRegistry } from '../packages/adapters/src/index.ts';
import { QualityController } from '../packages/renderer/src/index.ts';
import { EventBus, SeededRandom } from '../packages/core/src/index.ts';
import { FloatingOrigin } from '../packages/world/src/index.ts';
import { handleChunkWorkerRequest } from '../packages/world/src/worker.ts';
import { applyCaptureState, validateEvidenceManifest, type TestHooks } from '../packages/testkit/src/index.ts';
import { echoesAdapter, mrpgAdapter } from '../examples/consumer-adapters.ts';

test('RuntimeClock advances fixed steps and clamps long frames', () => {
  const clock = new RuntimeClock(0.1, 0.25, 0);
  const updates: number[] = [];
  clock.advance(1000, (dt) => updates.push(dt));
  assert.equal(updates.length, 2);
  assert.equal(clock.steps, 2);
  assert.equal(clock.elapsed, 0.25);
  assert.ok(Math.abs(clock.advance(1000, () => undefined) - 0.5) < 1e-9);
});

test('RuntimeLifecycle allows pause/resume but not restart after stop', () => {
  const lifecycle = new RuntimeLifecycle();
  assert.equal(lifecycle.state, 'created');
  lifecycle.start();
  lifecycle.pause();
  assert.equal(lifecycle.state, 'paused');
  lifecycle.resume();
  lifecycle.stop();
  assert.equal(lifecycle.state, 'stopped');
  assert.throws(() => lifecycle.start(), /cannot be restarted/);
});

test('OrbitCameraRig clamps elevation and radius', () => {
  const rig = new OrbitCameraRig({ radius: 4, elevation: 0 });
  rig.rotate(0, 100);
  rig.zoom(100);
  assert.equal(rig.elevation, rig.maxElevation);
  assert.equal(rig.radius, 50);
  rig.zoom(-100);
  assert.equal(rig.radius, 1);
});

test('AssetRegistry caches loads and releases an asset once', async () => {
  const manifest = new AssetManifest();
  manifest.register({ id: 'fixture', source: 'local://fixture', license: 'test' });
  let loads = 0;
  let releases = 0;
  const registry = new AssetRegistry(manifest, async () => { loads += 1; return { value: 1 }; }, () => { releases += 1; });
  const first = registry.loadAsset('fixture');
  const second = registry.loadAsset('fixture');
  assert.strictEqual(await first, await second);
  assert.equal(loads, 1);
  await registry.release('fixture');
  await registry.release('fixture');
  assert.equal(releases, 1);
  assert.throws(() => registry.loadAsset('fixture'), /disposed/);
});

test('ChunkResidency maintains a bounded deterministic neighborhood', () => {
  assert.deepEqual(chunkFromWorld({ x: -1, y: 16, z: 33 }, 16), { x: -1, y: 1, z: 2 });
  assert.equal(chunkKey({ x: -1, y: 0, z: 2 }), '-1,0,2');
  const residency = new ChunkResidency(1);
  const first = residency.update({ x: 0, y: 0, z: 0 });
  assert.equal(first.load.length, 27);
  assert.equal(first.unload.length, 0);
  const second = residency.update({ x: 1, y: 0, z: 0 });
  assert.equal(second.load.length, 9);
  assert.equal(second.unload.length, 9);
  assert.equal(residency.size(), 27);
});

test('DirtyChunkQueue commits generated replacements atomically and deduplicates revisions', () => {
  const queue = new DirtyChunkQueue();
  const coord = { x: 0, y: 0, z: 0 };
  queue.markDirty(coord, 1);
  queue.markDirty(coord, 2);
  assert.equal(queue.pendingCount(), 1);
  assert.equal(queue.get(coord), undefined);
  const committed = queue.process(1, (chunk, revision) => ({ coord: chunk, revision, values: new Uint8Array([revision]) }));
  assert.equal(committed[0]?.revision, 2);
  assert.equal(queue.get(coord)?.values[0], 2);
  assert.equal(queue.pendingCount(), 0);
});

test('SnapshotBuffer orders, bounds, and interpolates snapshots', () => {
  const buffer = new SnapshotBuffer<number>(2);
  buffer.push({ tick: 2, state: 20 });
  buffer.push({ tick: 1, state: 10 });
  buffer.push({ tick: 3, state: 30 });
  assert.equal(buffer.size(), 2);
  assert.equal(buffer.sample(1, (a, b, alpha) => a + (b - a) * alpha), 20);
  assert.equal(buffer.sample(2.5, (a, b, alpha) => a + (b - a) * alpha), 25);
  assert.equal(buffer.sample(99, (a) => a), 30);
});

test('PredictionClient replays only unacknowledged commands after reconciliation', () => {
  const client = new PredictionClient(0, {
    clone: (state) => state,
    apply: (state, command) => state + Number(command.payload),
    measureCorrection: (before, after) => Math.abs(after - before),
  });
  client.queue({ sequence: 1, type: 'move', payload: 2 });
  client.queue({ sequence: 2, type: 'move', payload: 3 });
  const result = client.reconcile({ tick: 4, state: 2 }, 1);
  assert.equal(result.state, 5);
  assert.equal(result.acknowledged, 1);
  assert.equal(result.correction, 0);
  assert.equal(client.pendingCount(), 1);
});

test('AdapterRegistry keeps consumer game rules behind an explicit boundary', () => {
  const registry = new AdapterRegistry<number>();
  registry.register({ id: 'fixture', initialState: 0, update: (state, dt) => state + dt });
  assert.deepEqual(registry.list(), ['fixture']);
  assert.equal(registry.get('fixture').update(1, 0.5), 1.5);
  assert.throws(() => registry.get('missing'), /Unknown game adapter/);
});

test('AdapterHost mounts, steps, and submits without owning consumer rules', () => {
  const host = new AdapterHost(echoesAdapter);
  assert.equal(host.currentTick, 0);
  host.step(1 / 60);
  host.submit({ id: 'a1', kind: 'END_TURN', payload: {} });
  assert.equal(host.currentTick, 1);
  assert.equal(host.currentState.pendingActions.length, 1);
});

test('consumer adapter fixtures preserve distinct turn and realtime modes', () => {
  const turnAction = { sequence: 1, type: 'MOVE_FLEET', payload: { target: 'star-2' } };
  const input = { sequence: 1, type: 'MOVE', payload: { x: 1, z: 0 } };
  const echoes = echoesAdapter.submitCommand?.(echoesAdapter.initialState, turnAction);
  const mrpg = mrpgAdapter.submitCommand?.(mrpgAdapter.initialState, input);
  assert.equal(echoes?.mode, 'turn-based');
  assert.equal(echoes?.pendingActions.length, 1);
  assert.equal(mrpg?.mode, 'real-time');
  assert.equal(mrpgAdapter.update(mrpgAdapter.initialState, 1).tick, 1);
});

test('QualityController changes tier only after sustained evidence', () => {
  const controller = new QualityController('high');
  controller.observe(30);
  controller.observe(30);
  assert.equal(controller.tier, 'high');
  controller.observe(30);
  assert.equal(controller.tier, 'medium');
  for (let i = 0; i < 30; i += 1) controller.observe(5);
  assert.equal(controller.tier, 'high');
});

test('SeededRandom and EventBus are deterministic and unsubscribable', () => {
  const first = new SeededRandom('aion');
  const second = new SeededRandom('aion');
  assert.deepEqual([first.next(), first.next()], [second.next(), second.next()]);
  type Events = { ready: { id: string } };
  const bus = new EventBus<Events>();
  let calls = 0;
  const off = bus.on('ready', () => { calls += 1; });
  bus.emit('ready', { id: 'fixture' });
  off();
  bus.emit('ready', { id: 'fixture' });
  assert.equal(calls, 1);
});

test('FloatingOrigin keeps render positions close while retaining world offset', () => {
  const origin = new FloatingOrigin({ threshold: 100 });
  assert.deepEqual(origin.recenter({ x: 150, y: 0, z: 0 }), { x: 0, y: 0, z: 0 });
  assert.deepEqual(origin.toRender({ x: 175, y: 0, z: -5 }), { x: 25, y: 0, z: -5 });
});

test('chunk worker seam preserves request identity and revision', () => {
  const response = handleChunkWorkerRequest(
    { id: 7, coord: { x: 2, y: 0, z: -1 }, revision: 4 },
    (coord, revision) => ({ coord, revision, values: new Uint8Array([coord.x, revision]) }),
  );
  assert.equal(response.id, 7);
  assert.deepEqual(response.payload.coord, { x: 2, y: 0, z: -1 });
  assert.equal(response.payload.revision, 4);
});

test('testkit validates evidence uniqueness and applies capture state safely', async () => {
  assert.doesNotThrow(() => validateEvidenceManifest({ version: 1, runId: 'pass-1', captures: [
    { mode: 'desktop', state: 'active-play', report: 'desktop.json' },
    { mode: 'mobile', state: 'active-play', report: 'mobile.json' },
  ] }));
  assert.throws(() => validateEvidenceManifest({ version: 1, runId: 'pass-1', captures: [
    { mode: 'desktop', state: 'active-play', report: 'a.json' },
    { mode: 'desktop', state: 'active-play', report: 'b.json' },
  ] }), /distinct/);
  const calls: string[] = [];
  const hooks: TestHooks = {
    seed: (seed) => calls.push(`seed:${seed}`),
    setState: (state) => { calls.push(`state:${state}`); return { state }; },
    setPausedForScreenshot: (paused) => calls.push(`paused:${paused}`),
    hideDebugUi: () => calls.push('hide-debug'),
  };
  await applyCaptureState(hooks, 42, 'active-play');
  assert.deepEqual(calls, ['paused:false', 'seed:42', 'state:active-play', 'paused:true', 'hide-debug']);
});
