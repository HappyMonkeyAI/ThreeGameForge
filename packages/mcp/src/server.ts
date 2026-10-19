import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerAdmittedAsset } from './pipeline/admit.ts';
import { listPipelineRecipes } from './pipeline/catalog.ts';
import { pollComfyPrompt, submitComfyPrompt } from './pipeline/comfyClient.ts';
import { getComfyHostStatus } from './pipeline/comfyStatus.ts';
import {
  applyConceptOverrides,
  applyImageTo3dOverrides,
  loadRecipeGraph,
} from './pipeline/recipeLoad.ts';
import { GameForgeSession, type RepairMode } from './session.ts';

function ok(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>,
  };
}

function fail(message: string) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}

const specInput = z.unknown();

export type GameForgeMcpHostEnv = {
  comfyBaseUrl?: string;
  pipelineRefRoot?: string;
  assetAdmitDir?: string;
};

function requireComfyBase(host: GameForgeMcpHostEnv): string {
  const base = host.comfyBaseUrl?.trim();
  if (!base) throw new Error('TGF_COMFYUI_BASE_URL is required');
  return base;
}

function requirePipelineRoot(host: GameForgeMcpHostEnv): string {
  const root = host.pipelineRefRoot?.trim();
  if (!root) throw new Error('TGF_PIPELINE_REF_ROOT is required to load named recipe workflows');
  return root;
}

