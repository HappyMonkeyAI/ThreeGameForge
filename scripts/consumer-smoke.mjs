import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const fixture = resolve(root, 'build/consumer-smoke');
const tarballs = resolve(root, 'build/package-tarballs');
await rm(fixture, { recursive: true, force: true });
await rm(tarballs, { recursive: true, force: true });
await mkdir(fixture, { recursive: true });
await mkdir(tarballs, { recursive: true });
await writeFile(resolve(fixture, 'package.json'), `${JSON.stringify({
  name: 'three-game-forge-clean-consumer',
  private: true,
  type: 'module',
  dependencies: {
    '@three-game-forge/adapters': 'file:../publish/adapters',
    '@three-game-forge/networking': 'file:../publish/networking',
  },
}, null, 2)}\n`);
await writeFile(resolve(fixture, 'smoke.mjs'), `
import { AdapterHost } from '@three-game-forge/adapters';
import { SnapshotBuffer } from '@three-game-forge/networking';

const host = new AdapterHost({
  id: 'clean-fixture',
  initialState: { value: 0 },
  update(state, dt) { return { value: state.value + dt }; },
});
if (host.step(0.25).value !== 0.25) throw new Error('AdapterHost package smoke failed');
const buffer = new SnapshotBuffer(2);
buffer.push({ tick: 1, state: { value: 1 } });
buffer.push({ tick: 2, state: { value: 2 } });
if (buffer.sample(1.5, (a, b, alpha) => ({ value: a.value + (b.value - a.value) * alpha })).value !== 1.5) {
  throw new Error('Networking package smoke failed');
}
console.log('PASS clean fixture consumed adapters and networking tarball outputs');
`);

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmOptions = {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
};
const packageDirectories = await readdir(resolve(root, 'build/publish'), { withFileTypes: true });
for (const entry of packageDirectories) {
  if (!entry.isDirectory()) continue;
  execFileSync(npm, ['pack', resolve(root, 'build/publish', entry.name), '--pack-destination', tarballs], npmOptions);
}

const nodeModules = resolve(fixture, 'node_modules/@three-game-forge');
await mkdir(nodeModules, { recursive: true });
for (const packageName of ['adapters', 'networking']) {
  const archive = (await readdir(tarballs)).find((name) => name.includes(`three-game-forge-${packageName}`) && name.endsWith('.tgz'));
  if (!archive) throw new Error(`Missing packed archive for ${packageName}`);
  const unpackDir = resolve(fixture, `.unpack-${packageName}`);
  await mkdir(unpackDir, { recursive: true });
  execFileSync('tar', ['-xzf', resolve(tarballs, archive), '-C', unpackDir], { stdio: 'inherit' });
  await cp(resolve(unpackDir, 'package'), resolve(nodeModules, packageName), { recursive: true });
}
execFileSync(process.execPath, ['smoke.mjs'], { cwd: fixture, stdio: 'inherit' });
await rm(fixture, { recursive: true, force: true });
await rm(tarballs, { recursive: true, force: true });
