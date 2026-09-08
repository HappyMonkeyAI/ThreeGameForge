# Patterns and Lessons

## 2026-09-08 — Keep the first runtime boundary small

The first extracted package contains only fixed-step timing and render scheduling. It has no Three.js or game-domain dependency, which keeps deterministic tests and future consumer adapters straightforward. Extract more services only when a second consumer proves the boundary.

## 2026-09-08 — Resolve sibling consumers from the repository layout

`ThreeGameForge` lives under `development/games`, while `EchoesOfAion` and `MRPGRealms` live directly under `development`. Read-only audits must resolve two parent levels from the framework root. The audit was corrected and now passes all six declared contract checks.

## 2026-09-08 — Keep source compatible with native Node TypeScript

Native Node 24 test execution uses TypeScript strip-only mode, so framework source must avoid constructor parameter properties. Explicit field declarations keep the same type-safe API compatible with both native tests and `tsc` builds.
