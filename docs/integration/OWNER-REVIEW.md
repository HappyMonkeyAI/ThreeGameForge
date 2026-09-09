# Consumer integration owner review

Date: 2026-09-08

## Decision

The Echoes, MRPG, and Uncivilised adapter bridges are approved as reversible integration
proofs. The framework and both consumer branches have passing verification
evidence; production checkouts remain unchanged.

## Evidence reviewed

| Consumer | Branch | Review result |
|---|---|---|
| Echoes of Aion | `agent/three-game-forge-echoes-integration` | Bridge is read-only telemetry from the existing tactical loop; build, browser, persisted campaign, confirmed END TURN, and invalid-resume checks passed. |
| MRPG Realms | `agent/three-game-forge-mrpg-integration` | Bridge advances an `AdapterHost` from the existing render tick; typecheck, tests, build, browser, health, realm join, and authoritative server-tick readback passed. |
| Uncivilised Remix | `agent/three-game-forge-uncivilised-integration` | Bridge advances an `AdapterHost` from the existing render-facing game bridge; tests, build, canvas render, frame/tick readback, and confirmed END TURN state change passed. |

## Current distribution decision

Use option 3 temporarily: keep framework and game repositories in the
canonical local workspace while the public API is still changing. This avoids
premature releases but must remain an explicit, documented incubation mode.

The target architecture is option 1: the first `0.1.0` framework package set
is published under `@happymonkeyai/*`, and the isolated consumer branches now
use semver dependencies. Final merge into each dirty production checkout
remains an owner-controlled step.

## Merge prerequisite

MRPG currently references the framework with local `file:` dependencies using
paths valid from its isolated worktree:

```text
file:../../../games/ThreeGameForge/packages/adapters
file:../../../games/ThreeGameForge/packages/networking
```

The current isolated branch is a workspace-incubation proof. Before merging
into the normal `MRPGRealms` checkout, keep the canonical workspace layout
explicit or complete the package-release migration; do not silently merge
worktree-relative paths as though they were publishable dependencies.

No commit or merge was performed autonomously.
