import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
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

/** GameForge MCP v0: SceneSpec tools only (no ComfyUI / Blender / browser screenshot). */
export function createGameForgeMcpServer(session: GameForgeSession = new GameForgeSession()): McpServer {
  const server = new McpServer({
    name: 'gameforge',
    version: '0.1.0',
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

  return server;
}

export type { GameForgeSession };
