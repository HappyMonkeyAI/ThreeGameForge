/// <reference types="vite/client" />
import type { TestHooks } from '../packages/testkit/src/index.ts';

declare global {
  interface ImportMetaEnv {
    readonly VITE_ENABLE_TEST_HOOKS?: string;
  }

  interface Window {
    __THREE_GAME_TEST_HOOKS__?: TestHooks;
  }
}

export {};
