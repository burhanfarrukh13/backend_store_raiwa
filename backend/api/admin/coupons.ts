import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List coupons ---
  if (method === 'GET') {
    const { status } = c.req.query();
    let query = supabase.from('coupons').select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Create coupon ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const coupon = await c.req.json();
    const { error } = await supabase
      .from('coupons')
      .insert([{ ...coupon, status: 'active' }]);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: coupon.code } }, 201);
  }

  // --- PUT: Update coupon ---
  if (method === 'PUT') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Coupon ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { code, ...updates } = await c.req.json();
    const { error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id } }, 200);
  }

  // --- DELETE: Soft delete coupon ---
  if (method === 'DELETE') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Coupon ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { error } = await supabase
      .from('coupons')
      .update({ status: 'inactive', deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}