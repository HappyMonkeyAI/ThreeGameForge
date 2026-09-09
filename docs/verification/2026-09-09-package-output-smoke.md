# Package output smoke verification

The P6 package transition now has explicit source manifests and generated
publish output. `npm run smoke:packages` passed with:

- 12 package outputs validated with compiled JavaScript and declarations.
- 12 package tarballs produced by `npm pack`.
- A clean fixture consuming the packed adapters and networking outputs.
- Runtime checks for `AdapterHost.step` and `SnapshotBuffer.sample`.

The first semver publication and migration from local links remain pending.
The release scope is `@happymonkeyai/*`, owned by the authenticated npm account.
