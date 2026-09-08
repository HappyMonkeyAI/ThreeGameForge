# ThreeGameForge Source Inventory

## Local sources reviewed

| Source | Intended use | Disposition |
|---|---|---|
| `games/threejs-game-skills` | Runtime scaffolding, gameplay boundaries, asset workflows, QA/evidence automation | Adopt patterns; verify license before copying code/assets |
| `games/Threejs-Awesome-Graphics-Agent-Skills` | Rendering experiments: atmosphere, water, clouds, materials, VFX, procedural systems | Reference selectively; keep effects behind budgets |
| `EchoesOfAion` | Deterministic turn engine, visibility projection, tactical Three.js presentation | Consumer adapter; do not import game rules |
| `MRPGRealms` | Real-time authority, chunk streaming, voxel edits, prediction/reconciliation | Consumer adapter; do not replace its authority model |
| `games/lance` | Multiplayer engine concepts and synchronization references | Reference only; no dependency selected |
| `games/tinyskies` | Procedural world and server-room patterns | Reference only |
| `games/img2threejs` | Asset generation and prop pipeline ideas | Tooling reference; provenance required |

## Remote source

The intended SSH source is `private LAN reference vault` on `private LAN host`. Read-only access was verified on 2026-09-08 with `REMOTE_OK` and `VAULT_OK`.

| Remote source | Evidence observed | Disposition |
|---|---|---|
| `threejs-game-skills/skills/threejs-game-director/SKILL.md` | Phase routing, skill/reference ledgers, asset provenance gate, browser and release evidence requirements | Adopt as process guidance; do not copy skill files into runtime packages |
| `threejs-game-skills/skills/threejs-gameplay-systems/SKILL.md` | Small architecture boundaries, explicit update order, playable-loop and input/camera verification | Adopted in package boundaries and test strategy |
| `threejs-game-skills/skills/threejs-qa-release/SKILL.md` | Build, local browser, console/page errors, canvas pixels, desktop/mobile, input-path checks | Adopted in browser evidence and release checklist |
| `asteroid-mining-rts/README.md` and `package.json` | Private Vite example; Three.js `^0.185.0`; procedural asteroid, selection/pathfinding, synthesized Web Audio, bloom, responsive HUD, explicit controls | Reference for future example-game adapters; no code/assets copied |
| `three-fenestra/README.md` and `package.json` | v0.3.0 MIT package; Three.js peer `>=0.150.0`; interior-mapping material, instancing, LOD, atlas/PBR overlay strategy | Candidate optional renderer extension; no dependency selected |
| `threejs-procedural-spider/package.json` | v1.0.0 MIT example; Three.js `^0.169.0`; procedural animation and inverse-kinematics keywords | Candidate locomotion reference; license is recorded, but source files require review before reuse |
| `threejs.csv` | Index of Three.js projects and provenance URLs | Discovery index only; individual repositories require their own license review |

The remote skill bundle explicitly requires a playable loop and evidence-backed QA rather than a static scene. This supports keeping ThreeGameForge’s playground as a verification surface while consumer adapters remain domain-neutral.

## Constraints

- MIT code metadata does not automatically clear generated or third-party assets.
- Do not wholesale-copy `node_modules` or remote examples.
- Record source URL/path, commit or version, license, and checksum for adopted assets.
