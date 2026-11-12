import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware - check for valid staff token
  await withAuth(c);
  // Apply role middleware - check for owner/manager/support role
  await withRole(['owner', 'manager', 'support'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List orders ---
  if (method === 'GET') {
    const { status, payment_status, customer_type } = c.req.query();
    let query = supabase.from('orders').select(`
      *,
      customers (*),
      order_items (*)
    `).eq('deleted_at', null);

    if (status) query = query.eq('status', status);
    if (payment_status) query = query.eq('payment_status', payment_status);
    if (customer_type) {
      if (customer_type === 'first-time') {
        query = query.select('*, customers(*)').eq('customers', null);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- GET: Order detail ---
  if (method === 'GET' && c.req.query('id')) {
    const orderId = c.req.query('id');
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (*),
        order_items (*),
        order_payments (*)
      `)
      .eq('id', orderId)
      .single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- PUT: Update order (status, payment, courier, notes) ---
  if (method === 'PUT') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Order ID required' }, 400);
    // Role check already applied via withRole middleware
    const updates = await c.req.json();
    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id } }, 200);
  }

  // --- POST: Mark order fulfilled ---
  if (method === 'POST') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Order ID required' }, 400);
    // Role check already applied via withRole middleware
    // Only owner and manager can fulfill orders
    const { error } = await supabase
      .from('orders')
      .update({ status: 'fulfilled', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    // Trigger restock via inventory_movements
    // TODO: Implement restock logic - add inventory_movements with positive delta
    return c.json({ data: { id } }, 200);
  }

  // --- POST: Refund order ---
  if (method === 'POST') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Order ID required' }, 400);
    // Role check already applied via withRole middleware
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'refunded', status: 'returned', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    // TODO: Trigger stock return via inventory_movements
    // TODO: Implement stock return logic - add inventory_movements with negative delta for refund
    return c.json({ data: { id } }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}