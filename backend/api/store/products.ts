import { setCorsHeaders } from '../../lib/supabase-client';
import { createClient } from '@supabase/supabase-js';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { search, category, limit, variant_id } = c.req.query();

  let query = supabase.from('products').select(`
    *,
    product_variants (*)
  `).eq('status', 'active');

  // Filter by category if provided
  if (category) {
    query = query.eq('category', category);
  }

  // Search if provided
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  // Limit results
  const limitNum = limit ? parseInt(limit as string) : 50;
  query = query.limit(limitNum);

  const { data, error } = await query.order('sort_order', { ascending: true });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  // If variant_id is specified, find the product and its variant
  if (variant_id) {
    const allProducts = data || [];
    const product = allProducts.find(p =>
      p.product_variants && p.product_variants.some((v: any) => v.id === variant_id)
    );
    return c.json({ data: product || allProducts[0] }, 200);
  }

  return c.json({ data }, 200);
}