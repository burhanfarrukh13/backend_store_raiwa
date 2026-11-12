import { z } from 'zod';
import { createSupabaseServerClient, rateLimiter, setCorsHeaders } from '../../lib/supabase-client';

const reviewSchema = z.object({
  product_id: z.string().uuid(),
  customer_name: z.string().trim().min(1).max(160),
  customer_email: z.string().trim().email().max(320).optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional().default(''),
  body: z.string().trim().max(10000).optional().default(''),
});

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);
  if (c.req.method !== 'POST') return c.json({ error: 'Method not allowed' }, 405);
  if (!rateLimiter.check(c.req.ip || 'unknown', 5, 60_000)) return c.json({ error: 'Too many requests' }, 429);
  let input;
  try { input = reviewSchema.parse(await c.req.json()); }
  catch { return c.json({ error: 'Review details are invalid' }, 400); }

  try {
    const supabase = createSupabaseServerClient();
    const { data: product } = await supabase.from('products')
      .select('id')
      .eq('id', input.product_id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();
    if (!product) return c.json({ error: 'Product not found' }, 404);
    const { error } = await supabase.from('reviews').insert({
      product_id: input.product_id,
      customer_name: input.customer_name,
      customer_email: input.customer_email || null,
      rating: input.rating,
      title: input.title,
      body: input.body,
      status: 'pending',
    });
    if (error) return c.json({ error: 'Unable to submit review' }, 400);
    return c.json({ data: { submitted: true } }, 201);
  } catch {
    return c.json({ error: 'Reviews are temporarily unavailable' }, 503);
  }
}
