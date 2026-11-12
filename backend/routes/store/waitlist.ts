import { z } from 'zod';
import { createSupabaseServerClient, rateLimiter, setCorsHeaders } from '../../lib/supabase-client';

const waitlistSchema = z.object({
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(7).max(32).optional(),
  product_id: z.string().uuid().optional(),
});

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);
  if (c.req.method !== 'POST') return c.json({ error: 'Method not allowed' }, 405);
  if (!rateLimiter.check(c.req.ip || 'unknown', 5, 60_000)) return c.json({ error: 'Too many requests' }, 429);
  let input;
  try { input = waitlistSchema.parse(await c.req.json()); }
  catch { return c.json({ error: 'A valid email is required' }, 400); }

  try {
    const supabase = createSupabaseServerClient();
    if (input.product_id) {
      const { data: product } = await supabase.from('products')
        .select('id')
        .eq('id', input.product_id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .maybeSingle();
      if (!product) return c.json({ error: 'Product not found' }, 404);
    }

    let lookup = supabase.from('waitlist_subscribers')
      .select('id,email,product_id')
      .eq('email', input.email);
    lookup = input.product_id ? lookup.eq('product_id', input.product_id) : lookup.is('product_id', null);
    const { data: existing, error: lookupError } = await lookup.maybeSingle();
    if (lookupError) return c.json({ error: 'Unable to update waitlist' }, 500);
    if (existing) return c.json({ data: { id: existing.id }, already_subscribed: true }, 200);

    const { data, error } = await supabase.from('waitlist_subscribers')
      .insert({
        email: input.email,
        phone: input.phone || null,
        product_id: input.product_id || null,
        notified_flag: false,
      })
      .select('id')
      .single();
    if (error) return c.json({ error: 'Unable to join waitlist' }, 400);
    return c.json({ data: { id: data.id }, already_subscribed: false }, 201);
  } catch {
    return c.json({ error: 'Waitlist is temporarily unavailable' }, 503);
  }
}
