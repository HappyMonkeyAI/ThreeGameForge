# ADR-0004: AI SceneSpec intent layer

## Status

Accepted — 2026-10-19 (spike)

## Context

Direct LLM → Three.js codegen invents APIs and skips lifecycle. ThreeGameForge already owns runtime packages; it lacked a closed intent vocabulary the model can emit and the runtime can reject before GPU work.

## Decision

Add `packages/scene` with a versioned declarative `SceneSpec`, `validateSceneSpec` (structured repair errors), `applySceneSpec` (re-validates, builds meshes/lights, exposes dispose), and `repairSceneSpec` (validate→repairer→re-validate loop). Hosts inject a `SceneRepairer` (scripted mutator for tests; LLM later). Game domain rules stay out. Fluent builders and physics/TSL remain later extensions on the same vocabulary.

## Consequences

- Playground and future AI hosts share one schema surface.
- Invalid intent fails closed with path-addressed errors.
- Repair is host-pluggable; Forge never calls a model itself.
- GLB/model bytes stay behind `loadModel(assetId)`; SceneSpec only names asset ids.
- Package list in `ARCHITECTURE.md` includes `scene`.
