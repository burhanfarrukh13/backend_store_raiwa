import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // Apply auth middleware
  await withAuth(c);
  // Apply role middleware - owner/manager/support can CRUD
  await withRole(['owner', 'manager', 'support'])(c);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List FAQs ---
  if (method === 'GET') {
    const { category } = c.req.query();
    let query = supabase.from('faqs').select('*');
    if (category) query = query.eq('category', category);
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data }, 200);
  }

  // --- POST: Create FAQ ---
  if (method === 'POST') {
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'support'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { question, answer, category } = await c.req.json();
    const { data, error } = await supabase
      .from('faqs')
      .insert([{ question, answer, category, sort_order: 0, status: 'published' }])
      .select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  }

  // --- PUT: Update FAQ ---
  if (method === 'PUT') {
    const faqId = c.req.query('id');
    if (!faqId) return c.json({ error: 'FAQ ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager', 'support'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { question, answer, category } = await c.req.json();
    const { data, error } = await supabase
      .from('faqs')
      .update({ question, answer, category })
      .eq('id', faqId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id: faqId } }, 200);
  }

  // --- DELETE: Soft delete FAQ ---
  if (method === 'DELETE') {
    const faqId = c.req.query('id');
    if (!faqId) return c.json({ error: 'FAQ ID required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden: Only owner can delete FAQs' }, 403);
    }
    const { data, error } = await supabase
      .from('faqs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', faqId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}