# ADR-0001: Framework boundaries

## Status

Accepted — 2026-09-08

## Decision

ThreeGameForge is a reusable browser-game runtime. It owns deterministic timing, lifecycle, rendering adapters, input, assets, diagnostics, world infrastructure, and test utilities. Consumer games own domain rules, authoritative servers, persistence, and product-specific presentation.

The first extracted package is `packages/runtime`, which exposes a fixed-step loop without depending on Three.js or any consumer game.

## Consequences

- Echoes and MRPG Realms can adopt infrastructure incrementally.
- The runtime stays testable without a browser renderer.
- A second consumer must validate a boundary before additional abstraction is extracted.
- WebGL2 remains the initial renderer baseline; WebGPU is a future adapter.
