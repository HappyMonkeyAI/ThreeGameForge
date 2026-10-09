# ThreeGameForge Tasks

## Large-world learning transfer — 2026-10-09

- [x] Record source-backed consumer lessons in `.agent/memories/`, map them to inspected framework packages, and add retrieval links. Documentation only; owned paths: memory record/index, AGENTS, CONTEXT, TASKS. Acceptance: sources, applicability limits and proposed/current behavior are explicit; no game rules, source/assets or benchmark claims imported. Verification: local Markdown target existence and `git diff --check`; outcomes recorded in the task report.
- [ ] Evaluate multi-view wanted/retained residency sets and hysteresis through a bounded `world`/renderer-adapter task; include distant secondary views, resize and teleport acceptance.
- [ ] Evaluate one shared render-frame build scheduler with count/time limits, stale-work pruning, fair layer ordering and explicit resource/pool ownership; measure a repeated-traversal plateau.
- [ ] Evaluate diagnostics for actual frame intervals, rolling percentiles/maxima, fixed-step CPU and submission CPU across all views; distinguish GPU/tracked-memory metrics and cold versus warmed results.

These are proposed follow-ups from the memory record, not authorized runtime work or new framework performance guarantees. Keep persistence schemas and product-specific overview/construction behavior in consumers.

Documentation verification: PowerShell regex extraction of Markdown targets in the five owned files, resolved relative to each document and checked with `Test-Path -PathType Leaf`: **11 local links checked, 0 missing**. `git diff --check` passed with line-ending notices only. No runtime tests/build run; no runtime changes, commit or push.

## Bootstrap

- [x] Initialize Git repository.
- [x] Add CONTEXT, ARCHITECTURE, DESIGN, SPEC, PLAN, and TASKS.
- [x] Add minimal fixed-step Three.js playground.
- [x] Install dependencies and run typecheck/build.
- [x] Add README and AgentsProtocol bootstrap instructions.
- [x] Add initial ADR for framework boundaries.
- [x] Add `.agent` memory directories and machine-readable task ledger.

## Runtime

- [x] Extract fixed-step runtime into `packages/runtime`.
- [x] Extract clock, lifecycle, and diagnostics services.
- [x] Add pause/resume and deterministic clock tests.
- [x] Add runtime diagnostics service to the playground.
- [x] Add browser test hooks and evidence manifest template.
- [x] Verify the runtime playground in a live browser with state readback and console review.
- [x] Add deterministic seeded RNG and event contracts.

## Research

- [x] Obtain read-only SSH access to the remote reference vault.
- [x] Create source/provenance inventory for local and remote examples.
- [x] Record adoption and non-adoption decisions in ADRs.
- [x] Add MCP intent routing and consumer integration documentation.
- [x] Add read-only consumer contract audit script.

## Foundations

- [x] Add action-based keyboard input package and playground binding.
- [x] Add camera rig package.
- [x] Add asset manifest and disposal package.
- [x] Add measured renderer quality controller.
- [x] Add optional UI overlay and audio lifecycle primitives.
- [x] Add typed deterministic browser testkit and evidence validation.
- [x] Add emitted package build and workspace package manifests.

## World

- [x] Add deterministic chunk coordinate and residency package.
- [x] Add worker-compatible generation interface.
- [x] Add worker request/response handler seam.
- [x] Add atomic dirty-chunk rebuild contract.
- [x] Add floating-origin coordinate support.

## Networking

- [x] Add transport-neutral command and snapshot types.
- [x] Add bounded snapshot interpolation buffer.
- [x] Add prediction/reconciliation adapter contract.

## Consumers

- [x] Add explicit consumer-adapter registry contract.
- [x] Prove Echoes and MRPG adapter contracts without moving game rules.
- [x] Add an adapter host seam for mounting, stepping, and command submission.
- [x] Integrate an MRPG bridge in isolated branch `agent/three-game-forge-mrpg-integration`.
- [x] Integrate an Echoes bridge in isolated branch `agent/three-game-forge-echoes-integration`.
- [x] Integrate an Uncivilised Remix bridge in isolated branch `agent/three-game-forge-uncivilised-integration`.
- [x] Review both isolated consumer branches and complete server-backed V2/V3 acceptance.
- [ ] Merge the reviewed consumer branches under the temporary canonical workspace model (see `docs/integration/OWNER-REVIEW.md`).

## Package release transition

- [x] Add package `exports` and publish-output validation for every framework package.
- [x] Add a clean-fixture `npm pack`/consumer smoke test.
- [x] Publish the first semver package set and migrate isolated consumers off local links.

## Public GitHub release readiness

- [x] Audit tracked files and history for internal paths, network details, private repository references, secrets, and license gaps.
- [x] Convert internal research and verification notes into public-safe documentation.
- [x] Add `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`.
- [x] Add GitHub issue and pull-request templates.
- [x] Add GitHub Actions for install, typecheck, tests, build, consumer audit, and diff hygiene.
- [ ] Complete a final public-repository review and obtain explicit approval before changing visibility.
