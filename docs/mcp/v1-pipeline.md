# GameForge MCP v1 — asset pipeline (incubation)

Status: catalog + host status tools landed; queue/poll/register not yet wired.

## Thesis

Agents get **named recipes**, not raw Comfy graphs. Workflow JSON stays in the sibling `threejs-pipeline` reference tree (source material). Forge MCP only knows recipe ids, required inputs, and host env for ComfyUI / Blender / admit paths.

## Tools

| Tool | Status | Purpose |
| --- | --- | --- |
| `list_pipeline_recipes` | **live** | Closed recipe catalog |
| `get_pipeline_host_status` | **live** | Reachability of ComfyUI (`TGF_COMFYUI_BASE_URL`) |
| `queue_concept_image` | planned | Submit text→image via a named recipe |
| `queue_image_to_3d` | planned | Submit image→GLB (Pixal3D / TRELLIS.2) |
| `poll_job` | planned | Poll one job; never clear/cancel foreign queue work |
| `inspect_glb` | planned | Triangle/material/bounds summary |
| `blender_clean_glb` | planned | Host Blender script when available |
| `register_asset` | planned | Admit GLB + provenance → `model.asset` id for SceneSpec |

## Recipe ids (v1 closed set)

| Id | Stage | Sibling reference (not a runtime dep) |
| --- | --- | --- |
| `concept-flux2-klein` | text→image | `threejs-pipeline` / `image_flux2_klein_text_to_image.json` |
| `concept-z-image-turbo` | text→image | `image_z_image_turbo.json` |
| `i2_3d-pixal3d` | image→GLB | `drone_pixal3d.json` / Pixal3D path |
| `i2_3d-trellis2` | image→GLB | `drone_trellis2.json` / TRELLIS.2 path |

Video, SAM 3D Body, and multiview stay out of v1.

## Host env

| Var | Role |
| --- | --- |
| `TGF_COMFYUI_BASE_URL` | e.g. `http://192.168.5.157:8188` — optional; status reports disconnected if unset |
| `TGF_PIPELINE_REF_ROOT` | Absolute path to local `threejs-pipeline` checkout (optional catalog hint) |
| `TGF_ASSET_ADMIT_DIR` | Sandbox admit directory for `register_asset` (planned) |

Do not publish these defaults inside `@happymonkeyai/scene`.

## Evidence to mirror (FP-037)

FilteredLivingPainting FP-037: ComfyUI reachable from .229; raw GLB admitted with provenance; Blender cleanup only when `blender.exe` exists on the acting host. Rights remain sandbox until licence text is hand-verified.

## Exit for “v1 done”

One sandbox prop: prompt → admitted asset id → SceneSpec `type: "model"` entity applied in MCP session, with provenance sidecar and no uncleared GLB in Git.
