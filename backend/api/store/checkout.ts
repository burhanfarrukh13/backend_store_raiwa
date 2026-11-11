import { withAuth, setCorsHeaders } from '../../lib/auth-guard';
import { createSupabaseServerClient } from '../../lib/supabase-client';

// Rate limit helper (simple in-memory for demo; use Redis in production)
export class RateLimiter {
  private limits = new Map<string, { count: number; reset: number }>();

  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.limits.get(key);

    if (!record) {
      this.limits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }

    if (now > record.reset) {
      // Window expired, reset
      this.limits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      return false; // Rate limited
    }

    record.count += 1;
    return true;
  }
}

// Global rate limiter instance (shared across requests in same worker)
export const rateLimiter = new RateLimiter();

// Checkout API handler
export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const method = c.req.method;

  if (method === 'POST') {
    const body = await c.req.json();
    const { coupon_code, idempotency_key, variant_ids, quantities, ...orderData } = body;

    // Rate limit: max 5 checkout attempts per minute per IP
    const rateLimited = rateLimiter.check(
      c.req.ip || 'unknown',
      5,
      60000
    );

    if (!rateLimited) {
      return c.json({ error: 'Too many checkout attempts. Please try again later.' }, 429);
    }

    const supabase = createSupabaseServerClient();

    try {
      // 1. Validate coupon if provided
      let discount = 0;
      if (coupon_code) {
        const { data: couponResult, error: couponError } = await supabase
          .rpc('validate_coupon', {
            p_code: coupon_code,
            p_order_total: orderData.total,
          });

        if (couponError) {
          return c.json({ error: couponError.message }, 400);
        }

        if (couponResult && couponResult.length > 0) {
          discount = couponResult[0].discount_amount;
        } else {
          return c.json({ error: 'Invalid or expired coupon' }, 400);
        }
      }

      // 2. Validate request shape - ensure we have variant IDs and quantities
      if (!variant_ids || variant_ids.length === 0) {
        return c.json({ error: 'No variant IDs provided' }, 400);
      }

      if (!quantities || quantities.length === 0) {
        return c.json({ error: 'No quantities provided' }, 400);
      }

      if (variant_ids.length !== quantities.length) {
        return c.json({ error: 'Variant IDs and quantities must have the same length' }, 400);
      }

      // 3. Call the place_order SQL function
      const { data, error } = await supabase.rpc('place_order', {
        p_order_number: orderData.orderNumber || `ORD-${Date.now()}`,
        p_customer_name: orderData.customerName,
        p_customer_email: orderData.customerEmail,
        p_customer_phone: orderData.customerPhone,
        p_payment_method: orderData.paymentMethod,
        p_variant_ids: variant_ids,
        p_quantities: quantities,
        p_coupon_code: coupon_code,
        p_notes: orderData.notes,
      });

      if (error) {
        return c.json({ error: error.message }, 400);
      }

      return c.json({
        success: true,
        order_id: data.order_id,
        order_number: data.order_number,
        total: data.total,
        status: data.status,
        discount,
      }, 200);

    } catch (err) {
      console.error('Checkout error:', err);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }

  return c.json({ error: 'Method not allowed' }, 405);
}