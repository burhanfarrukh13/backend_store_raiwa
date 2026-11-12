import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  rateCheck: vi.fn(() => true),
}));

vi.mock('../lib/supabase-client', () => ({
  setCorsHeaders: vi.fn(),
  createSupabaseServerClient: mocks.createSupabaseServerClient,
  rateLimiter: { check: mocks.rateCheck },
}));

import handler from '../api/store/checkout';

const checkoutBody = {
  customer_name: 'Sample Customer',
  customer_email: 'customer@example.test',
  customer_phone: '03001234567',
  payment_method: 'cod',
  variant_ids: ['b8b878ad-26ae-4a46-99de-1a73e2fa5590'],
  quantities: [2],
  idempotency_key: 'checkout-test-key-0001',
};

function context(body: unknown, headers: Record<string, string> = {}) {
  return {
    req: {
      method: 'POST',
      ip: '127.0.0.1',
      header: (name: string) => headers[name] || headers[name.toLowerCase()],
      json: async () => body,
    },
    res: { headers: {} },
    json: (payload: unknown, status = 200) =>
      new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } }),
  };
}

describe('public checkout handler', () => {
  const previous = {
    checkoutEnabled: process.env.PUBLIC_CHECKOUT_ENABLED,
    turnstile: process.env.TURNSTILE_SECRET_KEY,
    nodeEnv: process.env.NODE_ENV,
  };
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateCheck.mockReturnValue(true);
    mocks.createSupabaseServerClient.mockReturnValue({ rpc: mocks.rpc });
    process.env.PUBLIC_CHECKOUT_ENABLED = 'true';
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.NODE_ENV = 'test';
  });
  afterEach(() => {
    if (previous.checkoutEnabled === undefined) delete process.env.PUBLIC_CHECKOUT_ENABLED;
    else process.env.PUBLIC_CHECKOUT_ENABLED = previous.checkoutEnabled;
    if (previous.turnstile === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previous.turnstile;
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    vi.unstubAllGlobals();
  });

  it('fails closed until the public checkout feature is explicitly enabled', async () => {
    process.env.PUBLIC_CHECKOUT_ENABLED = 'false';
    const response = await handler(context(checkoutBody) as any);
    expect(response.status).toBe(503);
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('fails closed in production when Turnstile server verification is unconfigured', async () => {
    process.env.NODE_ENV = 'production';
    const response = await handler(context(checkoutBody) as any);
    expect(response.status).toBe(503);
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('does not create a service-role client when the checkout contract is invalid', async () => {
    const response = await handler(context({ ...checkoutBody, idempotency_key: undefined }) as any);
    expect(response.status).toBe(400);
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('rejects card payments until a payment provider is integrated', async () => {
    const response = await handler(context({ ...checkoutBody, payment_method: 'card' }) as any);
    expect(response.status).toBe(400);
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('sends only validated order inputs to the atomic database function', async () => {
    mocks.rpc.mockResolvedValue({
      data: { order_id: 'order-1', order_number: 'BN-260101-001054', total: 250, status: 'unfulfilled', duplicate: false },
      error: null,
    });
    const response = await handler(context(checkoutBody) as any);
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith('place_order', expect.objectContaining({
      p_order_number: null,
      p_variant_ids: checkoutBody.variant_ids,
      p_quantities: [2],
      p_idempotency_key: checkoutBody.idempotency_key,
    }));
    expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty('p_total');
    expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty('p_price');
  });

  it('maps database stock rejection to a conflict without claiming an order was placed', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'insufficient_stock' } });
    const response = await handler(context(checkoutBody) as any);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('enough stock') });
  });

  it('requires a valid Turnstile token when a production secret is configured', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const response = await handler(context(checkoutBody) as any);
    expect(response.status).toBe(403);
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('verifies Turnstile server-side before creating the order', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    mocks.rpc.mockResolvedValue({
      data: { order_id: 'order-1', order_number: 'BN-260101-001054', total: 250, status: 'unfulfilled', duplicate: false },
      error: null,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = await handler(context({ ...checkoutBody, turnstile_token: 'test-token' }) as any);

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith('place_order', expect.any(Object));
  });
});
