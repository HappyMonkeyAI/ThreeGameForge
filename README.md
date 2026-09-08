# ThreeGameForge

ThreeGameForge is a shared TypeScript/Three.js runtime and tooling foundation for browser games. It is designed to serve multiple games without absorbing their domain rules or server authority.

## Current playground

```powershell
npm install
npm run dev
```

The first slice demonstrates a fixed-step simulation loop, render interpolation boundary, resize handling, and developer diagnostics.

To verify the known consumer boundaries without modifying either consumer repository:

```powershell
npm run audit:consumers
```

## Project documents

- `CONTEXT.md` — operating context and constraints
- `ARCHITECTURE.md` — package boundaries and ownership
- `DESIGN.md` — visual and interaction principles
- `SPEC.md` — testable requirements
- `PLAN.md` — dependency-ordered roadmap
- `TASKS.md` — active task ledger

The project follows the HappyMonkeyAI AgentsProtocol conventions while retaining explicit human approval for destructive Git operations and commits.

## Contributing and release status

This repository is in framework incubation. See [CONTRIBUTING.md](CONTRIBUTING.md)
for local verification, [WORKSPACE.md](WORKSPACE.md) for the temporary consumer
layout, and [SECURITY.md](SECURITY.md) for vulnerability reporting. The MIT
license is in [LICENSE](LICENSE).

The framework packages are not published to a registry yet; package-release
work is tracked separately from public GitHub source-release readiness.
