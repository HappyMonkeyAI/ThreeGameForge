# Echoes of Aion adapter bridge verification

## Scope

Isolated Echoes integration worktree.

Branch: `agent/three-game-forge-echoes-integration`

The legacy global-script client loads `packages/client/three-game-forge-bridge.js`
before `app.js`. The bridge receives read-only state telemetry from the
existing tactical animation loop. It does not import or replace turn rules,
visibility projection, or server authority.

## Verification evidence

| Gate | Result |
|---|---|
| Client JavaScript syntax | Pass — `app.js` and bridge |
| Echoes build | Pass — TypeScript build and client asset copy |
| Live client render | Pass — nonblank 1200×769 canvas at `http://127.0.0.1:9421/?forgeDebug` |
| Empty/error state | Pass — expected campaign setup screen without a server |
| Server-backed campaign | Pass — disposable PostgreSQL plus isolated server persisted one campaign; browser loaded the tactical deck with `hasState: true`, `turn: 1` |
| Destructive state change | Pass — confirmed END TURN advanced the campaign to Turn 2 and bridge readback caught up to `turn: 2` |
| Empty/error state | Pass — invalid resume token produced the expected `RESUME FAILED` dialog |
| Production checkout | Unmodified; implementation remains isolated in the worktree |

Acceptance used a disposable loopback-only PostgreSQL container without a
volume, connected through a temporary tunnel, and removed after the run. Live
production services were not used.

This is a reversible client bridge proof, not production acceptance of the
Echoes branch.
