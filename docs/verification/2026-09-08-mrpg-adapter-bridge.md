# MRPG Realms adapter bridge verification

## Scope

Isolated MRPG integration worktree.

Branch: `agent/three-game-forge-mrpg-integration`

The bridge consumes `@three-game-forge/adapters` and
`@three-game-forge/networking` through local file dependencies. It reads the
existing MRPG pending-input count and server tick, then advances an
`AdapterHost` from the existing render tick. It does not mutate Socket.IO,
movement prediction, reconciliation, chunk authority, or domain state.

## Verification evidence

| Gate | Result |
|---|---|
| MRPG typecheck | Pass |
| MRPG tests | Pass — 100 tests |
| MRPG production build | Pass — existing bundle-size warning only |
| Live browser render | Pass — canvas rendered at `http://127.0.0.1:9411/?forgeDebug` |
| Bridge state readback | Pass — frame/tick advanced from 12 to 30; pending inputs 0; server tick remained -1 while server was absent |
| Server-backed primary path | Pass — isolated server health returned `ok`; browser joined a generated realm with `players 1`; bridge readback reached frame/tick 17 with authoritative server tick 4 |
| Production checkout | Unmodified; implementation remains isolated in the worktree |

This is a consumer integration proof, not acceptance of the MRPG production
branch. Merge/review and destructive/empty/error interaction checks remain
owner gates.
