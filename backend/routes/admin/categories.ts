import { z } from 'zod';
import { crudHandler, ntext, slug, uuid } from '../../lib/admin-kit';

const fields = {
  name: z.string().trim().min(1).max(160),
  slug,
  parent_id: uuid.nullable(),
  description: ntext(5000),
  card_image_path: ntext(500),
  banner_image_path: ntext(500),
  image_alt: ntext(200),
  seo_title: ntext(200),
  seo_description: ntext(500),
  status: z.enum(['active', 'draft']),
  sort_order: z.number().int().min(0).max(100000),
  featured: z.boolean(),
};

export default crudHandler({
  table: 'categories',
  create: z.object(fields).partial().extend({ name: fields.name, slug: fields.slug }),
  touch: true,
  filters: ['parent_id', 'status'],
  order: { column: 'sort_order', ascending: true },
  prepare: (row, mode, c) => {
    const id = String(c.req.query('id') || '');
    if (mode === 'update' && row.parent_id && row.parent_id === id) return 'A category cannot be its own parent';
  },
});
