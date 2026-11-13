import { z } from 'zod';
import { badInput, crudHandler, dbFail, ntext, slug, uuid } from '../../lib/admin-kit';

const fields = {
  name: z.string().trim().min(1).max(160),
  slug,
  description: ntext(5000),
  type: z.enum(['manual', 'smart']),
  rule: z.record(z.string(), z.unknown()),
  rule_label: ntext(200),
  card_image_path: ntext(500),
  banner_image_path: ntext(500),
  image_alt: ntext(200),
  seo_title: ntext(200),
  seo_description: ntext(500),
  status: z.enum(['active', 'draft']),
  sort_order: z.number().int().min(0).max(100000),
  featured: z.boolean(),
};

const setProductsSchema = z.object({ product_ids: z.array(uuid).max(500) });

export default crudHandler({
  table: 'collections',
  create: z.object(fields).partial().extend({ name: fields.name, slug: fields.slug }),
  touch: true,
  filters: ['type', 'status'],
  order: { column: 'sort_order', ascending: true },
  actions: {
    // POST /api/admin/collections?action=set-products&id=<collection>  { product_ids: [...] }
    // Replaces the products of a manual collection. (Smart-collection rules are stored
    // for the admin UI but are not evaluated automatically yet.)
    'set-products': async ({ c, supabase, id, body }) => {
      if (!id) return badInput(c, 'id is required');
      const parsed = setProductsSchema.safeParse(body);
      if (!parsed.success) return badInput(c, parsed.error);
      const { data: collection, error: findError } = await supabase
        .from('collections').select('id').eq('id', id).is('deleted_at', null).maybeSingle();
      if (findError) return dbFail(c, findError);
      if (!collection) return c.json({ error: 'Not found' }, 404);

      const { error: clearError } = await supabase.from('collection_products').delete().eq('collection_id', id);
      if (clearError) return dbFail(c, clearError);
      const ids = [...new Set(parsed.data.product_ids)];
      if (ids.length) {
        const rows = ids.map((product_id, position) => ({ collection_id: id, product_id, position }));
        const { error } = await supabase.from('collection_products').insert(rows);
        if (error) return dbFail(c, error);
      }
      return c.json({ data: { id, product_ids: ids } }, 200);
    },
  },
});
