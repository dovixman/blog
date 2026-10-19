// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dovixman.io',
  base: '/landing-12',
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'always',
  },
  devToolbar: {
    enabled: false,
  },
});
