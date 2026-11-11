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

  // --- GET: List blog posts ---
  if (method === 'GET') {
    const { status, author } = c.req.query();
    let query = supabase.from('blog_posts').select('*');
    if (status) query = query.eq('status', status);
    if (author) query = query.eq('author', author);
    const { data, error } = await query.order('published_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Create blog post ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { title, slug, excerpt, body, featured_image_url } = await c.req.json();
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([{ title, slug, excerpt, body, featured_image_url, status: 'draft' }])
      .select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  }

  // --- PUT: Update blog post ---
  if (method === 'PUT') {
    const blogId = c.req.query('id');
    if (!blogId) return c.json({ error: 'Blog post ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { title, slug, excerpt, body, featured_image_url, status } = await c.req.json();
    const { data, error } = await supabase
      .from('blog_posts')
      .update({ title, slug, excerpt, body, featured_image_url, status, published_at: status === 'published' ? new Date().toISOString() : null })
      .eq('id', blogId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: blogId } }, 200);
  }

  // --- DELETE: Soft delete blog post ---
  if (method === 'DELETE') {
    const blogId = c.req.query('id');
    if (!blogId) return c.json({ error: 'Blog post ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden: Only owner can delete blog posts' }, 403);
    }
    const { data, error } = await supabase
      .from('blog_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', blogId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}