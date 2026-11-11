import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware
  await withAuth(c);
  // Apply role middleware
  await withRole(['owner', 'manager', 'support'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List waitlist subscribers ---
  if (method === 'GET') {
    const { product_id } = c.req.query();
    let query = supabase.from('waitlist_subscribers').select('*');
    if (product_id) query = query.eq('product_id', product_id);
    const { data, error } = await query.order('subscribed_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Add subscriber ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'support'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { email, phone, product_id } = await c.req.json();
    const { error } = await supabase
      .from('waitlist_subscribers')
      .insert([{ email, phone, product_id, subscribed_at: new Date().toISOString(), notified_flag: false }])
      .select();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: 'new' } }, 201);
  }

  // --- PUT: Mark subscriber notified ---
  if (method === 'PUT') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Subscriber ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { error } = await supabase
      .from('waitlist_subscribers')
      .update({ notified_flag: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id } }, 200);
  }

  // --- DELETE: Remove subscriber ---
  if (method === 'DELETE') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Subscriber ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { error } = await supabase
      .from('waitlist_subscribers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}