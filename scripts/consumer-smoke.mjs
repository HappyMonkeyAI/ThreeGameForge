import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

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
    '@happymonkeyai/adapters': 'file:../publish/adapters',
    '@happymonkeyai/networking': 'file:../publish/networking',
  },
}, null, 2)}\n`);
await writeFile(resolve(fixture, 'smoke.mjs'), `
import { AdapterHost } from '@happymonkeyai/adapters';
import { SnapshotBuffer } from '@happymonkeyai/networking';

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

// Under `npm run`, invoke npm-cli.js directly so Windows needs no shell (and no .cmd quoting).
const runNpm = (args) => process.env.npm_execpath
  ? execFileSync(process.execPath, [process.env.npm_execpath, ...args], { cwd: root, stdio: 'inherit' })
  : execFileSync('npm', args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });

try {
  const packageDirectories = await readdir(resolve(root, 'build/publish'), { withFileTypes: true });
  for (const entry of packageDirectories) {
    if (!entry.isDirectory()) continue;
    runNpm(['pack', resolve(root, 'build/publish', entry.name), '--pack-destination', tarballs]);
  }

  const nodeModules = resolve(fixture, 'node_modules/@happymonkeyai');
  await mkdir(nodeModules, { recursive: true });
  for (const packageName of ['adapters', 'networking']) {
    const archive = (await readdir(tarballs)).find((name) => name.includes(`happymonkeyai-${packageName}`) && name.endsWith('.tgz'));
    if (!archive) throw new Error(`Missing packed archive for ${packageName}`);
    const unpackDir = resolve(fixture, `.unpack-${packageName}`);
    await mkdir(unpackDir, { recursive: true });
    // Relative paths: GNU tar (e.g. Git Bash) reads "C:\..." as a remote host.
    const archivePath = relative(unpackDir, resolve(tarballs, archive)).split(sep).join('/');
    execFileSync('tar', ['-xzf', archivePath], { cwd: unpackDir, stdio: 'inherit' });
    await cp(resolve(unpackDir, 'package'), resolve(nodeModules, packageName), { recursive: true });
  }
  execFileSync(process.execPath, ['smoke.mjs'], { cwd: fixture, stdio: 'inherit' });

  // Typecheck against the packed declarations, which the runtime smoke above cannot see.
  await writeFile(resolve(fixture, 'smoke-types.ts'), `
import { AdapterHost, type GameAdapter } from '@happymonkeyai/adapters';
import type { NetworkCommand, NetworkSnapshot } from '@happymonkeyai/networking';

type State = { value: number };
const adapter: GameAdapter<State> = {
  id: 'typed-fixture',
  initialState: { value: 0 },
  update: (state, dt) => ({ value: state.value + dt }),
  submitCommand: (state, command: NetworkCommand) => ({ value: state.value + command.sequence }),
  projectSnapshot: (state, tick): NetworkSnapshot<State> => ({ tick, state }),
};
const value: number = new AdapterHost(adapter).step(0.5).value;
// @ts-expect-error commands require sequence and type
new AdapterHost(adapter).submit({ id: 'a1', payload: {} });
export { value };
`);
  execFileSync(process.execPath, [
    resolve(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit', '--strict', '--skipLibCheck', 'false',
    '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext',
    'smoke-types.ts',
  ], { cwd: fixture, stdio: 'inherit' });
  console.log('PASS clean fixture typechecked against packed declarations');
} finally {
  await rm(fixture, { recursive: true, force: true });
  await rm(tarballs, { recursive: true, force: true });
}
