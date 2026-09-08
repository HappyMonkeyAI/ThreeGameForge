# ADR-0002: Source adoption and provenance

## Status

Accepted — 2026-09-08

## Decision

ThreeGameForge uses local game repositories and skill packs as architectural references first. Code is extracted only after a boundary is validated in the framework and its license is compatible. External or generated assets require an asset-manifest entry with provenance, license, and optional checksum before runtime use.

The remote LLM Codex Reference Vault is a research source, not a runtime dependency. Its contents remain unverified until read-only SSH access is available.

## Non-adoption decisions

- Do not make Three.js WebGPU or a post-processing stack a baseline dependency.
- Do not move Echoes or MRPG domain authority into the framework.
- Do not adopt a full voxel engine, ECS library, or physics engine before a consumer proves the need.
