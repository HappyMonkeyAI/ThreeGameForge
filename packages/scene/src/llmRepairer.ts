import type { SceneRepairProposal, SceneRepairer } from './repair.ts';

const VOCABULARY = `SceneSpec v1 closed vocabulary:
- version: 1
- environment: "studio" | "sunset" | "night"
- camera.type: "orbit" | "fixed"
- camera.target?: entity id that exists
- camera.radius?: positive number
- camera.elevation?: number
- entities[].type: "mesh" | "model"
- mesh: geometry "box"|"sphere"|"cylinder"|"icosahedron"|"plane"; material.type "standard"; material.color "#RRGGBB"
- model: model.asset non-empty asset id string (no URLs, no binary)
- components?: "rotatable" | "orbit-target" (at most one orbit-target in the scene)
- meta?: { source?, ref?, note? } strings only`;

/** Builds a repair prompt a host LLM can answer with a single JSON SceneSpec object. */
export function formatSceneRepairPrompt(proposal: SceneRepairProposal): string {
  const errors = proposal.errors
    .map((issue) => `- ${issue.path || '/'}: ${issue.message}`)
    .join('\n');
  return [
    'You are repairing a ThreeGameForge SceneSpec.',
    'Fix every listed validation error.',
    'Do not invent fields, geometries, components, or APIs outside the vocabulary.',
    'End your reply with the repaired SceneSpec as a single JSON object (optionally in a ```json fence).',
    '',
    VOCABULARY,
    '',
    `Attempt: ${proposal.attempt}`,
    'Validation errors:',
    errors || '- (none)',
    '',
    'Previous intent JSON:',
    JSON.stringify(proposal.previous, null, 2),
    '',
    'Repaired SceneSpec JSON:',
  ].join('\n');
}

/**
 * Extracts the first JSON object from a model response.
 * Accepts raw JSON or a fenced ```json block.
 */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('LLM repair response was empty');

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = (fenced?.[1] ?? trimmed).trim();

  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new Error('LLM repair response did not contain a JSON object');
    }
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  }
}

export type LlmSceneRepairerOptions = {
  /** Host completion function (OpenAI, local server, etc.). Forge does not call models itself. */
  complete: (prompt: string) => Promise<string>;
};

/** Adapts an LLM completion function into a SceneRepairer for repairSceneSpec. */
export function createLlmSceneRepairer(options: LlmSceneRepairerOptions): SceneRepairer {
  return async (proposal) => {
    const prompt = formatSceneRepairPrompt(proposal);
    const response = await options.complete(prompt);
    return extractJsonObject(response);
  };
}
