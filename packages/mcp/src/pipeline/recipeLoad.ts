import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PIPELINE_RECIPES, type PipelineRecipe } from './catalog.ts';

export type ConceptPatch = {
  promptNode: string;
  seedNode?: string;
  prefixNode?: string;
  defaultPrefix?: string;
};

export type ImageTo3dPatch = {
  imageNode: string;
  trellisFlagNode?: string;
  trellisValue?: boolean;
  prefixNode?: string;
  defaultPrefix?: string;
};

const CONCEPT_PATCHES: Record<string, ConceptPatch> = {
  'concept-flux2-klein': {
    promptNode: '76',
    seedNode: '75:73',
    prefixNode: '9',
    defaultPrefix: 'GameForge/mcp/concept',
  },
};

const I23D_PATCHES: Record<string, ImageTo3dPatch> = {
  'i2_3d-pixal3d': {
    imageNode: '122',
    trellisFlagNode: '316',
    trellisValue: false,
    prefixNode: '322',
    defaultPrefix: 'GameForge/mcp/pixal3d',
  },
  'i2_3d-trellis2': {
    imageNode: '122',
    trellisFlagNode: '316',
    trellisValue: true,
    prefixNode: '322',
    defaultPrefix: 'GameForge/mcp/trellis2',
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getRecipe(recipeId: string): PipelineRecipe {
  const recipe = PIPELINE_RECIPES.find((entry) => entry.id === recipeId);
  if (!recipe) {
    throw new Error(`Unknown recipeId "${recipeId}". Use list_pipeline_recipes.`);
  }
  return recipe;
}

export async function loadRecipeGraph(
  refRoot: string,
  recipeId: string,
): Promise<{ recipe: PipelineRecipe; graph: Record<string, unknown>; sourcePath: string }> {
  const root = refRoot.trim();
  if (!root) {
    throw new Error('TGF_PIPELINE_REF_ROOT is required to load workflow JSON');
  }
  const recipe = getRecipe(recipeId);
  const sourcePath = join(root, recipe.refPath);
  const raw = JSON.parse(await readFile(sourcePath, 'utf8')) as unknown;
  if (!isRecord(raw)) {
    throw new Error(`Recipe graph at ${sourcePath} is not a JSON object`);
  }
  return { recipe, graph: structuredClone(raw), sourcePath };
}

function setNodeInput(graph: Record<string, unknown>, nodeId: string, key: string, value: unknown): void {
  const node = graph[nodeId];
  if (!isRecord(node)) {
    throw new Error(`Recipe missing node ${nodeId}`);
  }
  if (!isRecord(node.inputs)) {
    throw new Error(`Recipe node ${nodeId} missing inputs`);
  }
  node.inputs[key] = value;
}

export function applyConceptOverrides(
  recipeId: string,
  graph: Record<string, unknown>,
  options: { prompt: string; seed?: number; filenamePrefix?: string },
): void {
  const patch = CONCEPT_PATCHES[recipeId];
  if (!patch) {
    throw new Error(
      `Recipe "${recipeId}" has no concept prompt patch map yet (v1 supports concept-flux2-klein).`,
    );
  }
  setNodeInput(graph, patch.promptNode, 'value', options.prompt);
  if (patch.seedNode && options.seed !== undefined) {
    setNodeInput(graph, patch.seedNode, 'noise_seed', options.seed);
  }
  if (patch.prefixNode) {
    setNodeInput(graph, patch.prefixNode, 'filename_prefix', options.filenamePrefix ?? patch.defaultPrefix);
  }
}

export function applyImageTo3dOverrides(
  recipeId: string,
  graph: Record<string, unknown>,
  options: { imageRef: string; filenamePrefix?: string },
): void {
  const patch = I23D_PATCHES[recipeId];
  if (!patch) {
    throw new Error(`Recipe "${recipeId}" has no image-to-3d patch map.`);
  }
  setNodeInput(graph, patch.imageNode, 'image', options.imageRef);
  if (patch.trellisFlagNode && patch.trellisValue !== undefined) {
    setNodeInput(graph, patch.trellisFlagNode, 'value', patch.trellisValue);
  }
  if (patch.prefixNode) {
    setNodeInput(graph, patch.prefixNode, 'filename_prefix', options.filenamePrefix ?? patch.defaultPrefix);
  }
}
