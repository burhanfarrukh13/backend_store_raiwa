import { z } from 'zod';
import { setCorsHeaders, createSupabaseServerClient } from '../../lib/supabase-client';

// Authentication and the role matrix are enforced by the dispatcher (lib/access.ts)
// before this handler runs, so it only validates input and talks to the database.

const FULFILLMENT = ['unfulfilled', 'fulfilled', 'returned', 'cancelled'] as const;
const PAYMENT = ['unpaid', 'paid', 'refunded', 'partially_refunded'] as const;
const ACTIONS = ['fulfill', 'cancel', 'return', 'refund'] as const;

// Only these fields can be edited directly. Money fields, status and customer links
// change through checkout or the transition actions, never through a free-form PUT.
const updateSchema = z.object({
  payment_status: z.enum(['unpaid', 'paid']).optional(),
  courier_name: z.string().trim().max(120).nullable().optional(),
  tracking_number: z.string().trim().max(120).nullable().optional(),
  reference: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
}).strict();

const idSchema = z.string().uuid();

function param(c: any, name: string): string {
  const value = c.req.query(name);
  return typeof value === 'string' ? value : '';
}

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);
  const method = c.req.method;
  if (!['GET', 'PUT', 'POST'].includes(method)) return c.json({ error: 'Method not allowed' }, 405);

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch {
    return c.json({ error: 'Service is not configured' }, 503);
  }

  const rawId = param(c, 'id');
  if (rawId && !idSchema.safeParse(rawId).success) return c.json({ error: 'Invalid order ID' }, 400);

  // --- GET ?id=…: one order with its lines and payments ---
  if (method === 'GET' && rawId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customers (*), order_items (*), order_payments (*)')
      .eq('id', rawId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) {
      console.error('Admin order detail failed:', error);
      return c.json({ error: 'Unable to load order' }, 500);
    }
    if (!data) return c.json({ error: 'Order not found' }, 404);
    return c.json({ data }, 200);
  }

  // --- GET: list orders (filters: status, payment_status; paging: limit, offset) ---
  if (method === 'GET') {
    const status = param(c, 'status');
    const paymentStatus = param(c, 'payment_status');
    if (status && !(FULFILLMENT as readonly string[]).includes(status)) return c.json({ error: 'Invalid status filter' }, 400);
    if (paymentStatus && !(PAYMENT as readonly string[]).includes(paymentStatus)) return c.json({ error: 'Invalid payment_status filter' }, 400);

    const limit = Math.min(Math.max(parseInt(param(c, 'limit'), 10) || 50, 1), 200);
    const offset = Math.max(parseInt(param(c, 'offset'), 10) || 0, 0);

    let query = supabase
      .from('orders')
      .select('*, customers (*), order_items (*)')
      .is('deleted_at', null);
    if (status) query = query.eq('status', status);
    if (paymentStatus) query = query.eq('payment_status', paymentStatus);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      console.error('Admin order list failed:', error);
      return c.json({ error: 'Unable to load orders' }, 500);
    }
    return c.json({ data, limit, offset }, 200);
  }

  if (!rawId) return c.json({ error: 'Order ID required' }, 400);

  // --- PUT ?id=…: edit payment flag, courier, tracking, reference, notes ---
  if (method === 'PUT') {
    let updates: z.infer<typeof updateSchema>;
    try {
      updates = updateSchema.parse(await c.req.json());
    } catch (error) {
      if (error instanceof z.ZodError) return c.json({ error: 'Invalid order update' }, 400);
      return c.json({ error: 'Invalid JSON body' }, 400);
    }
    if (Object.keys(updates).length === 0) return c.json({ error: 'No editable fields supplied' }, 400);

    const { data, error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', rawId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('Admin order update failed:', error);
      return c.json({ error: 'Unable to update order' }, 500);
    }
    if (!data) return c.json({ error: 'Order not found' }, 404);
    return c.json({ data: { id: rawId } }, 200);
  }

  // --- POST ?id=…&action=fulfill|cancel|return|refund ---
  // One database transaction changes the status and returns stock to the ledger.
  const action = param(c, 'action');
  if (!(ACTIONS as readonly string[]).includes(action)) {
    return c.json({ error: `action must be one of: ${ACTIONS.join(', ')}` }, 400);
  }
  const { data, error } = await supabase.rpc('admin_set_order_status', {
    p_order_id: rawId,
    p_action: action,
  });
  if (error) {
    const message = error.message || '';
    if (message.includes('order_not_found')) return c.json({ error: 'Order not found' }, 404);
    if (message.includes('invalid_transition')) return c.json({ error: 'That change is not allowed for the order\'s current status' }, 409);
    if (message.includes('nothing_to_refund')) return c.json({ error: 'Only paid orders can be refunded' }, 409);
    console.error('Admin order transition failed:', error);
    return c.json({ error: 'Unable to update order' }, 500);
  }
  return c.json({ data }, 200);
}
