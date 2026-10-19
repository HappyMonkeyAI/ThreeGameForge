import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

export type AdmittedAsset = {
  assetId: string;
  glbPath: string;
  sha256: string;
  provenancePath: string;
  bytes: number;
};

const ASSET_ID = /^[a-z0-9][a-z0-9._-]{1,63}$/i;

export async function registerAdmittedAsset(options: {
  admitDir: string;
  localGlbPath: string;
  assetId: string;
  meta?: Record<string, unknown>;
}): Promise<AdmittedAsset> {
  const admitDir = options.admitDir.trim();
  if (!admitDir) {
    throw new Error('TGF_ASSET_ADMIT_DIR is required to register assets');
  }
  if (!ASSET_ID.test(options.assetId)) {
    throw new Error('assetId must be 2–64 chars: letters, digits, . _ -');
  }
  if (extname(options.localGlbPath).toLowerCase() !== '.glb') {
    throw new Error('localGlbPath must end with .glb');
  }

  const source = resolve(options.localGlbPath);
  const bytes = await readFile(source);
  const sha256 = createHash('sha256').update(bytes).digest('hex');

  await mkdir(admitDir, { recursive: true });
  const glbPath = join(admitDir, `${options.assetId}.glb`);
  const provenancePath = join(admitDir, `${options.assetId}.provenance.json`);
  await copyFile(source, glbPath);
  const provenance = {
    assetId: options.assetId,
    sha256,
    bytes: bytes.byteLength,
    sourceBasename: basename(source),
    admittedAt: new Date().toISOString(),
    rights: 'sandbox-only until licence text is hand-verified',
    ...(options.meta ?? {}),
  };
  await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');

  return {
    assetId: options.assetId,
    glbPath,
    sha256,
    provenancePath,
    bytes: bytes.byteLength,
  };
}
