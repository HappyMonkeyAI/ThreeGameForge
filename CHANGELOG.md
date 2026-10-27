# Changelog

All `@happymonkeyai/*` packages are versioned and released together. Under 0.x semver,
a minor bump may contain breaking changes; each is listed with its migration.

## 0.2.0 — 2026-10-27

Fixes defects found in a full framework review ([PR #1](https://github.com/HappyMonkeyAI/ThreeGameForge/pull/1)).
Upgrade all packages together.

### Breaking changes and migration

| Package | Change | Migration |
| --- | --- | --- |
| `core` | `SeededRandom` uses sfc32 instead of a 32-bit LCG, so **every seed produces a different sequence**. `integer()` now throws `RangeError` for non-integer bounds. | Regenerate any stored seeded content, fixtures or snapshots you compare against. Pass integer bounds to `integer()`. |
| `runtime` | `RuntimeDiagnostics.snapshot()` takes no `now` argument; `frameDeltaMs` is now the interval between the two most recently recorded frames. | Call `recordFrame(rafTime, steps)` once per frame with the frame timestamp, then `snapshot()`. |
| `runtime` | `FixedStepRuntime` render callback receives `(alpha, time)`. `frame()` no longer schedules the next frame. | Use `start()` / `stop()` for the rAF loop; call `frame()` only from your own scheduler. |
| `input` | `KeyboardInput.dispose()` takes no argument; it removes listeners from the constructor target. | Drop the argument. |
| `networking` | `PredictionClient.queue()` throws `RangeError` for a non-increasing `sequence`. `reconcile()` ignores snapshots older than the last applied one and returns `applied: false` for them. | Give each command a strictly increasing sequence; check `applied` if you act on reconciliation results. |
| `renderer` | `QualityController` decides on a rolling mean (default 30 frames, 10% tolerance) with an upgrade cooldown that backs off, instead of 3 consecutive slow frames. | Pass `{ window, tolerance, upgradeCooldown }` as the second constructor argument to tune. |

### Fixed

- `audio`: `AudioBus.volume()` recursed infinitely on every call; muting `master` now silences all buses.
- `world`: `FloatingOrigin.recenter` accumulated offset on every recenter after the first.
- `runtime`: frame diagnostics reported render-submit CPU time instead of frame interval; resuming from pause simulated up to `maxFrameDelta` of catch-up steps; `start()` twice ran two loops; `RuntimeClock` looped forever on `fixedStep <= 0`.
- `assets`: concurrent `release()` disposed twice; a failed load made `release()` throw.
- `renderer`: once frame intervals were real, 60 Hz vsync jitter downgraded the tier on healthy displays.
- `adapters`: published declarations imported a path that does not exist inside the package, so `NetworkCommand` / `NetworkSnapshot` resolved to `any` for npm consumers.
- `input`: keys stuck after focus loss; releasing one of two keys bound to an action released the action.
- `world`: a stale `markDirty` revision could overwrite a newer committed chunk.
- `core`: one throwing `EventBus` handler stopped the rest (failures are now rethrown after all handlers run, as `AggregateError` when several fail).

### Changed

- `world`: `ChunkResidency.update()` returns immediately when the center is unchanged; `DirtyChunkQueue.process()` no longer copies the whole pending set.
- `ui`: `Overlay.render()` only touches the DOM when content changes.
- `assets`: `release()` documents that a released id is permanently retired.

## 0.1.0 — 2026-09-09

Initial npm release of the 12-package `@happymonkeyai/*` set.
