import { withAuth, withRole, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const method = c.req.method;
  const supabase = createSupabaseServerClient();

  // --- GET: List archived items ---
  if (method === 'GET') {
    const { type } = c.req.query();
    let query = supabase.from('archive_items').select('*'); // This table may need to be created or we query by deleted_at
    // Alternative: query tables that have deleted_at
    if (type === 'products') {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, deleted_at')
        .not('deleted_at', 'is', null);
      if (error) return c.json({ error: error.message }, 500);
      return c.json({ data }, 200);
    }
    if (type === 'orders') {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, deleted_at')
        .not('deleted_at', 'is', null);
      if (error) return c.json({ error: error.message }, 500);
      return c.json({ data }, 200);
    }
    // Add more types as needed...
    return c.json({ data: [] }, 200);
  }

  // --- POST: Restore archived item ---
  if (method === 'POST') {
    const { id, type } = await c.req.json();
    if (!id || !type) return c.json({ error: 'ID and type required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner', 'manager'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Restore based on type
    let updateObj = {};
    if (type === 'products') {
      updateObj = { deleted_at: null };
    } else if (type === 'orders') {
      updateObj = { deleted_at: null, status: 'unfulfilled', payment_status: 'unpaid' };
    } else if (type === 'coupons') {
      updateObj = { status: 'active', deleted_at: null };
    } else if (type === 'reviews') {
      updateObj = { deleted_at: null };
    } else if (type === 'blog_posts') {
      updateObj = { deleted_at: null };
    } else if (type === 'cms_pages') {
      updateObj = { deleted_at: null };
    } else if (type === 'faqs') {
      updateObj = { deleted_at: null };
    } else if (type === 'redirects') {
      updateObj = { status: 'active', deleted_at: null };
    } else if (type === 'newsletter_subscribers') {
      updateObj = { deleted_at: null };
    } else if (type === 'contact_inquiries') {
      updateObj = { deleted_at: null };
    } else if (type === 'push_subscriptions') {
      updateObj = { deleted_at: null };
    } else if (type === 'expenses') {
      updateObj = { deleted_at: null };
    } else if (type === 'marketing_spend') {
      updateObj = { deleted_at: null };
    } else if (type === 'courier_settlements') {
      updateObj = { deleted_at: null };
    } else if (type === 'accounting_setup_steps') {
      updateObj = { deleted_at: null };
    } else if (type === 'addons') {
      updateObj = { deleted_at: null };
    } else if (type === 'ai_connections') {
      updateObj = { deleted_at: null };
    } else if (type === 'staff_profiles') {
      updateObj = { deleted_at: null };
    } else if (type === 'audit_log') {
      updateObj = { deleted_at: null };
    }

    if (Object.keys(updateObj).length === 0) {
      return c.json({ error: 'Unknown type' }, 400);
    }

    const { error } = await supabase
      .from(type)
      .update(updateObj)
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id, type, restored: true } }, 200);
  }

  // --- POST: Permanently delete (purge) archived item ---
  if (method === 'DELETE') {
    const { id, type } = await c.req.json();
    if (!id || !type) return c.json({ error: 'ID and type required' }, 400);
    if (!c.get('staffPayload')?.role || !['owner'].includes(c.get('staffPayload').role)) {
      return c.json({ error: 'Forbidden: Only owner can purge' }, 403);
    }

    // Soft purge - just mark as purged, or actually delete depending on policy
    // For now, we'll just update a status or keep soft delete
    const { error } = await supabase
      .from('archive_log') // or just delete the record
      .delete()
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data: { id, purged: true } }, 200);
  }

  return c.json({ error: 'Method not allowed' }, 405);
}