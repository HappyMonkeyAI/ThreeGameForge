# ThreeGameForge Plan

## P0 — Bootstrap

- Establish protocol documents and repository conventions.
- Ship the fixed-step runtime playground.
- Add build/typecheck verification.

## P1 — Runtime extraction

- Extract clock, lifecycle, renderer, diagnostics, and resize services.
- Add pause/resume and tab-throttling behavior.
- Add deterministic seeded RNG and event contracts.

## P2 — Game foundations

- Add action-based input and camera rigs.
- Add asset manifests, GLB loading, caching, cloning, and disposal.
- Add responsive framework UI primitives and audio lifecycle hooks.

## P3 — World and multiplayer seams

- Add chunk streaming and worker-compatible generation.
- Add atomic dirty rebuilds, batching, and floating-origin support.
- Add command/snapshot, interpolation, and reconciliation interfaces.

## P4 — Consumer adapters

- Prove an Echoes adapter.
- Prove an MRPG Realms adapter.
- Compare duplication, performance, and verification outcomes before migration.

## P5 — Live integration

- Integrate one reversible Echoes client boundary.
- Integrate one reversible MRPG client boundary.
- Run consumer verification ladders and compare measured outcomes.

## P6 — Workspace incubation → package release

- Use the canonical sibling-checkout workspace during initial API
  development, with consumer integrations kept in isolated worktrees.
- Keep package boundaries, version fields, build outputs, `exports`, and
  lockfile checks publish-ready while the API evolves.
- Add a release smoke test that packs each framework package and consumes the
  tarballs from a clean fixture project.
- Publish the first versioned packages once the adapter and networking APIs
  stabilize; migrate consumers from local workspace links to semver ranges.
- Treat local workspace links as an incubation mode, not the long-term
  distribution contract.

## P7 — Public GitHub release readiness

- Audit tracked files and Git history for internal hostnames, IP addresses,
  absolute workstation paths, private repository details, credentials, and
  unlicensed source or assets.
- Replace internal research/verification notes with public-safe summaries or
  move operational evidence out of the public repository.
- Add `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and GitHub issue/
  pull-request templates.
- Add GitHub Actions for install, typecheck, tests, build, consumer audit, and
  diff hygiene.
- Complete a public-repository review, then change GitHub visibility from
  private to public only after explicit owner approval.
- Track npm package publication separately: remove package privacy flags only
  when compiled exports, package manifests, tarball smoke tests, semver policy,
  and registry release credentials are ready.
