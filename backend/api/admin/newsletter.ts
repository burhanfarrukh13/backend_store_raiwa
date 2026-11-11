import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List subscribers ---
  if (method === 'GET') {
    const { status } = c.req.query();
    let query = supabase.from('newsletter_subscribers').select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('subscribed_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Add subscriber ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'support'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { email, name } = await c.req.json();
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert([{ email, name, subscribed_at: new Date().toISOString(), status: 'active' }]);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: email } }, 201);
  }

  // --- PUT: Toggle subscriber status ---
  if (method === 'PUT') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Subscriber ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { status } = await c.req.json();
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id, status } }, 200);
  }

  // --- DELETE: Remove subscriber ---
  if (method === 'DELETE') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Subscriber ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}