import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware
  await withAuth(c);
  // Apply role middleware - owner/manager can manage push subs
  await withRole(['owner', 'manager'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List push subscriptions ---
  if (method === 'GET') {
    const { staff_id } = c.req.query();
    let query = supabase.from('push_subscriptions').select('*');
    if (staff_id) query = query.eq('staff_id', staff_id);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Register push subscription ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { endpoint, keys } = await c.req.json();
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert([{ staff_id: c.get('staffPayload').id, endpoint, keys, created_at: new Date().toISOString() }])
      .select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  }

  // --- DELETE: Unregister push subscription ---
  if (method === 'DELETE') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Subscription ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { data, error } = await supabase
      .from('push_subscriptions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}