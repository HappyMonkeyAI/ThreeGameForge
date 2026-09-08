# ThreeGameForge workspace contract

This is the temporary incubation layout while the framework API evolves. The
framework remains independently structured, but local consumer integration
uses sibling checkouts rather than registry packages.

## Canonical checkout layout

```text
development/
  games/
    ThreeGameForge/
    MRPGRealms/
    EchoesOfAion/
```

Consumer worktrees may live below their repository’s `.worktrees/` directory.
Their local dependency paths must be validated from the actual worktree root;
do not copy a worktree-relative path into a normal checkout without checking
the resolved target.

## Incubation rules

- Keep framework and game rules in separate repositories.
- Use local links only for development and integration proofs.
- Keep framework package names and versions stable enough to become registry
  packages later.
- Run framework build/tests and the consumer verification ladder before
  accepting an integration branch.
- Do not use production game services as a substitute for an isolated test
  environment.

## Release exit criteria

Leave this workspace mode when:

1. package `exports` point at compiled artifacts;
2. clean-fixture package tarball consumption passes;
3. a versioned package set is published to the chosen registry; and
4. consumers install the packages through semver ranges with no sibling-path
   requirement.
