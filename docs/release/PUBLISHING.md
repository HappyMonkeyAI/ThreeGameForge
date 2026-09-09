# Package publication runbook

The repository currently uses private workspace packages and generated publish
outputs. The first npm release must happen only after the package scope and
registry identity are confirmed by the owner.

## Preflight

```powershell
npm whoami
npm run smoke:packages
```

The smoke command builds all packages, validates compiled exports and
declarations, packs every package, and consumes the packed adapters and
networking outputs from a clean fixture.

## Release sequence

1. Choose and reserve the npm scope, or update package names if a different
   distribution owner is intended.
2. Confirm the semver version and changelog for the complete package set.
3. Generate publish output with `npm run validate:packages`.
4. Run `npm pack --dry-run` for each generated package and inspect the file
   list.
5. Publish the generated package directories in dependency order, beginning
   with `networking`, then the packages that consume it.
6. Install the published versions in each consumer and remove temporary local
   `file:` links.
7. Re-run consumer V0/V3 verification and record the registry versions.

Publishing is intentionally not automated by the repository CI workflow and
requires owner-controlled registry credentials.
