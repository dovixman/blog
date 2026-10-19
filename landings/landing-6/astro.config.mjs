// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dovixman.io',
  base: '/landing-6',
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'always',
  },
  devToolbar: {
    enabled: false,
  },
});
