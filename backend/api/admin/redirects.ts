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

  // --- GET: List redirects ---
  if (method === 'GET') {
    const { status } = c.req.query();
    let query = supabase.from('redirects').select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Create redirect ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { from_path, to_path, type } = await c.req.json();
    const { data, error } = await supabase
      .from('redirects')
      .insert([{ from_path, to_path, type, status: 'active' }])
      .select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  }

  // --- PUT: Update redirect ---
  if (method === 'PUT') {
    const redirectId = c.req.query('id');
    if (!redirectId) return c.json({ error: 'Redirect ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { to_path, type } = await c.req.json();
    const { data, error } = await supabase
      .from('redirects')
      .update({ to_path, type })
      .eq('id', redirectId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: redirectId } }, 200);
  }

  // --- DELETE: Soft delete redirect ---
  if (method === 'DELETE') {
    const redirectId = c.req.query('id');
    if (!redirectId) return c.json({ error: 'Redirect ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden: Only owner can delete redirects' }, 403);
    }
    const { data, error } = await supabase
      .from('redirects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', redirectId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}