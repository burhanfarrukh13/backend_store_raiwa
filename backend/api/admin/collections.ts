import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware
  await withAuth(c);
  // Apply role middleware
  await withRole(['owner', 'manager', 'support'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List collections ---
  if (method === 'GET') {
    const { type } = c.req.query();
    let query = supabase.from('collections').select('*');
    if (type) query = query.eq('type', type);
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Create collection ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { name, description, type } = await c.req.json();
    const { data, error } = await supabase
      .from('collections')
      .insert([{ name, description, type, status: 'draft' }])
      .select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  }

  // --- PUT: Update collection ---
  if (method === 'PUT') {
    const collectionId = c.req.query('id');
    if (!collectionId) return c.json({ error: 'Collection ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { name, description } = await c.req.json();
    const { data, error } = await supabase
      .from('collections')
      .update({ name, description })
      .eq('id', collectionId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: collectionId } }, 200);
  }

  // --- POST: Refresh smart collection ---
  if (method === 'POST' && c.req.query('refresh')) {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const collectionId = c.req.query('refresh');
    // Call the refresh_smart_collection function
    const { data, error } = await supabase
      .rpc('refresh_smart_collection', { p_collection_id: collectionId });
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}