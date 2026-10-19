/**
 * Headless MCP v0 session smoke (same path as stdio tools).
 * Usage: npm run smoke:mcp
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameForgeSession } from '../packages/mcp/src/session.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = async (rel: string) => JSON.parse(await readFile(join(root, rel), 'utf8'));

const session = new GameForgeSession();
const vocab = session.vocabulary();
console.log('vocabulary geometries:', vocab.geometries.join(', '));

const good = await load('fixtures/scenes/consumers/realmfront-r0-blockout.json');
const validated = session.validate(good);
if (!validated.ok) {
  console.error('blockout validate FAILED', validated.errors);
  process.exit(1);
}
const applied = await session.apply(validated.spec);
console.log('apply entityIds:', applied.entityIds.join(', '));
console.log('readback objects:', session.readback().objectCount);

const broken = await load('fixtures/scenes/consumers/realmfront-r0-broken.json');
const before = session.validate(broken);
if (before.ok) {
  console.error('broken fixture unexpectedly valid');
  process.exit(1);
}
console.log('broken errors:', before.errors?.length ?? 0);

const repaired = await session.repair(broken, { mode: 'scripted' });
if (!repaired.ok) {
  console.error('scripted repair FAILED', repaired);
  process.exit(1);
}
session.clear();
const repairedApply = await session.apply(repaired.spec);
console.log('repaired apply entityIds:', repairedApply.entityIds.join(', '));
console.log('diagnostics:', session.diagnostics());
console.log('PASS smoke:mcp');
