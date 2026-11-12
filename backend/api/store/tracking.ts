import { setCorsHeaders, createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);
  if (c.req.method !== 'GET') return c.json({ error: 'Method not allowed' }, 405);

  const orderNumber = String(c.req.query('order_number') || '').trim();
  const phone = String(c.req.query('phone') || '').trim();
  if (!orderNumber || !phone) {
    return c.json({ error: 'Order number and phone are required' }, 400);
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc('track_order_public', {
      p_order_number: orderNumber,
      p_phone: phone,
    });
    if (error) {
      console.error('Order tracking query failed:', error);
      return c.json({ error: 'Order tracking is temporarily unavailable' }, 503);
    }
    if (!data) return c.json({ error: 'Order not found' }, 404);
    return c.json({ data }, 200);
  } catch (error) {
    console.error('Order tracking service unavailable:', error);
    return c.json({ error: 'Order tracking is temporarily unavailable' }, 503);
  }
}
