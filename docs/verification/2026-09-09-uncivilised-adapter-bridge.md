# Uncivilised Remix adapter bridge verification

## Scope

The isolated Uncivilised Remix integration branch mounts the consumer's
existing render-facing game bridge through `@three-game-forge/adapters` and
`AdapterHost`. Rules, state mutation, and player actions remain owned by the
consumer.

## V0

- `npm run verify`: 7 test files and 28 tests passed; Vite production build passed.
- The dependency is a temporary local workspace link for the P6 incubation
  phase and is intentionally not a publish claim.

## V3 browser evidence

- Local page `http://127.0.0.1:9431/?forgeDebug` rendered the strategic map
  canvas and exposed `window.__THREE_GAME_FORGE_UNCIVILISED__`.
- Readback reached `hasState: true`, frame 52, tick 52, and turn 1.
- After the existing End Turn action, readback reached frame 66, tick 66,
  and turn 2; the HUD also reported turn 2.

## Remaining review

- Owner review and merge remain pending.
- Destructive/error-path checks are not claimed for this static consumer
  bridge; they remain part of the owner review decision.
