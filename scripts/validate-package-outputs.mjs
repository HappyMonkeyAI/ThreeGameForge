import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourcePackages = resolve(root, 'packages');
const buildPackages = resolve(root, 'build/packages');
const publishRoot = resolve(root, 'build/publish');

await rm(publishRoot, { recursive: true, force: true });
await mkdir(publishRoot, { recursive: true });

const packageNames = (await import('node:fs/promises')).readdir(sourcePackages, { withFileTypes: true });
for (const entry of await packageNames) {
  if (!entry.isDirectory()) continue;
  const sourceDir = join(sourcePackages, entry.name);
  const manifestPath = join(sourceDir, 'package.json');
  if (!existsSync(manifestPath)) continue;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const compiledDir = join(buildPackages, entry.name, 'src');
  const compiledEntry = join(compiledDir, 'index.js');
  if (!existsSync(compiledEntry)) throw new Error(`${manifest.name}: missing ${compiledEntry}`);

  const outputDir = join(publishRoot, entry.name);
  await mkdir(outputDir, { recursive: true });
  await cp(compiledDir, outputDir, { recursive: true });
  const outputManifest = { ...manifest };
  delete outputManifest.private;
  outputManifest.main = './index.js';
  outputManifest.types = './index.d.ts';
  outputManifest.exports = { '.': { types: './index.d.ts', import: './index.js' } };
  outputManifest.files = ['*.js', '*.d.ts', '*.map'];
  if (outputManifest.dependencies) {
    outputManifest.dependencies = Object.fromEntries(Object.entries(outputManifest.dependencies).map(([name, version]) => [
      name,
      name.startsWith('@three-game-forge/') ? `file:../${name.slice('@three-game-forge/'.length)}` : version,
    ]));
  }
  await writeFile(join(outputDir, 'package.json'), `${JSON.stringify(outputManifest, null, 2)}\n`);

  const packedManifest = JSON.parse(await readFile(join(outputDir, 'package.json'), 'utf8'));
  if (packedManifest.private || packedManifest.exports['.'].import !== './index.js') {
    throw new Error(`${manifest.name}: invalid publish manifest`);
  }
  if (!existsSync(join(outputDir, 'index.d.ts'))) throw new Error(`${manifest.name}: missing declaration output`);
  console.log(`PASS ${manifest.name}: publish output ready`);
}
