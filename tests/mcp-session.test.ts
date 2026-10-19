import assert from 'node:assert/strict';
import test from 'node:test';
import { GameForgeSession } from '../packages/mcp/src/session.ts';
import { createGameForgeMcpServer } from '../packages/mcp/src/server.ts';

test('GameForgeSession validates, scripted-repairs, and applies SceneSpec', async () => {
  const session = new GameForgeSession();
  const broken = {
    version: 1,
    environment: 'studio',
    camera: { type: 'orbit', target: 'hero', radius: 5 },
    entities: [
      {
        id: 'hero',
        type: 'mesh',
        geometry: 'box',
        material: { type: 'standard', color: 'orange' },
        components: ['orbit-target', 'fly-around'],
      },
    ],
  };

  const invalid = session.validate(broken);
  assert.equal(invalid.ok, false);

  const repaired = await session.repair(broken, { mode: 'scripted' });
  assert.equal(repaired.ok, true);
  if (!repaired.ok) return;

  const readback = await session.apply(repaired.spec);
  assert.deepEqual(readback.entityIds, ['hero']);
  assert.equal(session.diagnostics().hasAppliedScene, true);
  assert.ok(session.vocabulary().geometries.includes('box'));

  session.clear();
  assert.equal(session.diagnostics().hasAppliedScene, false);
});

test('createGameForgeMcpServer constructs without throwing', () => {
  const server = createGameForgeMcpServer();
  assert.ok(server);
});
