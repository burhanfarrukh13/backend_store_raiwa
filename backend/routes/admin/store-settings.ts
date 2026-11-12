import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware
  await withAuth(c);
  // Apply role middleware - owner/manager can CRUD
  await withRole(['owner', 'manager'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: Get store settings ---
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- PUT: Update store settings ---
  if (method === 'PUT') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { identity, contact, seo } = await c.req.json();
    const { error } = await supabase
      .from('store_settings')
      .update({ identity, contact, seo, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: 1 } }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}