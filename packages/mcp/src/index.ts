#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createGameForgeMcpServer } from './server.ts';
import { GameForgeSession } from './session.ts';

function readEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[name];
}

const session = new GameForgeSession({
  llm: {
    baseUrl: readEnv('TGF_LLM_BASE_URL') ?? 'http://192.168.5.229:1234/v1',
    model: readEnv('TGF_LLM_MODEL') ?? 'google/gemma-4-e2b',
  },
});

const server = createGameForgeMcpServer(session);
const transport = new StdioServerTransport();
await server.connect(transport);
