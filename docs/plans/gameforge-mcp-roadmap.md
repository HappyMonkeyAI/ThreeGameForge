# GameForge MCP roadmap

Status: direction accepted 2026-10-19 (planning only; not an implementation authorization).

## Thesis

AI agents build Three.js games more reliably through **tools + closed vocabularies** than through raw Three.js codegen. ThreeGameForge owns the runtime and SceneSpec intent plane; local asset generation (ComfyUI → GLB → Blender cleanup) stays a separate pipeline plane; an MCP server is the agent-facing control surface that orchestrates both.

## Planes

| Plane | Owns | Does not own |
| --- | --- | --- |
| Intent | `SceneSpec`, validate, repair, apply | Game domain rules, LLM hosting |
| Runtime | Fixed-step loop, camera, assets registry, diagnostics | ComfyUI / Blender / Unreal |
| Pipeline | Named generation recipes, cleanup, provenance hashes | Scene graph, tick loop |
| MCP host | Tool routing, LAN endpoint config, sandbox policy | Package LAN defaults inside Forge |

## Phases

### MCP v0 — Forge only (next product slice after playground E2E + repair eval)

Tools (illustrative):

- `validate_scene_spec` / `repair_scene_spec` / `apply_scene_spec`
- `get_scene_readback` / `screenshot` / `get_diagnostics`
- Optional: `start_playground` / `set_scene`

Exit: an agent can fix and apply SceneSpec without writing Three.js, with structured errors.

### MCP v1 — Asset pipeline

Wrap existing `threejs-pipeline` / Filtered FP-037 patterns as **named recipes** (not arbitrary graphs):

- `queue_concept_image` / `queue_image_to_3d` / `poll_job`
- `inspect_glb` / `blender_clean_glb`
- `register_asset` → returns `model.asset` id for SceneSpec

Exit: one sandbox prop from prompt → admitted asset id → SceneSpec model entity, with provenance recorded. Rights remain local/sandbox until licence text is hand-verified.

### MCP v2 — Game-loop aids

Bounded components/presets (input, camera modes, simple behaviours). Still no open-ended shader/physics codegen unless a second consumer proves the seam.

### Later — Unreal bridge

Export/admit cleaned assets into Unreal as a **consumer**, not the primary MCP surface. Same provenance and recipe discipline.

## Immediate Forge work (before MCP server)

1. ~~Playground E2E: broken JSON → repair (local LLM) → apply → canvas readback.~~ Done via `?mode=repair` panel + Vite `/llm` proxy (2026-10-19).
2. Small live repair eval set against `google/gemma-4-e2b` (LAN).
3. ~~Commit `feature/ai-scene-spec-spike` when the owner requests it.~~ Committed/pushed `933dee2`.

## Non-goals

- LLM on the simulation tick
- Hardcoded LAN URLs inside published packages
- Shipping generated weights or uncleared GLBs in Git
- Exposing raw “run any Comfy/Blender script” tools
- Absorbing consumer game domain into Forge

## Related evidence

- ADR-0004 SceneSpec intent layer
- `packages/scene` repair + OpenAI-compatible complete + live Gemma demo
- `threejs-pipeline` desktop agent prompt and ComfyUI recipes
- FilteredLivingPainting FP-037 crate provenance (sandbox-only)
