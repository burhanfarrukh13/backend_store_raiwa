import { createSupabaseServerClient, setCorsHeaders } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);
  if (c.req.method !== 'GET') return c.json({ error: 'Method not allowed' }, 405);
  try {
    const { search, limit } = c.req.query();
    const parsedLimit = Number.parseInt(String(limit || '50'), 10);
    const supabase = createSupabaseServerClient();
    let query = supabase.from('categories')
      .select('id,name,slug,parent_id,description,card_image_path,banner_image_path,image_alt,seo_title,seo_description,sort_order,featured')
      .eq('status', 'active')
      .is('deleted_at', null);
    if (search) query = query.ilike('name', `%${String(search).replace(/[%_,]/g, '')}%`);
    const { data, error } = await query
      .order('sort_order', { ascending: true })
      .limit(Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50);
    if (error) return c.json({ error: 'Unable to load categories' }, 500);
    return c.json({ data }, 200);
  } catch {
    return c.json({ error: 'Store API is not configured' }, 503);
  }
}
