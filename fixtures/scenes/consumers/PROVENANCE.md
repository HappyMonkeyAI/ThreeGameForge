# Consumer SceneSpec fixtures

Copied blockouts from sibling projects. Source of truth for layout intent lives in those repos; this directory is the TGF validate/apply test surface.

| TGF fixture | Upstream |
| --- | --- |
| `filtered-wren-camp-blockout.json` | `FilteredLivingPainting-scenespec` worktree, branch `feature/scenespec-blockout-fixture` → `fixtures/scenespec/wren-camp-good-smoke.scenespec.json` |
| `mercenary-orbit-blockout.json` | `Mercenary4VR` branch `feature/scenespec-blockout-fixture` → `fixtures/scenespec/orbit-blockout.scenespec.json` |

FilteredLivingPainting keeps FP-037 WIP on `fp-037-local-asset-pipeline-test` in the main checkout; SceneSpec fixtures live only in the sibling worktree so they stay separate.

Re-copy after upstream fixture edits. Do not add those games as runtime dependencies.
