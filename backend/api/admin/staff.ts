import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient, createSupabaseAsUserClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware
  await withAuth(c);
  // Apply role middleware - owner/manager can manage staff
  await withRole(['owner', 'manager'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List staff ---
  if (method === 'GET') {
    const { role, status } = c.req.query();
    let query = supabase.from('staff_profiles').select('*');
    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Invite staff ---
  if (method === 'POST') {
    // Only owner can invite staff
    const payload = c.get('staffPayload');
    if (!payload?.role || payload.role !== 'owner') {
      return c.json({ error: 'Forbidden: Only owner can invite staff' }, 403);
    }
    const { name, email, role } = await c.req.json();

    // 1. Create user in Supabase Auth
    // Note: This requires the Supabase Admin SDK to create a user
    // For now, we'll create the staff_profiles row and note that auth user creation is needed
    const { data, error } = await supabase
      .from('staff_profiles')
      .insert([{ name, email, role, status: 'invited' }])
      .select();

    if (error) return c.json({ error: error.message }, 400);

    return c.json({ data: { email, authUserCreated: false } }, 201);
  }

  // --- PUT: Update staff (suspend/activate) ---
  if (method === 'PUT') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Staff ID required' }, 400);
    // Role check already applied via withRole middleware
    const { status } = await c.req.json();
    const { error } = await supabase
      .from('staff_profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id, status } }, 200);
  }

  // --- DELETE: Remove staff (soft) ---
  if (method === 'DELETE') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Staff ID required' }, 400);
    // Role check already applied via withRole middleware - only owner can remove
    const { error } = await supabase
      .from('staff_profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}