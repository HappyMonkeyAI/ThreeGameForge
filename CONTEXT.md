# ThreeGameForge Context

ThreeGameForge is a shared browser-game runtime and tooling project for future Three.js games. It is informed by Echoes of Aion, MRPG Realms, the local Three.js skill packs, and the remote LLM Codex Reference Vault.

## Current state

- Empty Git repository initialized on 2026-09-08.
- First slice is a deterministic fixed-step Three.js playground.
- Echoes of Aion and MRPG Realms remain independent consumers.
- Initial consumer development uses the documented sibling-checkout workspace
  incubation model; versioned package publishing is the planned release path.

## Durable lessons

Source-backed reusable lessons are indexed in `.agent/memories/patterns_and_lessons.md`. The [large-world transfer record](.agent/memories/codebase_insights/2026-10-09-large-world-lessons.md) maps transport-game findings to current framework seams and identifies unimplemented extensions. It records compatibility and evidence limits; no transport code, assets or runtime dependency was imported.

## Constraints

- Browser-first and TypeScript-first.
- WebGL2 is the initial rendering baseline; WebGPU remains an adapter target.
- Game-specific rules and server authority stay outside the framework.
- Asset provenance and licensing must be recorded before reuse.
- Verification must include typecheck/build and, once runtime features mature, browser evidence.
