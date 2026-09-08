import type { TestHooks } from '../packages/testkit/src/index.ts';

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__?: TestHooks;
  }
}

export {};
