# Contributing to ThreeGameForge

Thanks for helping improve ThreeGameForge. The project is currently in API
incubation, so small, well-scoped changes are especially valuable.

## Before opening a pull request

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run audit:consumers
```

The consumer audit is opportunistic in a fresh clone and skips absent sibling
checkouts. Use `npm run audit:consumers:strict` when both consumer repositories
are available locally.

Please update the relevant design document or ADR when changing a package
boundary, public contract, or source/asset provenance rule. Do not commit
credentials, generated build output, private game data, or unlicensed assets.

## Pull requests

Describe the behavior change, affected package boundaries, verification run,
and any follow-up work. Keep unrelated consumer-game changes in their own
repositories.
