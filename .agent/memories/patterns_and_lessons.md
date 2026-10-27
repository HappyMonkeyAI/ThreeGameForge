# Patterns and Lessons

## 2026-10-09 — Large worlds require bounded presentation and precise evidence

See [large-world lessons](codebase_insights/2026-10-09-large-world-lessons.md) for source-backed findings from the transport consumer and their applicability to the current framework. Key patterns: measure separate costs before rewriting state, keep simulation independent of visual residency, cover every active view, share render-frame build budgets, bound resource pools, and distinguish warmed performance from cold-load/hitch behavior. Framework extensions are explicitly marked as proposals; consumer-specific persistence and gameplay remain outside the framework.

## 2026-09-08 — Keep the first runtime boundary small

The first extracted package contains only fixed-step timing and render scheduling. It has no Three.js or game-domain dependency, which keeps deterministic tests and future consumer adapters straightforward. Extract more services only when a second consumer proves the boundary.

## 2026-10-27 — Frame-interval budgets must tolerate vsync jitter

Once `RuntimeDiagnostics` reported real frame intervals, a healthy 60 Hz playground dropped to `medium`: 161 of 300 rAF intervals landed just over the 16.7 ms `high` budget. `QualityController` now decides on a rolling mean with a tolerance, and treats upgrades as probes with a cooldown that backs off, because a vsync-capped display cannot show headroom. Browser readback: holds `high` at 60 Hz, drops to `low` under 30 ms/frame load, recovers about 4.4 s after load ends. Per-frame thresholds that sit exactly on a refresh interval are a smell.

## 2026-10-27 — A skipped audit is not a passing audit

The repository moved to sit directly under `development/`, but `audit-consumers.mjs` still resolved consumers two levels up from `process.cwd()`, so every check printed `SKIP` and non-strict runs (including CI) exited green without checking anything. The script now resolves from its own location (`scripts/../..`) with a `FORGE_CONSUMERS_ROOT` override. Treat all-SKIP output as a failed verification, and prefer `--strict` locally.

## 2026-09-08 — Resolve sibling consumers from the repository layout (superseded)

Originally `ThreeGameForge` lived under `development/games`; see the 2026-10-27 entry for the current layout-independent resolution.

## 2026-09-08 — Keep source compatible with native Node TypeScript

Native Node 24 test execution uses TypeScript strip-only mode, so framework source must avoid constructor parameter properties. Explicit field declarations keep the same type-safe API compatible with both native tests and `tsc` builds.
