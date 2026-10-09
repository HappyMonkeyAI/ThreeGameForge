# Large-world lessons for ThreeGameForge

Recorded 2026-10-09. Documentation transfer only; no runtime implementation or performance verification in ThreeGameForge.

## Provenance and applicability

These lessons come from `SPhillips1337/ttd-3js`, implementation commit `ebdce8bf4cc8e5e35082e2a327abc0e2d36ecd28`:

- [Architecture context](https://github.com/SPhillips1337/ttd-3js/blob/ebdce8bf4cc8e5e35082e2a327abc0e2d36ecd28/CONTEXT.md): architecture and immutable simulation boundaries. The separate local LTM follow-up is not yet published.
- [Size-gate evidence](https://github.com/SPhillips1337/ttd-3js/blob/ebdce8bf4cc8e5e35082e2a327abc0e2d36ecd28/LARGE_WORLD_SIZE_GATES.md): ordered 512²/1024² workloads, native browser saves, main/PIP traversal, resizing and production checks.
- [Source reconciliation](https://github.com/SPhillips1337/ttd-3js/blob/ebdce8bf4cc8e5e35082e2a327abc0e2d36ecd28/LARGE_WORLD_REVIEW.md): external review proposals reconciled with source and measurements.

Framework source was inspected at `ca490c127d061e9d554e071c07dd065478d02d42`. The consumer uses Three.js r184/WebGPU; this framework declares Three.js ^0.170.0 and a WebGL2 baseline. Transfer principles and contracts after checking compatibility. No source code or assets have been copied, and no new consumer integration is claimed.

## Lessons and local boundaries

### 1. Measure simulation, allocation, rendering and persistence separately

A cheap terrain plane does not imply a cheap world. Repeated membership scans, whole-map instance allocation and serialization can dominate different operations. Compare fixed entity counts and increasing density, include moving entities, and record generation, fixed-step CPU, serialization and browser costs separately.

**Framework mapping:** [runtime diagnostics](../../../packages/runtime/src/index.ts) and [renderer metrics](../../../packages/renderer/src/index.ts). `RuntimeDiagnostics.snapshot().frameDeltaMs` currently measures time since the last recorded frame; it is not a rolling frame-interval percentile. Do not present it as the consumer's measured p95. A future diagnostics contract should distinguish frame interval, step CPU, submission CPU and GPU duration, and aggregate all active render views.

**Boundary:** Benchmark domain fixtures and storage latency belong to the consumer. Renderer resource counters are not total VRAM. Hardware, viewport, workload caps, warmup and transient maxima must accompany performance claims.

### 2. Preserve authoritative state independently of visual residency

The transport consumer continued off-screen deliveries and town growth while detail chunks were absent. Visual unload should release presentation resources without changing authoritative game state.

**Framework mapping:** [world package](../../../packages/world/src/index.ts) already separates generation payloads from rendering; [architecture](../../../ARCHITECTURE.md) assigns authoritative state to games. Document residency callbacks as presentation lifecycle operations. Games decide whether their simulations stream and how unloaded simulation state progresses.

**Boundary:** The consumer still stores whole-world heights and runs whole-world simulation. Its visual streaming is not proof of infinite-world simulation streaming, terrain elevation LOD, or network synchronization.

### 3. Select residency for all active views, with separate load/retain margins

Single-camera selection can discard remote content needed by a vehicle PIP, minimap or secondary viewport. Conservative bounding-volume/frustum intersection avoids horizon gaps associated with ground-corner rays. Fresh matrices, view offsets, map bounds and object height ranges matter.

**Framework mapping:** `ChunkResidency.update(center)` in [world](../../../packages/world/src/index.ts) currently selects a cubic radius around one center. Multi-view wanted/retained sets and priority ordering are proposed extensions, not current capabilities. Keep coordinate logic renderer-neutral; a Three.js adapter can produce the required sets.

**Boundary:** The consumer uses 32-tile chunks, visible+one load ring and visible+two retain rings. Those values and its y=-0.5..8 slabs are project-specific. Actual canvas resizing, distant teleport and an independently positioned second view are necessary acceptance cases.

### 4. Share build budgets across layers and bound pools by capacity

Chunking alone does not prevent stalls when catch-up steps or commands allocate visuals repeatedly. Open one budget per rendered frame, allow invalidation from simulation/commands, prioritize visible demand, recheck stale queued work and avoid starvation between layers. Bound pools by count and allocated instance capacity; repeated traversal should reach a plateau.

**Framework mapping:** `DirtyChunkQueue.process(maxChunks, generator)` in [world](../../../packages/world/src/index.ts) is synchronous and count-limited. It does not currently implement an elapsed-time budget, residency pruning, priorities, shared render-frame scheduling or resource pooling. [AssetRegistry](../../../packages/assets/src/index.ts) supplies explicit release ownership, but is not a chunk-mesh pool.

**Boundary:** A deadline cannot preempt a single build. The consumer's 4ms/four-build budget and eight-chunk/4096-capacity pools are reference settings, not framework defaults. Define shared-resource ownership before disposal so one chunk cannot dispose geometry used by others.

### 5. Coarse-to-detail transitions need readiness and hysteresis

An overview can keep rendering bounded at large zoom distances. Separate enter/exit thresholds prevent oscillation; coarse coverage must remain until the current detail demand is ready, including entity/layout revisions. Camera layers can keep a secondary view detailed.

**Framework mapping:** Future world/renderer adapters may expose readiness and transition hooks. Product-specific overview rasterization, vehicle dots, zoom thresholds and construction restrictions remain with games. This behavior is not implemented by the current residency seam.

**Boundary:** A coarse overview is not terrain mesh LOD. Test zoom reversal, fast teleport, stale queued work and scene cleanup before reusing the pattern.

### 6. Cache immutable layouts without exposing mutable indexes

WeakMap membership caches avoided repeated Set construction in the consumer. This depends on unchanged layouts retaining identity and changed layouts receiving new arrays. A query-only facade prevents mutation of the private Set; `ReadonlySet` or `Object.freeze(new Set())` alone is insufficient. Callback arguments must not leak the mutable backing collection.

**Framework mapping:** This is guidance for consumer snapshots and any future reusable index utility. It does not justify adding transport-road caches or changing payload representations in the framework. Cache only after measuring and make immutability an explicit contract.

**Boundary:** In-place mutation invalidates identity caches. A membership index is not hierarchical routing. The consumer met its local targets without rewriting authoritative state into dense typed arrays.

### 7. Persistence and async scene races remain consumer responsibilities

IndexedDB request success can precede transaction abort. Durable save success requires transaction completion, queued migration/read/write operations, validated payloads, retained recovery copies and clear failure UI. Guard delayed scene results with a generation token so startup/load cannot overwrite a new game; await save completion before leaving.

**Framework mapping:** Games own persistence per [architecture](../../../ARCHITECTURE.md). Lifecycle/adapters may provide cancellation or generation-identity hooks if multiple consumers need them, but storage schemas, migration rules, dialogs and saved terrain remain game-owned.

**Boundary:** Async storage does not move JSON serialization off the main thread. A seed cannot reconstruct edited terrain without generator version/options and a complete edit contract. Native transaction/migration evidence does not establish quota/eviction guarantees.

### 8. Evidence must survive reuse without overstating it

Repeat warm traversals, inspect bounded resources, close competing renderers, report cold loads and hitch maxima separately, and cross-check ordinary production flows after synthetic fixtures. Confirm diagnostics have refreshed after replacing a scene; immediate HUD values may belong to its predecessor. Keep development fault/benchmark branches out of production bundles.

**Framework mapping:** [testkit](../../../packages/testkit/src/index.ts), browser evidence and consumer-adapter gates should retain run identity, workload, device/backend, viewport, timing definitions, commands and remaining gaps. Implementation checks, owner review, publication and deployment are separate states.

**Boundary:** The consumer's warmed targets were frame p95<=20ms, step CPU p95<=4ms and submission CPU p95<=8ms, with 64-town/32-industry-pair caps and 20-truck synthetic fleets. Pan/transition maxima of 51..68ms and a cold-load maximum of 283.5ms remained. These are local results, not ThreeGameForge benchmarks, minimum hardware requirements or uninterrupted 60fps guarantees.

## Retrieval and revision

Read this record before expanding world streaming, frame diagnostics, resource lifecycle or async adapter transitions. Promote a lesson to an ADR/public API only after a bounded task and relevant consumer evidence. Supersede changed assumptions with source links and dates; keep measurements in their original evidence record and executable tasks in `TASKS.md`.
