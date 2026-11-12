import { z } from 'zod';
import { createSupabaseServerClient, rateLimiter, setCorsHeaders } from '../../lib/supabase-client';

const contactSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320),
  subject: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(1).max(10000),
});

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);
  if (c.req.method !== 'POST') return c.json({ error: 'Method not allowed' }, 405);
  if (!rateLimiter.check(c.req.ip || 'unknown', 5, 60_000)) return c.json({ error: 'Too many requests' }, 429);

  let input;
  try { input = contactSchema.parse(await c.req.json()); }
  catch { return c.json({ error: 'Name, valid email, and message are required' }, 400); }

  try {
    const supabase = createSupabaseServerClient();
    const { error: insertError } = await supabase.from('contact_inquiries').insert({
      sender_name: input.name,
      sender_email: input.email,
      subject: input.subject,
      message: input.message,
      status: 'unread',
    });
    if (insertError) return c.json({ error: 'Unable to submit your message' }, 400);

    const { data: settings } = await supabase.from('store_settings')
      .select('messaging')
      .eq('id', 1)
      .maybeSingle();
    const recipient = settings?.messaging?.replyTo;
    if (recipient) {
      await supabase.from('outbox').insert({
        channel: 'email',
        recipient,
        template: 'contact_inquiry',
        payload: {
          sender_name: input.name,
          sender_email: input.email,
          subject: input.subject,
          message: input.message,
        },
      });
    }
    return c.json({ data: { submitted: true } }, 201);
  } catch {
    return c.json({ error: 'Contact form is temporarily unavailable' }, 503);
  }
}
