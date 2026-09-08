# ThreeGameForge Agent Rules

This project follows the HappyMonkeyAI AgentsProtocol conventions: ground work in the project documents, map blast radius before non-trivial changes, preserve lessons in `.agent/memories/`, and verify behavior independently.

## Local safety rules

- Do not reset, clean, or discard worktree changes.
- Do not commit or push unless explicitly requested.
- Treat Echoes of Aion, MRPG Realms, local skills, and remote references as source material—not runtime dependencies.
- Record asset provenance and license evidence before importing assets.

## Done gate

Code changes require typecheck and build. Runtime changes additionally require browser verification, console inspection, state readback, and relevant performance evidence. Worker reports do not replace owner acceptance.
