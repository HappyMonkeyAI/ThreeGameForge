# ThreeGameForge Specification

## Initial slice

- The project builds with TypeScript and Vite.
- A browser can render a non-blank Three.js scene.
- Simulation updates run at a fixed 60 Hz step.
- Large frame gaps are clamped to prevent runaway simulation.
- Rendering remains decoupled from simulation timing.
- Runtime diagnostics expose elapsed time, simulation steps, draw calls, and triangles.

## Future contracts

- Framework packages have no dependency on Echoes or MRPG domain modules.
- World generation and simulation can run deterministically from a seed.
- Replaceable renderer, physics, and networking adapters have explicit interfaces.
