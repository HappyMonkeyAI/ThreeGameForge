# Project links

Owner-shared references for ThreeGameForge. **Not runtime dependencies.** Check GitHub (stars, last push, README, license) before any reuse or spike.

| Added | Link | Notes |
| --- | --- | --- |
| 2026-10-26 | [shader-effects-inc/shaders](https://github.com/shader-effects-inc/shaders) | npm `shaders` — declarative WebGPU effect components (React/Vue/Svelte/Solid/JS/Framer) + CLI + AI/MCP angle. ~5.5k★, last push 2026-10-21. Later playground/effects reference only; Forge is WebGL/Three.js today — not a drop-in. (checked GitHub 2026-10-26) |
| 2026-10-26 | [img2threejs/plugin-character](https://github.com/img2threejs/plugin-character) | img2 plugin: GLB skeleton, skin conditioning, clip measurement, **twelve-check rig gate** (unmeasured ≠ pass). Python; installer `@img2threejs/character`. Adjacent to MCP admit/provenance thinking; out of SceneSpec R0. Last push 2026-10-10. (checked GitHub 2026-10-26) |
| 2026-11-01 | [three.js r187](https://github.com/mrdoob/three.js/releases) · [186→187 migration](https://github.com/mrdoob/three.js/wiki/Migration-Guide/#186--187) · [npm three@0.187.0](https://www.npmjs.com/package/three) | Released 2026-10-30. Forge still on `0.170.0` (17 releases behind). Research note: [docs/research/2026-11-01-three-r187.md](docs/research/2026-11-01-three-r187.md) — staged smoke later; no bump now. |

## From @HappyMonkeyAI X bookmarks (scanned 2026-11-01)

Bookmarks live under X **History → Bookmarks**. Deep pass: [docs/research/2026-11-01-x-bookmarks-threejs.md](docs/research/2026-11-01-x-bookmarks-threejs.md).

| Priority | Link | Disposition |
| --- | --- | --- |
| High | [three.js#35191](https://github.com/mrdoob/three.js/pull/35191) meshlets / drawing pipelines (merged 2026-10-29) | Track with r187; WebGPU-only |
| High | [gamedev-cheatsheet.com](https://gamedev-cheatsheet.com) | SceneSpec/repair prompt vocabulary ideas → [docs/scene/prompt-vocabulary-appendix.md](docs/scene/prompt-vocabulary-appendix.md) |
| High | [img2threejs/img2threejs](https://github.com/img2threejs/img2threejs) (~20k★ Apache-2.0) | Pipeline peer; provenance before admit |
| High | Qwen3.5-4B-3D-Coder (@dextune Oct 30) | Local Three.js codegen bake-off later; hub URL unresolved this pass |
| Med | [Humpalumps/Ultra-Water](https://github.com/Humpalumps/Ultra-Water) · [ultra-elements](https://github.com/Humpalumps/ultra-elements) | Playground VFX reference (WebGL2) |
| Med | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (~6.4k★) | Compare to local skills; no blind install |
| Med | [jtydhr88/ComfyUI-qwenmultiangle](https://github.com/jtydhr88/ComfyUI-qwenmultiangle) (MIT ~1.4k★) | MCP concept multi-view recipe candidate |
| Med | [hi3d-official/Hi3Dv1.0](https://github.com/hi3d-official/Hi3Dv1.0) | Sandbox i2_3d alternate; licence unclear (NOASSERTION) |
| Low | MuTracer 0.2.0 (@pissang1) | WebGPU watchlist |
| Low | [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) | Hermes/agent ops only |

## How to use this file

- Append rows when new links are shared in chat.
- Keep disposition terse (reference / spike candidate / out of scope).
- Prefer fetching live GitHub metadata before acting on a link.
- Re-scan HappyMonkeyAI X bookmarks when the owner asks; search box filters help (`three.js`, `shader`, `gamedev`).