/** GameForge MCP: SceneSpec (v0) + pipeline catalog/queue/admit (v1). */
export function createGameForgeMcpServer(
  session: GameForgeSession = new GameForgeSession(),
  host: GameForgeMcpHostEnv = {},
): McpServer {
  const server = new McpServer({
    name: 'gameforge',
    version: '0.2.0',
  });

  server.registerTool(
    'get_scene_vocabulary',
    {
      description:
        'Return the closed SceneSpec v1 vocabulary (environments, geometries, components, entity types). Prefer this over inventing Three.js APIs.',
      inputSchema: {},
    },
    async () => ok(session.vocabulary()),
  );

  server.registerTool(
    'validate_scene_spec',
    {
      description:
        'Validate a SceneSpec JSON object. Returns ok+normalized spec or structured path/message errors for repair.',
      inputSchema: {
        spec: specInput.describe('SceneSpec-like JSON object'),
      },
    },
    async ({ spec }) => ok(session.validate(spec)),
  );

  server.registerTool(
    'repair_scene_spec',
    {
      description:
        'Repair an invalid SceneSpec via scripted fixes (default) or a local OpenAI-compatible LLM (mode=llm). Does not apply to the session scene.',
      inputSchema: {
        spec: specInput.describe('Broken SceneSpec-like JSON object'),
        mode: z.enum(['scripted', 'llm']).optional().describe('Repairer mode (default scripted)'),
        maxAttempts: z.number().int().min(1).max(8).optional(),
      },
    },
    async ({ spec, mode, maxAttempts }) => {
      try {
        const result = await session.repair(spec, {
          mode: mode as RepairMode | undefined,
          maxAttempts,
        });
        return ok(result);
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'apply_scene_spec',
    {
      description:
        'Validate and apply a SceneSpec into the headless MCP session scene graph. Model assets use a box fallback in v0. Returns readback.',
      inputSchema: {
        spec: specInput.describe('SceneSpec JSON object to apply'),
      },
    },
    async ({ spec }) => {
      try {
        return ok(await session.apply(spec));
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'get_scene_readback',
    {
      description: 'Return the currently applied SceneSpec readback (entity ids, camera, object count).',
      inputSchema: {},
    },
    async () => ok(session.readback()),
  );

  server.registerTool(
    'get_diagnostics',
    {
      description: 'Return session diagnostics including last validation/repair errors.',
      inputSchema: {},
    },
    async () => ok(session.diagnostics()),
  );

  server.registerTool(
    'clear_scene',
    {
      description: 'Dispose the applied scene graph and reset session application state.',
      inputSchema: {},
    },
    async () => {
      session.clear();
      return ok({ cleared: true });
    },
  );

  server.registerTool(
    'screenshot',
    {
      description:
        'Not available in MCP v0 headless mode. Use the Vite playground (?mode=repair) for visual capture.',
      inputSchema: {},
    },
    async () => fail('screenshot is not available in GameForge MCP v0 (headless). Use the playground for visuals.'),
  );

  server.registerTool(
    'list_pipeline_recipes',
    {
      description:
        'Return the closed MCP v1 asset-pipeline recipe catalog (named recipes only; no raw Comfy graph submission).',
      inputSchema: {},
    },
    async () => ok(listPipelineRecipes(host.pipelineRefRoot)),
  );

  server.registerTool(
    'get_pipeline_host_status',
    {
      description:
        'Read-only ComfyUI /system_stats probe using TGF_COMFYUI_BASE_URL. Never clears or cancels the queue.',
      inputSchema: {},
    },
    async () => ok(await getComfyHostStatus(host.comfyBaseUrl)),
  );

  server.registerTool(
    'queue_concept_image',
    {
      description:
        'Submit a named concept-image recipe to ComfyUI (refuses if queue busy). Requires TGF_COMFYUI_BASE_URL + TGF_PIPELINE_REF_ROOT. v1 prompt patch: concept-flux2-klein.',
      inputSchema: {
        recipeId: z.string().describe('Closed catalog recipe id'),
        prompt: z.string().min(1),
        seed: z.number().int().optional(),
        filenamePrefix: z.string().optional(),
      },
    },
    async ({ recipeId, prompt, seed, filenamePrefix }) => {
      try {
        const baseUrl = requireComfyBase(host);
        const { recipe, graph, sourcePath } = await loadRecipeGraph(requirePipelineRoot(host), recipeId);
        if (recipe.stage !== 'concept-image') {
          throw new Error(`Recipe ${recipeId} is stage ${recipe.stage}, not concept-image`);
        }
        applyConceptOverrides(recipeId, graph, { prompt, seed, filenamePrefix });
        const submitted = await submitComfyPrompt(baseUrl, graph);
        return ok({ ...submitted, recipeId, sourcePath });
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'queue_image_to_3d',
    {
      description:
        'Submit a named image-to-3d recipe (Pixal3D / TRELLIS.2). imageRef is the Comfy input filename. Refuses if queue busy.',
      inputSchema: {
        recipeId: z.string(),
        imageRef: z.string().min(1).describe('ComfyUI input image filename'),
        filenamePrefix: z.string().optional(),
      },
    },
    async ({ recipeId, imageRef, filenamePrefix }) => {
      try {
        const baseUrl = requireComfyBase(host);
        const { recipe, graph, sourcePath } = await loadRecipeGraph(requirePipelineRoot(host), recipeId);
        if (recipe.stage !== 'image-to-3d') {
          throw new Error(`Recipe ${recipeId} is stage ${recipe.stage}, not image-to-3d`);
        }
        applyImageTo3dOverrides(recipeId, graph, { imageRef, filenamePrefix });
        const submitted = await submitComfyPrompt(baseUrl, graph);
        return ok({ ...submitted, recipeId, sourcePath, imageRef });
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'poll_job',
    {
      description:
        'Poll one ComfyUI prompt_id via /history (and /queue if still pending). Never resubmits or clears jobs.',
      inputSchema: {
        promptId: z.string().min(1),
      },
    },
    async ({ promptId }) => {
      try {
        return ok(await pollComfyPrompt(requireComfyBase(host), promptId));
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'register_asset',
    {
      description:
        'Copy a local .glb into TGF_ASSET_ADMIT_DIR with sha256 provenance sidecar (sandbox rights). Returns assetId for SceneSpec model.asset.',
      inputSchema: {
        localGlbPath: z.string().min(1),
        assetId: z.string().min(2).max(64),
        meta: z.record(z.unknown()).optional(),
      },
    },
    async ({ localGlbPath, assetId, meta }) => {
      try {
        const admitDir = host.assetAdmitDir?.trim();
        if (!admitDir) throw new Error('TGF_ASSET_ADMIT_DIR is required');
        return ok(await registerAdmittedAsset({ admitDir, localGlbPath, assetId, meta }));
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  return server;
}

export type { GameForgeSession };
