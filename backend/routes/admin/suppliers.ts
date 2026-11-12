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

  // --- GET: List suppliers ---
  if (method === 'GET') {
    const { status } = c.req.query();
    let query = supabase.from('suppliers').select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Create supplier ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { name, contact_email, phone, description } = await c.req.json();
    const { data, error } = await supabase
      .from('suppliers')
      .insert([{ name, contact_email, phone, description, status: 'active' }])
      .select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  }

  // --- PUT: Update supplier ---
  if (method === 'PUT') {
    const supplierId = c.req.query('id');
    if (!supplierId) return c.json({ error: 'Supplier ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { name, contact_email, phone, description } = await c.req.json();
    const { data, error } = await supabase
      .from('suppliers')
      .update({ name, contact_email, phone, description })
      .eq('id', supplierId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: supplierId } }, 200);
  }

  // --- DELETE: Soft delete supplier ---
  if (method === 'DELETE') {
    const supplierId = c.req.query('id');
    if (!supplierId) return c.json({ error: 'Supplier ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden: Only owner can delete suppliers' }, 403);
    }
    const { data, error } = await supabase
      .from('suppliers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', supplierId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}