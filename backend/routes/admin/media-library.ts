import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List media assets ---
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('status', 'active');
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Upload media (creates record, signed URL handled by Storage API) ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'support'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { file_name, alt_text } = await c.req.json();
    const { error } = await supabase
      .from('media_assets')
      .insert([{ file_name, alt_text, sort_order: 0, status: 'active' }]);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: 'new' } }, 201);
  }

  // --- DELETE: Soft delete media ---
  if (method === 'DELETE') {
    const { id } = c.req.query();
    if (!id) return c.json({ error: 'Media ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { error } = await supabase
      .from('media_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}