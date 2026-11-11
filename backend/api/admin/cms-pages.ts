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

  // --- GET: List CMS pages ---
  if (method === 'GET') {
    const { status } = c.req.query();
    let query = supabase.from('cms_pages').select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Create CMS page ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { title, slug, content } = await c.req.json();
    const { data, error } = await supabase
      .from('cms_pages')
      .insert([{ title, slug, content, status: 'draft' }])
      .select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  }

  // --- PUT: Update CMS page ---
  if (method === 'PUT') {
    const pageId = c.req.query('id');
    if (!pageId) return c.json({ error: 'Page ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { title, slug, content } = await c.req.json();
    const { data, error } = await supabase
      .from('cms_pages')
      .update({ title, slug, content })
      .eq('id', pageId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: pageId } }, 200);
  }

  // --- DELETE: Soft delete CMS page ---
  if (method === 'DELETE') {
    const pageId = c.req.query('id');
    if (!pageId) return c.json({ error: 'Page ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden: Only owner can delete CMS pages' }, 403);
    }
    const { data, error } = await supabase
      .from('cms_pages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', pageId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}