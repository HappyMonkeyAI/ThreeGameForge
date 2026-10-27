import assert from 'node:assert/strict';
import test from 'node:test';
import { FixedStepRuntime, RuntimeClock, RuntimeDiagnostics, RuntimeLifecycle } from '../packages/runtime/src/index.ts';
import { AudioBus } from '../packages/audio/src/index.ts';
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
import { KeyboardInput } from '../packages/input/src/index.ts';

test('RuntimeClock advances fixed steps and clamps long frames', () => {
  const clock = new RuntimeClock(0.1, 0.25, 0);
  const updates: number[] = [];
  clock.advance(1000, (dt) => updates.push(dt));
  assert.equal(updates.length, 2);
  assert.equal(clock.steps, 2);
  assert.equal(clock.elapsed, 0.25);
  assert.ok(Math.abs(clock.advance(1000, () => undefined) - 0.5) < 1e-9);
});

test('RuntimeClock rejects step sizes that would never terminate', () => {
  assert.throws(() => new RuntimeClock(0, 0.1, 0), /Fixed step/);
  assert.throws(() => new RuntimeClock(Number.NaN, 0.1, 0), /Fixed step/);
  assert.throws(() => new RuntimeClock(0.1, -1, 0), /Max frame delta/);
});

function scheduledRuntime() {
  const queue = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;
  let steps = 0;
  const renders: Array<{ alpha: number; time: number }> = [];
  const runtime = new FixedStepRuntime(() => { steps += 1; }, (alpha, time) => renders.push({ alpha, time }), {
    fixedStep: 1 / 64,
    maxFrameDelta: 0.1,
    now: () => 0,
    requestFrame: (callback) => { queue.set(nextHandle, callback); return nextHandle++; },
    cancelFrame: (handle) => { queue.delete(handle); },
  });
  const flush = (time: number): void => {
    const pending = [...queue.values()];
    queue.clear();
    for (const callback of pending) callback(time);
  };
  return { runtime, queue, flush, renders, steps: () => steps };
}

test('FixedStepRuntime does not simulate time spent paused', () => {
  const { runtime, flush, steps } = scheduledRuntime();
  runtime.start();
  flush(1000);
  flush(1062.5);
  assert.equal(steps(), 4);
  runtime.setPaused(true);
  flush(6000);
  assert.equal(steps(), 4);
  runtime.setPaused(false);
  flush(6000);
  assert.equal(steps(), 4, 'first frame after resume only re-anchors the clock');
  flush(6015.625);
  assert.equal(steps(), 5);
});

test('FixedStepRuntime start is idempotent and stop cancels the pending frame', () => {
  const { runtime, queue, flush, renders } = scheduledRuntime();
  runtime.start();
  runtime.start();
  assert.equal(queue.size, 1);
  flush(16);
  assert.equal(queue.size, 1);
  assert.equal(renders.at(-1)?.time, 16);
  runtime.stop();
  assert.equal(queue.size, 0);
  assert.equal(runtime.running, false);
  runtime.frame(32);
  assert.equal(queue.size, 0, 'manual frames never schedule');
});

test('RuntimeDiagnostics reports the interval between recorded frames', () => {
  const diagnostics = new RuntimeDiagnostics();
  diagnostics.recordFrame(1000, 0);
  assert.equal(diagnostics.snapshot().frameDeltaMs, 0);
  diagnostics.recordFrame(1016.5, 1);
  diagnostics.recordFrame(1050, 3);
  assert.deepEqual(diagnostics.snapshot(), { frameDeltaMs: 33.5, frames: 3, simulationSteps: 3 });
});

