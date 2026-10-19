import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** From FilteredLivingPainting assets/PROVENANCE.md — sandbox-only admitted runtime crate. */
const EXPECTED_SHA256 = '0eb743cb05ef191d6f3170e94908a3f9103e47274a0631d2a09224b49cc3a2b6';

const siblingCrate = resolve(
  import.meta.dirname,
  '../../FilteredLivingPainting/assets/generated/crate-pixal3d-decimated.glb',
);

test('sibling Filtered crate matches recorded sandbox hash when present', async (t) => {
  if (!existsSync(siblingCrate)) {
    t.skip('FilteredLivingPainting crate GLB not present on this machine');
    return;
  }
  const bytes = await readFile(siblingCrate);
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash, EXPECTED_SHA256);
});
