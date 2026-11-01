# SceneSpec prompt vocabulary appendix

Status: **reference for agents/humans writing SceneSpec intent** — not a runtime dependency.  
Source inspiration: [gamedev-cheatsheet.com](https://gamedev-cheatsheet.com) (bookmarked 2026-11-01); phrases rewritten for Forge’s **closed SceneSpec** (no invented Three.js APIs).

Use these when drafting or repairing scenes with LLM/`repair_scene_spec`. Stay inside `packages/scene` vocabulary (`studio|sunset|night`, mesh geometries, `#RRGGBB`, `orbit`/`fixed`, `rotatable`/`orbit-target`, `model.asset` ids).

## Framing (pasteable)

```text
Describe a closed SceneSpec v1 JSON scene only: environment, orbit/fixed camera, mesh or model entities.
Use hex colours #RRGGBB. Prefer box/sphere/cylinder/icosahedron/plane. One orbit-target max.
Do not invent shaders, lights arrays, loaders, or game rules.
```

## Concept → SceneSpec wording

| Idea (cheatsheet) | Say this for SceneSpec | Avoid |
| --- | --- | --- |
| Camera / framing | `camera.type "orbit"`, `target` an existing entity id, `radius` and `elevation` for distance/height | Custom FOV/projection fields |
| Focus / hero | Put `orbit-target` on the primary mesh; keep other entities without it | Multiple orbit-targets |
| Placement | `position` / `rotation` / `scale` as Vec3 on entities | Raw Matrix4 / parenting trees |
| Colour / material | `material.type "standard"`, `color "#RRGGBB"`, optional roughness/metalness/emissive | Named CSS colours, shader strings |
| Prop vs asset | Primitive `type: "mesh"` for blockouts; `type: "model"` + `model.asset` only after MCP `register_asset` | URLs, file paths, GLB blobs in JSON |
| Spin / idle | `components: ["rotatable"]` on meshes that should spin | Animation clips / mixers |
| Environment mood | `environment: "studio" \| "sunset" \| "night"` | Custom HDR / PMREM fields |
| Provenance | `meta.source`, `meta.ref`, `meta.note` | Runtime behaviour flags |

## Repair nudges

When validation fails, steer the model with:

- “Replace named colours with `#RRGGBB`.”
- “Set `environment` to one of studio, sunset, night.”
- “Point `camera.target` at an entity `id` that exists, or remove target.”
- “Drop unknown components; only `rotatable` and `orbit-target` are allowed.”
- “If geometry is invented, fall back to `box` (or refuse and ask for a catalog mesh).”

## Out of scope here

Raycasts, LOD, frustum culling, fragment shaders, coyote time, hit-stop, etc. belong in **game/runtime** packages or playground code — not SceneSpec. See [2026-11-01-x-bookmarks-threejs.md](../research/2026-11-01-x-bookmarks-threejs.md).
