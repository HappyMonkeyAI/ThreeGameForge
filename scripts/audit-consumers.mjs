import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '..', '..');
const strict = process.argv.includes('--strict');
const consumers = {
  echoes: resolve(root, 'EchoesOfAion'),
  mrpg: resolve(root, 'MRPGRealms'),
};

const checks = [
  ['echoes', 'ARCHITECTURE.md', ['server-authoritative', 'Three.js']],
  ['echoes', 'packages/server/src/types/game-state.ts', ['VisibleGameState', 'TurnAction']],
  ['echoes', 'packages/client/app.js', ['THREE', 'gameState']],
  ['mrpg', 'docs/adr/0001-hybrid-threejs-realm.md', ['Three.js', 'Socket.IO authority']],
  ['mrpg', 'shared/protocol.ts', ['MovementSnapshot', 'worldSeed']],
  ['mrpg', 'client/src/main.ts', ['socket.io-client', 'shouldReconcileAuthoritativePosition']],
];

let failures = 0;
let skipped = 0;
for (const [consumer, relativePath, required] of checks) {
  if (!existsSync(consumers[consumer])) {
    skipped += 1;
    console.log(`SKIP ${consumer}: consumer checkout is not present (use --strict to require it)`);
    continue;
  }
  const file = resolve(consumers[consumer], relativePath);
  const content = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const missing = required.filter((term) => !content.toLowerCase().includes(term.toLowerCase()));
  if (missing.length > 0) {
    failures += 1;
    console.log(`FAIL ${consumer}/${relativePath}: missing ${missing.join(', ')}`);
  } else {
    console.log(`PASS ${consumer}/${relativePath}`);
  }
}

if (failures > 0 || (strict && skipped > 0)) process.exitCode = 1;