test('AudioBus combines bus and master volume and honours master mute', () => {
  const audio = new AudioBus();
  audio.setVolume('master', 0.5);
  audio.setVolume('effects', 0.4);
  assert.equal(audio.volume('master'), 0.5);
  assert.equal(audio.volume('effects'), 0.2);
  audio.setMuted('master', true);
  assert.equal(audio.volume('effects'), 0);
  audio.setMuted('master', false);
  audio.setMuted('effects', true);
  assert.equal(audio.volume('effects'), 0);
  assert.equal(audio.volume('music'), 0.5);
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

test('AssetRegistry disposes once under concurrent release and tolerates failed loads', async () => {
  const manifest = new AssetManifest();
  manifest.register({ id: 'ok', source: 'local://ok', license: 'test' });
  manifest.register({ id: 'broken', source: 'local://broken', license: 'test' });
  let releases = 0;
  const registry = new AssetRegistry(manifest, async (entry) => {
    if (entry.id === 'broken') throw new Error('load failed');
    return { id: entry.id };
  }, () => { releases += 1; });
  void registry.loadAsset('ok');
  await Promise.all([registry.release('ok'), registry.release('ok')]);
  assert.equal(releases, 1);
  await assert.rejects(registry.loadAsset('broken'), /load failed/);
  await registry.release('broken');
  assert.equal(releases, 1);
  assert.throws(() => registry.loadAsset('broken'), /disposed/);
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

test('ChunkResidency skips recomputation while the center is unchanged', () => {
  const residency = new ChunkResidency(1);
  residency.update({ x: 0, y: 0, z: 0 });
  assert.deepEqual(residency.update({ x: 0, y: 0, z: 0 }), { load: [], unload: [] });
  assert.equal(residency.size(), 27);
  assert.equal(residency.update({ x: 0, y: 1, z: 0 }).load.length, 9);
});

test('DirtyChunkQueue never regresses a committed chunk and honours the batch limit', () => {
  const queue = new DirtyChunkQueue();
  const generator = (coord: { x: number; y: number; z: number }, revision: number) => ({ coord, revision, values: new Uint8Array([revision]) });
  const coord = { x: 0, y: 0, z: 0 };
  queue.markDirty(coord, 3);
  queue.process(1, generator);
  queue.markDirty(coord, 2);
  assert.equal(queue.pendingCount(), 0, 'stale revision ignored');
  assert.equal(queue.get(coord)?.revision, 3);
  for (let x = 1; x <= 3; x += 1) queue.markDirty({ x, y: 0, z: 0 }, 1);
  assert.equal(queue.process(2, generator).length, 2);
  assert.equal(queue.pendingCount(), 1);
  assert.equal(queue.process(0, generator).length, 0);
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

test('PredictionClient rejects reused sequences and ignores stale snapshots', () => {
  const client = new PredictionClient(0, {
    clone: (state) => state,
    apply: (state, command) => state + Number(command.payload),
  });
  client.queue({ sequence: 1, type: 'move', payload: 2 });
  assert.throws(() => client.queue({ sequence: 1, type: 'move', payload: 2 }), /must increase/);
  client.queue({ sequence: 2, type: 'move', payload: 3 });
  assert.equal(client.reconcile({ tick: 10, state: 5 }, 2).applied, true);
  const late = client.reconcile({ tick: 9, state: 0 }, 1);
  assert.equal(late.applied, false);
  assert.equal(late.state, 5, 'late packet did not roll prediction back');
  assert.equal(late.acknowledged, 2);
  assert.equal(client.predictedState, 5);
});

test('PredictionClient applies same-tick acknowledgements but never an older tick', () => {
  const client = new PredictionClient(0, {
    clone: (state) => state,
    apply: (state, command) => state + Number(command.payload),
  });
  client.queue({ sequence: 1, type: 'move', payload: 1 });
  client.queue({ sequence: 2, type: 'move', payload: 1 });
  client.queue({ sequence: 3, type: 'move', payload: 1 });
  assert.equal(client.reconcile({ tick: 10, state: 1 }, 1).state, 3);
  const sameTick = client.reconcile({ tick: 10, state: 2 }, 2);
  assert.equal(sameTick.applied, true, 'same tick with a newer acknowledgement is current');
  assert.equal(sameTick.state, 3);
  assert.equal(client.pendingCount(), 1);
  // An older tick must be dropped even if its acknowledgement advanced; accepting it would
  // rebase prediction on superseded authoritative state.
  const olderTick = client.reconcile({ tick: 9, state: -100 }, 3);
  assert.equal(olderTick.applied, false);
  assert.equal(olderTick.state, 3);
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
  host.submit({ sequence: 1, type: 'END_TURN', payload: {} });
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

test('QualityController changes tier only after a sustained window', () => {
  const controller = new QualityController('high', { window: 4, upgradeCooldown: 0 });
  for (let i = 0; i < 3; i += 1) controller.observe(30);
  assert.equal(controller.tier, 'high');
  controller.observe(30);
  assert.equal(controller.tier, 'medium');
  for (let i = 0; i < 4; i += 1) controller.observe(5);
  assert.equal(controller.tier, 'high');
});

test('QualityController holds high tier through 60Hz vsync jitter', () => {
  // Interval pattern measured in the playground: about half the frames land just over 16.7ms.
  const controller = new QualityController('high');
  for (let i = 0; i < 600; i += 1) controller.observe(i % 2 === 0 ? 15.2 : 18.1);
  assert.equal(controller.tier, 'high');
  controller.observe(0);
  controller.observe(Number.NaN);
  assert.equal(controller.tier, 'high', 'non-evidence samples are ignored');
});

test('QualityController waits out the upgrade cooldown and backs off after a failed probe', () => {
  const controller = new QualityController('high', { window: 2, upgradeCooldown: 10 });
  const feed = (ms: number, frames: number): void => { for (let i = 0; i < frames; i += 1) controller.observe(ms); };
  feed(19, 2);
  assert.equal(controller.tier, 'medium');
  feed(16.6, 9);
  assert.equal(controller.tier, 'medium', 'cooldown blocks the upgrade');
  feed(16.6, 1);
  assert.equal(controller.tier, 'high');
  feed(19, 2);
  assert.equal(controller.tier, 'medium', 'probe failed');
  feed(16.6, 19);
  assert.equal(controller.tier, 'medium', 'cooldown doubled to 20 frames');
  feed(16.6, 1);
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

test('EventBus isolates throwing handlers and drops empty listener sets', () => {
  type Events = { tick: number };
  const bus = new EventBus<Events>();
  const seen: string[] = [];
  bus.on('tick', () => { throw new Error('first'); });
  const offSecond = bus.on('tick', () => { seen.push('second'); });
  assert.throws(() => bus.emit('tick', 1), /first/);
  assert.deepEqual(seen, ['second'], 'later handlers still ran');
  const offThird = bus.on('tick', () => { throw new Error('third'); });
  assert.throws(() => bus.emit('tick', 2), (error: unknown) => error instanceof AggregateError && error.errors.length === 2);
  offSecond();
  offThird();
  const late: number[] = [];
  const fresh = new EventBus<Events>();
  const off = fresh.on('tick', (n) => { fresh.on('tick', (m) => late.push(m)); late.push(n * 10); });
  fresh.emit('tick', 1);
  assert.deepEqual(late, [10], 'handlers added during emit wait for the next emit');
  off();
  fresh.emit('tick', 2);
  assert.deepEqual(late, [10, 2]);
});

test('KeyboardInput tracks keys per code and clears on blur', () => {
  const listeners = new Map<string, (event: KeyboardEvent) => void>();
  const target = {
    addEventListener: (type: string, listener: (event: KeyboardEvent) => void) => { listeners.set(type, listener); },
    removeEventListener: (type: string) => { listeners.delete(type); },
  } as unknown as Pick<Window, 'addEventListener' | 'removeEventListener'>;
  const input = new KeyboardInput([
    { action: 'left', code: 'ArrowLeft' },
    { action: 'left', code: 'KeyA' },
  ], target);
  const key = (type: string, code: string) => listeners.get(type)?.({ code } as KeyboardEvent);
  key('keydown', 'ArrowLeft');
  key('keydown', 'KeyA');
  key('keyup', 'ArrowLeft');
  assert.equal(input.isPressed('left'), true, 'second bound key still held');
  key('keyup', 'KeyA');
  assert.equal(input.isPressed('left'), false);
  key('keydown', 'KeyA');
  listeners.get('blur')?.({} as KeyboardEvent);
  assert.equal(input.isPressed('left'), false, 'focus loss releases held keys');
  input.dispose();
  assert.equal(listeners.size, 0, 'dispose removes listeners from the constructor target');
});

test('FloatingOrigin keeps render positions close while retaining world offset', () => {
  const origin = new FloatingOrigin({ threshold: 100 });
  assert.deepEqual(origin.recenter({ x: 150, y: 0, z: 0 }), { x: 0, y: 0, z: 0 });
  assert.deepEqual(origin.toRender({ x: 175, y: 0, z: -5 }), { x: 25, y: 0, z: -5 });
});

test('FloatingOrigin recenters repeatedly without accumulating offset error', () => {
  const origin = new FloatingOrigin({ threshold: 100 });
  origin.recenter({ x: 150, y: 0, z: 0 });
  assert.deepEqual(origin.recenter({ x: 220, y: 0, z: 0 }), { x: 70, y: 0, z: 0 }, 'below threshold: no shift');
  assert.deepEqual(origin.offset, { x: 150, y: 0, z: 0 });
  assert.deepEqual(origin.recenter({ x: 260, y: 0, z: 0 }), { x: 0, y: 0, z: 0 });
  assert.deepEqual(origin.offset, { x: 260, y: 0, z: 0 });
  assert.deepEqual(origin.recenter({ x: 270, y: -5, z: 0 }), { x: 10, y: -5, z: 0 });
  assert.deepEqual(origin.offset, { x: 260, y: 0, z: 0 });
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
