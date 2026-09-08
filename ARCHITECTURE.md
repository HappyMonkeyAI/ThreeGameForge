# ThreeGameForge Architecture

## Boundary

The framework owns reusable runtime infrastructure. Games own domain rules, authoritative state, persistence, and product-specific UI.

## Package boundaries

`core` · deterministic time/events/lifecycle  
`runtime` · fixed-step loop and scene lifecycle  
`renderer` · Three.js renderer and quality adapters  
`input` · action-based input mapping  
`camera` · reusable camera rigs  
`world` · chunks, streaming, coordinate systems  
`assets` · manifests, GLB loading, caching, disposal  
`networking` · commands, snapshots, interpolation, reconciliation  
`adapters` · explicit consumer-game lifecycle and state boundaries  
`ui` · product-neutral overlays and loading/pause surfaces  
`audio` · browser audio lifecycle and volume policy  
`testkit` · seeded fixtures, hooks, browser evidence, manifest validation

## Current implementation

The repository now contains the reusable package seams listed above, plus a small `src/main.ts` playground that proves the runtime, input, camera, renderer-quality, and test-hook contracts together. The playground remains deliberately thin: it is a verification surface, not a consumer game.

Consumer adapters are contract fixtures only. They describe how Echoes and MRPG Realms can provide state, submit actions, and project snapshots without moving domain rules into this repository. Live integration remains a later, reversible milestone.
