# Consumer integration

ThreeGameForge is ready for adapter-level integration, but consumer game rules remain in their original repositories.

`AdapterHost` is the supported first seam: a consumer supplies its adapter, then the host can step local presentation state and submit transport-neutral commands. Snapshot projection is optional and remains owned by the consumer adapter.

## Echoes of Aion

- Authoritative model: server-side `FullGameState`, `VisibleGameState`, `TurnAction`, and turn-resolution services.
- Framework role: runtime scheduling, camera/render lifecycle, input mapping, asset management, diagnostics, and browser testkit.
- First slice: replace one client-side Three.js lifecycle concern behind an adapter without changing turn contracts or fog-of-war projection.
- Acceptance: server tests remain green; visible-state boundaries are unchanged; live tactical and strategic flows pass with state readback.

An isolated proof branch now exists at
`EchoesOfAion/.worktrees/three-game-forge-echoes-integration` on
`agent/three-game-forge-echoes-integration`. See the framework-side
[verification record](../verification/2026-09-08-echoes-adapter-bridge.md).

## MRPG Realms

- Authoritative model: shared protocol types, server `WorldRoom`, Socket.IO events, chunk persistence, collision, and movement authority.
- Framework role: runtime loop, camera/input/asset lifecycle, chunk worker seam, interpolation/reconciliation utilities, and diagnostics.
- First slice: integrate the renderer diagnostics or camera/input boundary before terrain or movement migration.
- Acceptance: movement, chunk edits, structures, role boundaries, persistence, latency smoke, and browser console checks remain green.

An isolated proof branch now exists at
`MRPGRealms/.worktrees/three-game-forge-mrpg-integration` on
`agent/three-game-forge-mrpg-integration`. See the framework-side
[verification record](../verification/2026-09-08-mrpg-adapter-bridge.md).

## Order

1. Add the framework dependency through the consumer's package manager.
2. Integrate one reversible adapter boundary.
3. Run consumer V0/V1 checks.
4. Run live primary, invalid, empty/error, and state-readback checks.
5. Compare duplication, frame metrics, and defect surface before migrating another boundary.
