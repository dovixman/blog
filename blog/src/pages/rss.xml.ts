import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, url } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: 'Blog de David Fuentes',
    description: 'Arquitectura de software, liderazgo técnico, ciberseguridad e inteligencia artificial.',
    site: new URL(url(), context.site),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: url(`${post.id}/`),
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: '<language>es-ES</language>',
  });
}
