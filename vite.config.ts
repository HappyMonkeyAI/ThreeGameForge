import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/** Allow local sandbox reads of sibling FilteredLivingPainting assets without copying bytes into this repo. */
const filteredGenerated = resolve(import.meta.dirname, '../FilteredLivingPainting/assets/generated');

export default defineConfig({
  server: {
    fs: {
      allow: [resolve(import.meta.dirname), filteredGenerated],
    },
  },
});
