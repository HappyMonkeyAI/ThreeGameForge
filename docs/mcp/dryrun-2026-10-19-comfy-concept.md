# MCP ComfyUI concept dry-run — 2026-10-19

## Host

- ComfyUI `http://192.168.5.157:8188`
- Version **0.42.1**, PyTorch **2.14.1+cu130**, RTX 5090 Laptop (~24 GB VRAM free at start)
- Queue was **empty** before submit (no clear/cancel)

## Job

| Field | Value |
| --- | --- |
| Tool | `queue_concept_image` |
| Recipe | `concept-flux2-klein` |
| Source | `threejs-pipeline/image_flux2_klein_text_to_image.json` |
| Seed | `20261019` |
| Prefix | `GameForge/mcp/dryrun_crate_20261019` |
| prompt_id | `d57680a1-46ab-46df-80fa-edcccab88eaf` |
| workflow_sha256 | `d534f001b1e94a6e92769d12041746e2fa17077b5abd6076f2794320b2a741d5` |
| Status | `success` (~50s wall) |
| Output | `GameForge/mcp/dryrun_crate_20261019_00001_.png` (1024×1024) |

Local copy (gitignored): `artifacts/mcp-dryrun/dryrun_crate_20261019_00001_.png`.

## Not in this dry-run

- `queue_image_to_3d` / Pixal3D (needs reviewed input upload)
- `register_asset` (GLB admit)
- Blender cleanup

## Next

Upload concept → `queue_image_to_3d` (`i2_3d-pixal3d`) when ready for a sandbox prop GLB.
