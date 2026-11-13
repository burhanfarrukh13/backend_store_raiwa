import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock('../lib/supabase-client', () => ({
  setCorsHeaders: vi.fn(),
  createSupabaseServerClient: mocks.client,
}));

import handler from '../routes/admin/orders';

const ID = 'b8b878ad-26ae-4a46-99de-1a73e2fa5590';

// A chainable, awaitable stand-in for the supabase-js query builder.
function builder(result: { data?: unknown; error?: unknown }) {
  const calls: Array<[string, unknown[]]> = [];
  const proxy: any = new Proxy({}, {
    get(_target, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: null, error: null, ...result });
      if (prop === 'calls') return calls;
      return (...args: unknown[]) => { calls.push([prop, args]); return proxy; };
    },
  });
  return proxy;
}

function context(method: string, query: Record<string, string> = {}, body: unknown = {}) {
  return {
    req: {
      method,
      query: (name?: string) => (name ? query[name] ?? '' : query),
      json: async () => body,
    },
    res: { headers: {} },
    json: (payload: unknown, status = 200) =>
      new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } }),
  };
}

const read = async (response: Response | void) => JSON.parse(await (response as Response).text());

describe('admin orders handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('lists orders using IS NULL for deleted_at (never eq null) with bounded paging', async () => {
    const q = builder({ data: [{ id: ID }] });
    mocks.client.mockReturnValue({ from: () => q });
    const response = await handler(context('GET', { status: 'unfulfilled', limit: '9999' }));
    expect((response as Response).status).toBe(200);
    const names = q.calls.map(([name]: [string]) => name);
    expect(q.calls).toContainEqual(['is', ['deleted_at', null]]);
    expect(names).not.toContain('single');
    expect(q.calls).toContainEqual(['range', [0, 199]]);
    expect(q.calls).toContainEqual(['eq', ['status', 'unfulfilled']]);
  });

  it('rejects unknown filter values instead of leaking database errors', async () => {
    mocks.client.mockReturnValue({ from: () => builder({}) });
    const response = await handler(context('GET', { status: 'bogus' }));
    expect((response as Response).status).toBe(400);
  });

  it('serves order detail when an id is supplied (not shadowed by the list branch)', async () => {
    const q = builder({ data: { id: ID, order_items: [] } });
    mocks.client.mockReturnValue({ from: () => q });
    const response = await handler(context('GET', { id: ID }));
    expect(await read(response)).toEqual({ data: { id: ID, order_items: [] } });
    expect(q.calls).toContainEqual(['eq', ['id', ID]]);
  });

  it('returns 404 for an unknown order and 400 for a malformed id', async () => {
    mocks.client.mockReturnValue({ from: () => builder({ data: null }) });
    expect(((await handler(context('GET', { id: ID }))) as Response).status).toBe(404);
    expect(((await handler(context('GET', { id: 'not-a-uuid' }))) as Response).status).toBe(400);
  });

  it('only lets PUT change the whitelisted fields', async () => {
    const q = builder({ data: { id: ID } });
    mocks.client.mockReturnValue({ from: () => q });
    const rejected = await handler(context('PUT', { id: ID }, { total: 1, status: 'fulfilled' }));
    expect((rejected as Response).status).toBe(400);
    const ok = await handler(context('PUT', { id: ID }, { tracking_number: 'TRK123', payment_status: 'paid' }));
    expect((ok as Response).status).toBe(200);
  });

  it('runs fulfil/cancel/return/refund through the atomic database function', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { order_id: ID, status: 'cancelled', restocked: true }, error: null });
    mocks.client.mockReturnValue({ rpc });
    const response = await handler(context('POST', { id: ID, action: 'cancel' }));
    expect((response as Response).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('admin_set_order_status', { p_order_id: ID, p_action: 'cancel' });
  });

  it('maps transition errors to 404/409 and rejects an unknown action', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'invalid_transition' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'order_not_found' } });
    mocks.client.mockReturnValue({ rpc });
    expect(((await handler(context('POST', { id: ID, action: 'fulfill' }))) as Response).status).toBe(409);
    expect(((await handler(context('POST', { id: ID, action: 'fulfill' }))) as Response).status).toBe(404);
    expect(((await handler(context('POST', { id: ID, action: 'explode' }))) as Response).status).toBe(400);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
