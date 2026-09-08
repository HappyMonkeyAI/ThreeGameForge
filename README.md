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
