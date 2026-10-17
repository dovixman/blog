// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dovixman.io',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // three.js lives in its own lazily-loaded chunk (~140 kB gzip), only
      // fetched when WebGL is available and motion is allowed.
      chunkSizeWarningLimit: 700,
    },
  },
});
