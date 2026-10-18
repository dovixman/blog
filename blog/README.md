# Blog (dovixman.io/blog)

Astro static site served under `/blog/`. Built together with the rest of the site by `scripts/build.sh`.

## Publish a post

1. Create `src/content/posts/<slug>.md` (the file name becomes the URL: `/blog/<slug>/`). Copy `ejemplo.md` as a template.
2. Fill in the frontmatter:

   ```yaml
   ---
   title: Título del artículo
   description: Resumen de una o dos frases.
   date: 2026-10-18
   updated: 2026-11-02      # optional
   category: Arquitectura   # exactly one
   tags: [kafka, eventos]   # optional, any number
   draft: false             # true = only visible in `npm run dev`
   ---
   ```

3. Images: put them next to the post (e.g. `src/content/posts/mi-post/portada.png` with the post at `src/content/posts/mi-post/index.md`) and reference them with a relative path, or put them in `public/` and use `/blog/<file>`.
4. Commit and merge to `main`: the `github pages` workflow builds and deploys.

Categories and tags need no configuration: their pages (`/blog/categorias/<slug>/`, `/blog/tags/<slug>/`) are generated from the posts' frontmatter. Accents and spaces are normalised in the URL (`Inteligencia Artificial` → `inteligencia-artificial`).

## Local development

```sh
cd blog
npm ci
npm run dev   # http://localhost:4321/blog/ (drafts included)
npm run build # output in blog/dist
```

Also generated: `/blog/rss.xml` and `/blog/sitemap-index.xml`.
