import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware - check for valid staff token
  await withAuth(c);
  // Apply role middleware - check for owner/manager/support role
  await withRole(['owner', 'manager', 'support'])(c);

  const method = c.req.method;

  // Initialize Supabase server client (service role)
  const supabase = createSupabaseServerClient();

  // --- GET: List products ---
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active');

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ data }, 200);
  }

  // --- POST: Create product ---
  if (method === 'POST') {
    // Role check already applied via withRole middleware
    const product = await c.req.json();

    const { error } = await supabase
      .from('products')
      .insert([{ ...product, status: 'draft' }]);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ data: { id: product.id } }, 201);
  }

  // --- PUT: Update product ---
  if (method === 'PUT') {
    const productId = c.req.query('id');

    if (!productId) {
      return c.json({ error: 'Product ID required' }, 400);
    }

    // Role check already applied via withRole middleware
    const updates = await c.req.json();

    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ data: { id: productId } }, 200);
  }

  // --- DELETE: Soft delete product ---
  if (method === 'DELETE') {
    const productId = c.req.query('id');

    if (!productId) {
      return c.json({ error: 'Product ID required' }, 400);
    }

    // Role check already applied via withRole middleware
    // Soft delete via updating deleted_at
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', productId);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}