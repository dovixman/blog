// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dovixman.io',
  base: '/landing-5',
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'auto',
  },
  devToolbar: {
    enabled: false,
  },
});
