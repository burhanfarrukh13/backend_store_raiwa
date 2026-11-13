import { z } from 'zod';
import { crudHandler, ntext, slug } from '../../lib/admin-kit';

const fields = {
  title: z.string().trim().min(1).max(250),
  slug,
  excerpt: z.string().trim().max(1000),
  body: z.string().max(200_000),
  author: ntext(120),
  status: z.enum(['draft', 'published']),
  featured_image_url: ntext(2000),
  seo_title: ntext(200),
  seo_description: ntext(500),
};

// published_at is stamped by a database trigger the first time a post is published.
export default crudHandler({
  table: 'blog_posts',
  create: z.object(fields).partial().extend({ title: fields.title, slug: fields.slug }),
  touch: true,
  filters: ['status', 'author'],
});
