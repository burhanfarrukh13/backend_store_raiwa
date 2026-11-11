import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: Get accounting data ---
  if (method === 'GET') {
    const { period } = c.req.query();
    let query = supabase.from('expenses').select('*');
    if (period) {
      // Filter by period would need date logic, simplified here
    }
    const { data, error } = await query;
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Add expense ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'accountant'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const expense = await c.req.json();
    const { error } = await supabase
      .from('expenses')
      .insert([{ ...expense, recorded_at: new Date().toISOString() }]);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: expense.id } }, 201);
  }

  // --- GET: Get marketing spend ---
  if (method === 'GET' || method === 'marketing') {
    const { channel } = c.req.query();
    let query = supabase.from('marketing_spend').select('*');
    if (channel) query = query.eq('channel', channel);
    const { data, error } = await query;
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Add marketing spend ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'accountant'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const spend = await c.req.json();
    const { error } = await supabase
      .from('marketing_spend')
      .insert([{ ...spend, recorded_at: new Date().toISOString() }]);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: spend.id } }, 201);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}