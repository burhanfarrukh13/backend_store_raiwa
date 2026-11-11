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

  // --- GET: List inquiries ---
  if (method === 'GET') {
    const { status } = c.req.query();
    let query = supabase.from('contact_inquiries').select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- PUT: Mark inquiry read ---
  if (method === 'PUT') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Inquiry ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'support'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { error } = await supabase
      .from('contact_inquiries')
      .update({ status: 'read', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id, status: 'read' } }, 200);
  }

  // --- POST: Add reply ---
  if (method === 'POST') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Inquiry ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'support'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { reply, email } = await c.req.json();
    // 1. Write reply to inquiry
    const { error: err1 } = await supabase
      .from('contact_inquiries')
      .update({ reply, status: 'read', updated_at: new Date().toISOString() })
      .eq('id', id);
    // 2. Write to email log
    const { error: err2 } = await supabase
      .from('email_log')
      .insert([{ recipient: email, subject: 'Re: inquiry', template: 'contact_reply', result: 'sent' }]);
    if (err1) return c.json({ error: err1.message }, 400);
    if (err2) return c.json({ error: err2.message }, 500);
    return c.json({ data: { id, replied: true } }, 200);
  }

  // --- DELETE: Delete inquiry ---
  if (method === 'DELETE') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Inquiry ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { error } = await supabase
      .from('contact_inquiries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}