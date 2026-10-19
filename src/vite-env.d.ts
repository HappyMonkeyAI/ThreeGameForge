import type { TestHooks } from '../packages/testkit/src/index.ts';

interface ImportMetaEnv {
  readonly VITE_LLM_BASE_URL?: string;
  readonly VITE_LLM_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__?: TestHooks;
  }
}

export {};
