# HappyMonkeyAI X bookmarks — Three.js / Forge relevance (2026-11-01)

Scanned signed-in Bookmarks (X History → Bookmarks) for @HappyMonkeyAI. Disposition for **ThreeGameForge** only. Not runtime dependencies.

## Recommended next looks (ordered)

### 1. SceneSpec / agent vocabulary — gamedev-cheatsheet.com

- Site: https://gamedev-cheatsheet.com (34 concepts + pasteable prompt lines + animations).
- Overlap with Forge: raycast, LOD, frustum culling, normals, quaternions, delta time, camera deadzone — language that should stay **outside** SceneSpec domain rules but can improve repair/LLM prompts and playground help copy.
- Action: ~~extract prompt phrases~~ → [docs/scene/prompt-vocabulary-appendix.md](../scene/prompt-vocabulary-appendix.md) (2026-11-01).

### 2. Meshlets / GPU-driven Three — PR #35191

- https://github.com/mrdoob/three.js/pull/35191 — merged **2026-10-29**.
- Introduces `renderer.drawingPipeline`, `MeshletDrawingPipeline`, visibility-buffer path under **WebGPURenderer**.
- Action: fold into [2026-11-01-three-r187.md](./2026-11-01-three-r187.md) watchlist; only matters after WebGPU / post-0.180 smoke.

### 3. img2threejs core (already adjacent)

- https://github.com/img2threejs/img2threejs — ~20k★, Apache-2.0, image → procedural Three.js + quality gates.
- Action: keep as MCP admit / provenance peer; `plugin-character` already in `links.md`. No clone into Forge.

### 4. Comfy multi-angle framing

- https://github.com/jtydhr88/ComfyUI-qwenmultiangle — MIT, ~1.4k★; Three.js viewport → angle prompt strings.
- Action: candidate **named recipe** companion for MCP v1 concept→i2_3d (host installs Comfy node; Forge only catalogues).

### 5. Hi3D v1.0 geometry refine

- https://github.com/hi3d-official/Hi3Dv1.0 — ~637★, license **NOASSERTION** on GitHub API → **hand-verify rights** before sandbox.
- Action: optional alternate to Pixal3D/TRELLIS after licence read; do not admit to Git.

### 6. Playground VFX reference (WebGL2)

- https://github.com/Humpalumps/Ultra-Water — FFT ocean, WebGL2.
- https://github.com/Humpalumps/ultra-elements — elemental spell VFX lab.
- Action: playground / demo only; not framework packages.

### 7. Agent skills pack

- https://github.com/gamedev-skills/awesome-gamedev-agent-skills — ~6.4k★, Apache-2.0, three.js among engines.
- Action: compare router/skill shapes to local `threejs-game-skills` / Agents Protocol — process only.

## Deferred / unresolved

| Item | Note |
| --- | --- |
| Qwen3.5-4B-3D-Coder (@dextune Oct 30) | Bookmarked; public FP16/dataset claimed. Exact hub/repo URL not resolved in this pass — re-open the post when running a local-model bake-off. |
| MuTracer 0.2.0 | WebGPU tracer perf — watchlist only. |
| deepseek-ai/dsh-superagent-prototype | Agent ops (~6k★ MIT) — Hermes/ecosystem, not Forge runtime. |

## Explicit non-actions

- Do not bump `three` for meshlets alone.
- Do not `npx skills add` foreign skill packs into Forge without owner review.
- Do not vendor Comfy custom nodes or Hi3D weights into the repo.
