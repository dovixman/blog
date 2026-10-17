import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dovixman.io',
  base: '/landing-1',
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
