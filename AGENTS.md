# ThreeGameForge Agent Rules

This project follows the HappyMonkeyAI AgentsProtocol conventions: ground work in the project documents, map blast radius before non-trivial changes, preserve lessons in `.agent/memories/`, and verify behavior independently.

Start relevant lesson retrieval at `.agent/memories/patterns_and_lessons.md`. For world streaming, diagnostics, resource ownership or async lifecycle work, consult the linked large-world record and recheck its source/contracts before reuse. Consumer measurements do not establish framework acceptance.

## Local safety rules

- Do not reset, clean, or discard worktree changes.
- Do not commit or push unless explicitly requested.
- Treat Echoes of Aion, MRPG Realms, local skills, and remote references as source material—not runtime dependencies.
- Record asset provenance and license evidence before importing assets.

## Done gate

Code changes require typecheck and build. Runtime changes additionally require browser verification, console inspection, state readback, and relevant performance evidence. Worker reports do not replace owner acceptance.

## Session start and end (Spine)
If the `spine` MCP is available, call `session_brief(project="ThreeGameForge")` (or the absolute path of this repo) first and use `get_section` / `recall` instead of reading PROGRESS.md or CONTEXT.md whole. Without the MCP, run `spine brief` from the repo root. If neither works, ground normally.
Before you stop, call `checkpoint` with your agent name (e.g. `cursor`), what was done, what's next and any blockers. Save durable why/gotcha/decision facts with `record_memory`.
