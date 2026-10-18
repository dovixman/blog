import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** Published posts, newest first. Drafts are only listed in `astro dev`. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** "Arquitectura de Software" -> "arquitectura-de-software" */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Groups posts by a label (keeping the first spelling seen), sorted by name. */
export function groupBy(posts: Post[], labels: (post: Post) => string[]) {
  const groups = new Map<string, { label: string; posts: Post[] }>();
  for (const post of posts) {
    for (const label of labels(post)) {
      const slug = slugify(label);
      const group = groups.get(slug) ?? { label, posts: [] };
      group.posts.push(post);
      groups.set(slug, group);
    }
  }
  return [...groups.entries()]
    .map(([slug, group]) => ({ slug, ...group }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

export const byCategory = (posts: Post[]) => groupBy(posts, (p) => [p.data.category]);
export const byTag = (posts: Post[]) => groupBy(posts, (p) => p.data.tags);

export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function readingTime(body: string | undefined): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Prefixes a site-relative path with the base ("/blog/"). */
export function url(path = ''): string {
  return `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`;
}
