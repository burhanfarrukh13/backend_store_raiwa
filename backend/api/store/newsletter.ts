import { z } from 'zod';
import { createSupabaseServerClient, rateLimiter, setCorsHeaders } from '../../lib/supabase-client';

const subscriberSchema = z.object({
  email: z.string().trim().email().max(320),
  name: z.string().trim().max(160).optional(),
});

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);
  if (c.req.method !== 'POST') return c.json({ error: 'Method not allowed' }, 405);
  if (!rateLimiter.check(c.req.ip || 'unknown', 5, 60_000)) return c.json({ error: 'Too many requests' }, 429);
  let input;
  try { input = subscriberSchema.parse(await c.req.json()); }
  catch { return c.json({ error: 'A valid email is required' }, 400); }

  try {
    const supabase = createSupabaseServerClient();
    const { data: existing, error: findError } = await supabase
      .from('newsletter_subscribers')
      .select('id,email,status')
      .eq('email', input.email)
      .is('deleted_at', null)
      .maybeSingle();
    if (findError) return c.json({ error: 'Unable to update subscription' }, 500);
    if (existing?.status === 'active') {
      return c.json({ data: { email: existing.email }, already_subscribed: true }, 200);
    }
    if (existing) {
      const { error } = await supabase.from('newsletter_subscribers')
        .update({ name: input.name || null, status: 'active', subscribed_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return c.json({ error: 'Unable to update subscription' }, 400);
    } else {
      const { error } = await supabase.from('newsletter_subscribers').insert({
        email: input.email,
        name: input.name || null,
        subscribed_at: new Date().toISOString(),
        status: 'active',
      });
      if (error) return c.json({ error: 'Unable to subscribe' }, 400);
    }
    return c.json({ data: { email: input.email }, already_subscribed: false }, 201);
  } catch {
    return c.json({ error: 'Newsletter is temporarily unavailable' }, 503);
  }
}
