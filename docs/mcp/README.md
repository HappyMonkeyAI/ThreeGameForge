# GameForge MCP v0

stdio MCP server exposing SceneSpec tools so agents can validate, repair, and apply scenes without writing Three.js.

## Tools

| Tool | Purpose |
| --- | --- |
| `get_scene_vocabulary` | Closed SceneSpec enums |
| `validate_scene_spec` | Structured validation errors |
| `repair_scene_spec` | `mode=scripted` (default) or `mode=llm` |
| `apply_scene_spec` | Apply into headless session scene |
| `get_scene_readback` | Current entities / camera |
| `get_diagnostics` | Session + last errors |
| `clear_scene` | Reset session |
| `screenshot` | Returns error in v0 (use playground) |
| `list_pipeline_recipes` | MCP v1 catalog (named recipes only) |
| `get_pipeline_host_status` | Read-only ComfyUI `/system_stats` when `TGF_COMFYUI_BASE_URL` set |
| `queue_concept_image` | Submit named concept recipe (idle queue only) |
| `queue_image_to_3d` | Submit named i2_3d recipe (idle queue only) |
| `poll_job` | Poll one `prompt_id` |
| `register_asset` | Admit `.glb` + provenance → SceneSpec `model.asset` |

## Run

```powershell
npm run mcp
npm run smoke:mcp
```

`smoke:mcp` exercises vocabulary → validate/apply realmfront R0 blockout → scripted repair of the broken twin → readback (headless; no Cursor required).

Cursor / Claude MCP config example:

```json
{
  "mcpServers": {
    "gameforge": {
      "command": "npm",
      "args": [
        "--prefix",
        "C:/Users/steph/Documents/development/ThreeGameForge",
        "run",
        "mcp"
      ],
      "env": {
        "TGF_LLM_BASE_URL": "http://192.168.5.229:1234/v1",
        "TGF_LLM_MODEL": "google/gemma-4-e2b",
        "TGF_COMFYUI_BASE_URL": "http://192.168.5.157:8188",
        "TGF_PIPELINE_REF_ROOT": "C:/Users/steph/Documents/development/threejs-pipeline",
        "TGF_ASSET_ADMIT_DIR": "C:/Users/steph/Documents/development/ThreeGameForge/.sandbox/admitted-assets"
      }
    }
  }
}
```

Use `npm --prefix <repo>` (absolute path) — Cursor may spawn MCP with a non-repo cwd, so relative `packages/mcp/...` + `cwd` fails (`Cannot find module ...\packages\mcp\src\index.ts`).

LLM env vars are only required for `repair_scene_spec` with `mode: "llm"`. Scripted repair needs no network.

## Live evidence

2026-10-19 Cursor `user-gameforge`: `get_scene_vocabulary` → validate/repair `realmfront-r0-broken.json` (scripted, 2 attempts) → `apply_scene_spec` on `realmfront-r0-blockout.json` → readback 15 entity ids / objectCount 17; `screenshot` correctly errors in v0.

Pipeline design: [v1-pipeline.md](./v1-pipeline.md). Live Comfy concept dry-run: [dryrun-2026-10-19-comfy-concept.md](./dryrun-2026-10-19-comfy-concept.md).

## Non-goals (v0 / v1 incubation)

- Arbitrary Comfy/Blender script execution
- Browser screenshot / WebGL presentation in MCP
- Publishing LAN defaults inside `@happymonkeyai/scene`
- Committing uncleared generated GLBs
