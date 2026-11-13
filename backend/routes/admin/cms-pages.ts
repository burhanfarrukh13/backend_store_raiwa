import { z } from 'zod';
import { crudHandler, ntext, slug } from '../../lib/admin-kit';

const fields = {
  title: z.string().trim().min(1).max(250),
  slug,
  content: z.string().max(200_000),
  status: z.enum(['draft', 'published']),
  seo_title: ntext(200),
  seo_description: ntext(500),
};

// published_at is stamped by a database trigger the first time a page is published.
export default crudHandler({
  table: 'cms_pages',
  create: z.object(fields).partial().extend({ title: fields.title, slug: fields.slug }),
  touch: true,
  filters: ['status'],
});
