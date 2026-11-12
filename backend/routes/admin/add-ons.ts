import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware
  await withAuth(c);
  // Apply role middleware - owner/manager can CRUD
  await withRole(['owner', 'manager'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List add-ons ---
  if (method === 'GET') {
    const { status } = c.req.query();
    let query = supabase.from('addons').select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Create add-on ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { name, description, features, monthly_price, yearly_price, trial_days } = await c.req.json();
    const { data, error } = await supabase
      .from('addons')
      .insert([{ name, description, features, monthly_price, yearly_price, trial_days, status: 'inactive' }])
      .select()
      .single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  }

  // --- PUT: Update add-on ---
  if (method === 'PUT') {
    const addonId = c.req.query('id');
    if (!addonId) return c.json({ error: 'Add-on ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { name, description, features, monthly_price, yearly_price, trial_days } = await c.req.json();
    const { error } = await supabase
      .from('addons')
      .update({ name, description, features, monthly_price, yearly_price, trial_days })
      .eq('id', addonId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: addonId } }, 200);
  }

  // --- PUT: Toggle add-on status ---
  if (method === 'PUT' && c.req.query('status')) {
    const addonId = c.req.query('id');
    if (!addonId) return c.json({ error: 'Add-on ID required' }, 400);
    const { status } = await c.req.json();
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { error } = await supabase
      .from('addons')
      .update({ status })
      .eq('id', addonId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: addonId, status } }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}