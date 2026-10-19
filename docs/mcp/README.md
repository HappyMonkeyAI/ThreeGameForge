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

## Run

```powershell
npm run mcp
```

Cursor / Claude MCP config example:

```json
{
  "mcpServers": {
    "gameforge": {
      "command": "npx",
      "args": ["tsx", "packages/mcp/src/index.ts"],
      "cwd": "C:/Users/steph/Documents/development/ThreeGameForge",
      "env": {
        "TGF_LLM_BASE_URL": "http://192.168.5.229:1234/v1",
        "TGF_LLM_MODEL": "google/gemma-4-e2b"
      }
    }
  }
}
```

LLM env vars are only required for `repair_scene_spec` with `mode: "llm"`. Scripted repair needs no network.

## Non-goals (v0)

- ComfyUI / Blender / Unreal
- Browser screenshot / WebGL presentation
- Publishing LAN defaults inside `@happymonkeyai/scene`
