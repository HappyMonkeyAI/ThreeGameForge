# ThreeGameForge Intent Routing

| Intent | Preferred capability | Evidence required |
|---|---|---|
| Read project structure | Local filesystem and repository tools | Current files and Git status |
| Research Three.js APIs | Official Three.js documentation | Linked primary source |
| Research local examples | Read-only local filesystem | Source path, version, license |
| Research remote vault | Read-only SSH to the configured host | Command output and source path |
| Build framework code | Scoped filesystem edits | Typecheck, tests, build |
| Verify browser runtime | BrowserOS neo | Screenshot, hook state, console, state readback |
| Integrate a consumer | Consumer repository plus adapter package | Contract parity and live acceptance |

Never put credentials in this file or in `.agent` memory. Machine-local routing belongs in ignored `MCP.local.md`.
