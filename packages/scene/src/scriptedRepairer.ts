import type { SceneIssue } from './types.ts';
import type { SceneRepairer } from './repair.ts';

const NAMED_COLORS: Record<string, string> = {
  orange: '#ff4500',
  red: '#ff0000',
  green: '#228b22',
  blue: '#4169e1',
  white: '#ffffff',
  black: '#000000',
  cyan: '#4ee6c1',
  teal: '#4ee6c1',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneIntent(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {
      version: 1,
      environment: 'night',
      camera: { type: 'orbit' },
      entities: [],
    };
  }
  return structuredClone(value) as Record<string, unknown>;
}

function entityIds(draft: Record<string, unknown>): string[] {
  if (!Array.isArray(draft.entities)) return [];
  return draft.entities
    .filter(isRecord)
    .map((entity) => entity.id)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}

function setPathColor(draft: Record<string, unknown>, path: string, color: string): void {
  const match = /^entities\[(\d+)\]\.material\.color$/.exec(path);
  if (!match || !Array.isArray(draft.entities)) return;
  const index = Number(match[1]);
  const entity = draft.entities[index];
  if (!isRecord(entity)) return;
  if (!isRecord(entity.material)) entity.material = { type: 'standard' };
  (entity.material as Record<string, unknown>).color = color;
  (entity.material as Record<string, unknown>).type = 'standard';
}

function stripUnknownComponents(draft: Record<string, unknown>, path: string): void {
  const match = /^entities\[(\d+)\]\.components(?:\[(\d+)\])?$/.exec(path);
  if (!match || !Array.isArray(draft.entities)) return;
  const index = Number(match[1]);
  const entity = draft.entities[index];
  if (!isRecord(entity) || !Array.isArray(entity.components)) return;
  const allowed = new Set(['rotatable', 'orbit-target']);
  entity.components = entity.components.filter(
    (entry) => typeof entry === 'string' && allowed.has(entry),
  );
}

/**
 * Deterministic repairer for tests and offline demos.
 * Fixes a bounded set of common SceneSpec mistakes an LLM often makes.
 * Not a substitute for a model — it proves the closed loop converges.
 */
export function createScriptedSceneRepairer(): SceneRepairer {
  return ({ previous, errors }) => {
    const draft = cloneIntent(previous);

    if (draft.version !== 1) draft.version = 1;
    if (typeof draft.environment !== 'string'
      || !['studio', 'sunset', 'night'].includes(draft.environment)) {
      draft.environment = 'night';
    }
    if (!isRecord(draft.camera)) draft.camera = { type: 'orbit' };
    const camera = draft.camera as Record<string, unknown>;
    if (camera.type !== 'orbit' && camera.type !== 'fixed') camera.type = 'orbit';
    if (!Array.isArray(draft.entities)) draft.entities = [];

    for (const issue of errors) {
      applyIssueFix(draft, issue);
    }

    return draft;
  };
}

function applyIssueFix(draft: Record<string, unknown>, issue: SceneIssue): void {
  const { path, message } = issue;

  if (path === 'version') {
    draft.version = 1;
    return;
  }
  if (path === 'environment') {
    draft.environment = 'night';
    return;
  }
  if (path === 'camera' || path === 'camera.type') {
    if (!isRecord(draft.camera)) draft.camera = {};
    (draft.camera as Record<string, unknown>).type = 'orbit';
    return;
  }
  if (path === 'camera.target' && message.includes('unknown entity')) {
    if (!isRecord(draft.camera)) draft.camera = { type: 'orbit' };
    const ids = entityIds(draft);
    if (ids.length > 0) (draft.camera as Record<string, unknown>).target = ids[0];
    else delete (draft.camera as Record<string, unknown>).target;
    return;
  }
  if (path.endsWith('.material.color') && message.includes('#RRGGBB')) {
    const named = message.match(/got ["']?(\w+)/i);
    // Prefer mapping from previous raw value when present.
    let raw: unknown;
    const match = /^entities\[(\d+)\]\.material\.color$/.exec(path);
    if (match && Array.isArray(draft.entities)) {
      const entity = draft.entities[Number(match[1])];
      if (isRecord(entity) && isRecord(entity.material)) raw = entity.material.color;
    }
    const key = typeof raw === 'string' ? raw.trim().toLowerCase() : named?.[1]?.toLowerCase();
    setPathColor(draft, path, (key && NAMED_COLORS[key]) || '#ff4500');
    return;
  }
  if (path.includes('.material.type')) {
    const match = /^entities\[(\d+)\]\.material/.exec(path);
    if (match && Array.isArray(draft.entities)) {
      const entity = draft.entities[Number(match[1])];
      if (isRecord(entity)) {
        if (!isRecord(entity.material)) entity.material = {};
        (entity.material as Record<string, unknown>).type = 'standard';
        if (typeof (entity.material as Record<string, unknown>).color !== 'string') {
          (entity.material as Record<string, unknown>).color = '#888888';
        }
      }
    }
    return;
  }
  if (path.includes('.components')) {
    stripUnknownComponents(draft, path);
    return;
  }
  if (path === 'entities' && message.includes('orbit-target')) {
    if (!Array.isArray(draft.entities)) return;
    let kept = false;
    for (const entity of draft.entities) {
      if (!isRecord(entity) || !Array.isArray(entity.components)) continue;
      const has = entity.components.includes('orbit-target');
      if (!has) continue;
      if (!kept) {
        kept = true;
        continue;
      }
      entity.components = entity.components.filter((entry) => entry !== 'orbit-target');
    }
  }
}
