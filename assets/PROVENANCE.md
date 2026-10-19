# Asset provenance (ThreeGameForge)

## Policy

Do not copy consumer game binaries into this repository until asset-specific license text is recorded and redistribution is explicitly approved. SceneSpec `model.asset` ids name host-resolved sources; Forge does not ship those bytes by default.

## Local sandbox sibling (not tracked here)

| Asset id | Sibling path | SHA-256 | Rights |
| --- | --- | --- | --- |
| `crate-pixal3d` | `../FilteredLivingPainting/assets/generated/crate-pixal3d-decimated.glb` | `0eb743cb05ef191d6f3170e94908a3f9103e47274a0631d2a09224b49cc3a2b6` | **Local/sandbox only** per FilteredLivingPainting `assets/PROVENANCE.md` (owner ruling 2026-10-07). Not cleared for public, commercial, or promotional use. Do not publish or redistribute from this repo. |

Playground resolution (dev only): Vite `/@fs/...` into the sibling file when present; otherwise a procedural box stand-in. Production builds must not embed this GLB unless rights are re-cleared.
