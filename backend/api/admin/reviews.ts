import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware
  await withAuth(c);
  // Apply role middleware - owner/manager/support can CRUD
  await withRole(['owner', 'manager', 'support'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List reviews ---
  if (method === 'GET') {
    const { product_id, status } = c.req.query();
    let query = supabase.from('reviews').select('*');
    if (product_id) query = query.eq('product_id', product_id);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Submit review (public) ---
  if (method === 'POST') {
    const { product_id, rating, title, body, photo_path } = await c.req.json();
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'support'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { data, error } = await supabase
      .from('reviews')
      .insert([{ product_id, customer_name: c.get('staffPayload').name, customer_email: c.get('staffPayload').email, rating, title, body, photo_path, status: 'pending' }])
      .select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  }

  // --- PUT: Moderate review ---
  if (method === 'PUT') {
    const reviewId = c.req.query('id');
    if (!reviewId) return c.json({ error: 'Review ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { status } = await c.req.json();
    const { data, error } = await supabase
      .from('reviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reviewId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: reviewId } }, 200);
  }

  // --- DELETE: Delete review ---
  if (method === 'DELETE') {
    const reviewId = c.req.query('id');
    if (!reviewId) return c.json({ error: 'Review ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden: Only owner can delete reviews' }, 403);
    }
    const { data, error } = await supabase
      .from('reviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', reviewId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}