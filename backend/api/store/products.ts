import { setCorsHeaders, createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch {
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const { search, category, limit, variant_id } = c.req.query();

  let query = supabase.from('storefront_products').select('*');

  // Filter by category if provided
  if (category) {
    query = query.contains('category_slugs', [category]);
  }

  // Search if provided
  if (search) {
    query = query.ilike('name', `%${search.replace(/[%_,]/g, '')}%`);
  }

  // Limit results
  const parsedLimit = limit ? Number.parseInt(limit as string, 10) : 50;
  const limitNum = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 50;
  query = query.limit(limitNum);

  const { data, error } = await query.order('featured', { ascending: false });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  // If variant_id is specified, find the product and its variant
  if (variant_id) {
    const allProducts = data || [];
    const product = allProducts.find((p: any) =>
      p.product_variants && p.product_variants.some((v: any) => v.id === variant_id)
    );
    return c.json({ data: product || null }, 200);
  }

  return c.json({ data }, 200);
}