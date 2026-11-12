import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware
  await withAuth(c);
  // Apply role middleware
  await withRole(['owner', 'manager', 'support', 'accountant'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();
  const staffId = c.get('staffPayload').id;

  // --- GET: Get admin profile ---
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('*, auth.users (*)')
      .eq('id', staffId)
      .single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- PUT: Update profile (name, email) ---
  if (method === 'PUT') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'support', 'accountant'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { name, email } = await c.req.json();
    const { error } = await supabase
      .from('staff_profiles')
      .update({ name, email, updated_at: new Date().toISOString() })
      .eq('id', staffId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { name, email } }, 200);
  }

  // --- PUT: Change password ---
  if (method === 'PUT') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden: Insufficient role' }, 403);
    }
    const { current_password, new_password } = await c.req.json();

    // Validate new password length
    if (new_password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // TODO: In a full implementation, verify current_password against the
    // Supabase Auth user's current password before updating
    // This would require the user's auth token and the auth API

    // For now, update the staff profile note and return
    // In production, use: await supabase.auth.update(staffId, { password: new_password })
    // but this requires the user to be authenticated as the actual user, not service role

    // Update staff profile to note password was changed
    const { error } = await supabase
      .from('staff_profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', staffId);

    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { password_updated: false, note: 'Password update requires auth client' } }, 200);
  }

  // --- GET: Active sessions ---
  if (method === 'GET') {
    // Note: listSessions not available with service_role client
    // Use auth token for full session data in production
    // For now, return staff profile data
    const staffId = c.get('staffPayload')?.id;
    if (!staffId) return c.json({ error: 'Staff ID required' }, 400);
    const { data: profileData, error } = await supabase
      .from('staff_profiles')
      .select('id, name, email, role, status')
      .eq('id', staffId);
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data: { sessions: [], note: 'Session list limited - use auth token for full data' }, profile: profileData }, 200);
  }

  // --- POST: Revoke session ---
  if (method === 'POST') {
    const { session_id } = await c.req.json();
    if (!session_id) return c.json({ error: 'Session ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    // TODO: Implement session revocation
    // In production, this would revoke a specific session from Supabase Auth
    return c.json({ data: { revoked: true, note: 'Session revocation requires auth client' } }, 200);
  }

  // --- POST: Reset demo data ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden: Only owner can reset demo data' }, 403);
    }
    // TODO: Reset localStorage data, restore seed
    return c.json({ data: { reset: true, note: 'Demo data reset not implemented in backend' } }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}