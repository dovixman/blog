import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dovixman.io',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 800,
    },
  },
});
