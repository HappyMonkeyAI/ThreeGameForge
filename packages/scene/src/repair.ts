import type { SceneIssue, SceneSpec } from './types.ts';
import { validateSceneSpec } from './validate.ts';

export type SceneRepairProposal = {
  attempt: number;
  previous: unknown;
  errors: readonly SceneIssue[];
};

/** Host-provided fixer (scripted mutator today; LLM later). Must return the next intent object. */
export type SceneRepairer = (
  proposal: SceneRepairProposal,
) => unknown | Promise<unknown>;

export type RepairSceneOptions = {
  repairer: SceneRepairer;
  /** Inclusive attempts including the initial validation. Default 4 (1 try + 3 repairs). */
  maxAttempts?: number;
};

export type RepairSceneResult =
  | {
    ok: true;
    spec: SceneSpec;
    attempts: number;
    history: readonly (readonly SceneIssue[])[];
  }
  | {
    ok: false;
    errors: readonly SceneIssue[];
    attempts: number;
    history: readonly (readonly SceneIssue[])[];
  };

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Closed-loop SceneSpec admission: validate → repairer(errors) → re-validate until ok or budget exhausted.
 * Does not apply to Three.js; call applySceneSpec only after ok: true.
 */
export async function repairSceneSpec(
  input: unknown,
  options: RepairSceneOptions,
): Promise<RepairSceneResult> {
  const maxAttempts = options.maxAttempts ?? 4;
  if (maxAttempts < 1) throw new Error('maxAttempts must be >= 1');

  const history: SceneIssue[][] = [];
  let current: unknown = input;
  let previousSerialized: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const validated = validateSceneSpec(current);
    if (validated.ok) {
      return { ok: true, spec: validated.spec, attempts: attempt, history };
    }

    history.push(validated.errors);
    if (attempt === maxAttempts) {
      return { ok: false, errors: validated.errors, attempts: attempt, history };
    }

    const next = await options.repairer({
      attempt,
      previous: current,
      errors: validated.errors,
    });
    const nextSerialized = stableStringify(next);
    if (previousSerialized !== undefined && nextSerialized === previousSerialized) {
      return { ok: false, errors: validated.errors, attempts: attempt, history };
    }
    if (nextSerialized === stableStringify(current)) {
      return { ok: false, errors: validated.errors, attempts: attempt, history };
    }
    previousSerialized = stableStringify(current);
    current = next;
  }

  return { ok: false, errors: history.at(-1) ?? [], attempts: maxAttempts, history };
}
