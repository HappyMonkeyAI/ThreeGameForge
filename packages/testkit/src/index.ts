export type EvidenceCapture = {
  mode: 'desktop' | 'mobile';
  state: string | null;
  report: string;
};

export type EvidenceManifest = {
  version: 1;
  runId: string;
  captures: EvidenceCapture[];
  artifacts?: string[];
};

export type TestHooks = {
  seed(seed: number): Promise<unknown> | unknown;
  setState(state: string): Promise<{ state: string }> | { state: string };
  setPausedForScreenshot(paused: boolean): void;
  hideDebugUi(): void;
};

export function validateEvidenceManifest(manifest: EvidenceManifest): void {
  if (manifest.version !== 1 || !manifest.runId.trim()) throw new Error('Invalid evidence manifest header');
  if (manifest.captures.length === 0) throw new Error('Evidence manifest requires captures');
  const pairs = new Set(manifest.captures.map((capture) => `${capture.mode}:${capture.state ?? 'current'}`));
  if (pairs.size !== manifest.captures.length) throw new Error('Evidence captures must use distinct viewport/state pairs');
  for (const capture of manifest.captures) {
    if (!capture.report.trim()) throw new Error('Evidence capture report is required');
  }
}

export async function applyCaptureState(hooks: TestHooks, seed: number, state: string): Promise<void> {
  hooks.setPausedForScreenshot(false);
  await hooks.seed(seed);
  const acknowledgement = await hooks.setState(state);
  if (acknowledgement.state !== state) throw new Error(`State acknowledgement mismatch: ${state}`);
  hooks.setPausedForScreenshot(true);
  hooks.hideDebugUi();
}
