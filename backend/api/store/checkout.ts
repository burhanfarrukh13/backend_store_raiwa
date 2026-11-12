import { z } from 'zod';
import { setCorsHeaders, createSupabaseServerClient, rateLimiter } from '../../lib/supabase-client';

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(1).max(160),
  customer_email: z.string().trim().email().max(320),
  customer_phone: z.string().trim().min(7).max(32),
  payment_method: z.enum(['cod', 'bank_transfer']),
  variant_ids: z.array(z.string().uuid()).min(1).max(50),
  quantities: z.array(z.number().int().min(1).max(100)).min(1).max(50),
  coupon_code: z.string().trim().max(64).optional().or(z.literal('')),
  idempotency_key: z.string().trim().min(8).max(128),
  turnstile_token: z.string().max(4096).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);
  if (c.req.method !== 'POST') return c.json({ error: 'Method not allowed' }, 405);
  if (process.env.PUBLIC_CHECKOUT_ENABLED !== 'true') {
    return c.json({ error: 'Checkout is temporarily unavailable' }, 503);
  }
  if (process.env.NODE_ENV === 'production' && !process.env.TURNSTILE_SECRET_KEY) {
    return c.json({ error: 'Checkout protection is not configured' }, 503);
  }

  if (!rateLimiter.check(c.req.ip || 'unknown', 5, 60_000)) {
    return c.json({ error: 'Too many checkout attempts. Please try again later.' }, 429);
  }

  let parsed: z.infer<typeof checkoutSchema>;
  try {
    const body = await c.req.json();
    const key = c.req.header('Idempotency-Key') || body.idempotency_key;
    parsed = checkoutSchema.parse({ ...body, idempotency_key: key });
    if (parsed.variant_ids.length !== parsed.quantities.length) {
      return c.json({ error: 'Each variant must have a quantity' }, 400);
    }
    if (new Set(parsed.variant_ids).size !== parsed.variant_ids.length) {
      return c.json({ error: 'Duplicate variants are not allowed in checkout' }, 400);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid checkout details', details: error.issues.map((issue) => issue.path.join('.')) }, 400);
    }
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (process.env.TURNSTILE_SECRET_KEY) {
    const verified = await verifyTurnstile(parsed.turnstile_token || '', c.req.ip || '');
    if (verified === 'unavailable') return c.json({ error: 'Checkout protection is temporarily unavailable' }, 503);
    if (!verified) return c.json({ error: 'Please complete the security check' }, 403);
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc('place_order', {
      p_order_number: null,
      p_customer_name: parsed.customer_name,
      p_customer_email: parsed.customer_email,
      p_customer_phone: parsed.customer_phone,
      p_payment_method: parsed.payment_method,
      p_variant_ids: parsed.variant_ids,
      p_quantities: parsed.quantities,
      p_coupon_code: parsed.coupon_code || null,
      p_notes: parsed.notes || null,
      p_idempotency_key: parsed.idempotency_key,
    });

    if (error) {
      const message = error.message || 'Checkout failed';
      if (message.includes('insufficient_stock')) {
        return c.json({ error: 'One or more items no longer have enough stock' }, 409);
      }
      if (message.includes('product_unavailable')) {
        return c.json({ error: 'One or more products are no longer available' }, 409);
      }
      if (message.includes('invalid_coupon')) return c.json({ error: 'Invalid or expired coupon' }, 400);
      if (message.includes('invalid_')) return c.json({ error: 'Invalid checkout details' }, 400);
      console.error('Checkout database transaction failed:', error);
      return c.json({ error: 'Checkout could not be completed' }, 500);
    }

    const order = Array.isArray(data) ? data[0] : data;
    if (!order?.order_id || !order?.order_number) {
      console.error('place_order returned an unexpected response');
      return c.json({ error: 'Checkout could not be completed' }, 500);
    }
    return c.json({
      success: true,
      order_id: order.order_id,
      order_number: order.order_number,
      total: order.total,
      status: order.status,
      duplicate: Boolean(order.duplicate),
    }, order.duplicate ? 200 : 201);
  } catch (error) {
    console.error('Checkout service unavailable:', error);
    return c.json({ error: 'Checkout service unavailable' }, 503);
  }
}

async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean | 'unavailable'> {
  if (!token) return false;
  try {
    const form = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY || '',
      response: token,
    });
    if (remoteIp && remoteIp !== 'unknown') form.set('remoteip', remoteIp);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!response.ok) return 'unavailable';
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch {
    return 'unavailable';
  }
}
