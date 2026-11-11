import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware
  await withAuth(c);
  // Apply role middleware - owner/manager/support can read, owner/manager can CRUD
  await withRole(['owner', 'manager', 'support'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List categories ---
  if (method === 'GET') {
    const { parent_id } = c.req.query();
    let query = supabase.from('categories').select('*');
    if (parent_id) query = query.eq('parent_id', parent_id);
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Create category ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { name, description, parent_id } = await c.req.json();
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, description, parent_id, status: 'active' }])
      .select();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  }

  // --- PUT: Update category ---
  if (method === 'PUT') {
    const categoryId = c.req.query('id');
    if (!categoryId) return c.json({ error: 'Category ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { name, description } = await c.req.json();
    const { error } = await supabase
      .from('categories')
      .update({ name, description })
      .eq('id', categoryId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: categoryId } }, 200);
  }

  // --- DELETE: Soft delete category ---
  if (method === 'DELETE') {
    const categoryId = c.req.query('id');
    if (!categoryId) return c.json({ error: 'Category ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden: Only owner can delete categories' }, 403);
    }
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', categoryId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}