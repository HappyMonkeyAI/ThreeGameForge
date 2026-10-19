import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/** Allow local sandbox reads of sibling FilteredLivingPainting assets without copying bytes into this repo. */
const filteredGenerated = resolve(import.meta.dirname, '../FilteredLivingPainting/assets/generated');

/** LAN LLM default for playground repair; override with VITE_LLM_PROXY_TARGET. */
const llmProxyTarget = process.env.VITE_LLM_PROXY_TARGET ?? 'http://192.168.5.229:1234';

export default defineConfig({
  server: {
    fs: {
      allow: [resolve(import.meta.dirname), filteredGenerated],
    },
    proxy: {
      // Browser calls /llm/v1/... → local OpenAI-compatible server (avoids CORS).
      '/llm': {
        target: llmProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm/, ''),
      },
    },
  },
});
