# Patterns and Lessons

## 2026-10-19 — GameForge MCP is the long-term agent surface

Direction: MCP orchestrates Intent (SceneSpec) + Runtime (Forge) + Pipeline (ComfyUI/Blender recipes); Unreal is a later export consumer. See [gameforge-mcp-roadmap.md](../../docs/plans/gameforge-mcp-roadmap.md). MCP v0 is `@happymonkeyai/gameforge-mcp` (`npm run mcp`): vocabulary, validate, repair (scripted|llm), apply, readback, diagnostics, clear; screenshot deferred. Keep LAN LLM endpoints in MCP host env, not in `@happymonkeyai/scene`.

## 2026-10-19 — AI scene intent needs a closed vocabulary before Three.js

LLMs fail open on raw Three.js (invented APIs, missing draw paths). A versioned `SceneSpec` with validate→structured errors→apply keeps game domain out of the framework while giving models a repairable contract. First package: `packages/scene`. Fixtures live under `fixtures/scenes/`; the playground loads the golden spec only after validation.

Consumer games (FilteredLivingPainting, Mercenary4VR) contribute SceneSpec **blockout JSON** on `feature/scenespec-blockout-fixture`, copied into TGF `fixtures/scenes/consumers/`. Domain systems stay out of the schema; playground switches via `?scene=`.

Repair loop: `repairSceneSpec(input, { repairer })` is host-pluggable; Forge ships `createScriptedSceneRepairer` for converge tests and `createLlmSceneRepairer({ complete })` for host LLMs (prompt + JSON extract only). `createOpenAiCompatibleComplete` talks to OpenAI-compatible servers; some Gemma builds put the answer in `reasoning_content` — `selectCompletionText` falls back. LAN demo: `npm run demo:repair-scene` (env `TGF_LLM_BASE_URL` / `TGF_LLM_MODEL`). Playground E2E: `?mode=repair` panel + Vite proxy `/llm` → LAN OpenAI-compatible host (avoid CORS); hooks expose `validateRepairDraft` / `repairAndApplyDraft`. Live eval: `npm run eval:repair-scene` over `fixtures/scenes/repair/eval` (10 cases); Gemma-4-e2b scored 10/10 on 2026-10-19. Model entities use `type: "model"` + `model.asset` id; `applySceneSpec` is async and requires `loadModel`. Consumer GLBs stay out of the TGF tree; sibling Filtered crate is sandbox-only via Vite `/@fs/` + PROVENANCE hash check.

## 2026-10-09 — Large worlds require bounded presentation and precise evidence

See [large-world lessons](codebase_insights/2026-10-09-large-world-lessons.md) for source-backed findings from the transport consumer and their applicability to the current framework. Key patterns: measure separate costs before rewriting state, keep simulation independent of visual residency, cover every active view, share render-frame build budgets, bound resource pools, and distinguish warmed performance from cold-load/hitch behavior. Framework extensions are explicitly marked as proposals; consumer-specific persistence and gameplay remain outside the framework.

## 2026-09-08 — Keep the first runtime boundary small

The first extracted package contains only fixed-step timing and render scheduling. It has no Three.js or game-domain dependency, which keeps deterministic tests and future consumer adapters straightforward. Extract more services only when a second consumer proves the boundary.

## 2026-09-08 — Resolve sibling consumers from the repository layout

`ThreeGameForge` lives under `development/games`, while `EchoesOfAion` and `MRPGRealms` live directly under `development`. Read-only audits must resolve two parent levels from the framework root. The audit was corrected and now passes all six declared contract checks.

## 2026-09-08 — Keep source compatible with native Node TypeScript

Native Node 24 test execution uses TypeScript strip-only mode, so framework source must avoid constructor parameter properties. Explicit field declarations keep the same type-safe API compatible with both native tests and `tsc` builds.
