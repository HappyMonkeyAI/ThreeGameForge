# Registry migration verification

## Registry

The complete 12-package `@happymonkeyai/*@0.1.0` set is visible in the npm
registry. `networking` was published before `adapters`; the remaining packages
were published after their generated outputs passed the clean-fixture smoke
test.

## Consumers

- Uncivilised isolated integration: `@happymonkeyai/adapters@0.1.0`; 28 tests
  passed and production build passed.
- MRPG isolated integration: `@happymonkeyai/adapters@0.1.0` and
  `@happymonkeyai/networking@0.1.0`; typecheck, 100 tests, and production build
  passed.
- No consumer framework `file:` links remain in either isolated branch.

Production checkouts remain untouched because both are dirty and require owner
review before merge.
