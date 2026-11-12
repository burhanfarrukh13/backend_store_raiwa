import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ authenticate: vi.fn() }));
vi.mock('../lib/auth-guard', () => ({
  authenticateStaff: mocks.authenticate,
  AuthorizationError: class AuthorizationError extends Error {},
}));
vi.mock('../lib/supabase-client', () => ({
  createSupabaseAnonClient: vi.fn(),
}));

import { dispatchVercelRoute } from '../lib/vercel-handler';

function fakeRequest(): any {
  return {
    method: 'GET',
    url: '/api/admin/orders',
    headers: { authorization: 'Bearer token', origin: 'https://admin.example' },
    body: {},
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function fakeResponse(): any {
  return {
    headers: {} as Record<string, string>,
    statusCode: 0,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    end(body: Buffer | string) { this.body = body.toString(); },
  };
}

describe('admin route gate', () => {
  beforeEach(() => mocks.authenticate.mockReset());

  it('halts unauthorized requests before executing the route handler', async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const route = vi.fn();
    const response = fakeResponse();
    await dispatchVercelRoute(route, '/admin/orders', fakeRequest(), response);
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: 'Unauthorized' });
    expect(route).not.toHaveBeenCalled();
  });

  it('halts inactive staff before executing the route handler', async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, status: 403, error: 'Active staff account required' });
    const route = vi.fn();
    const response = fakeResponse();
    await dispatchVercelRoute(route, '/admin/orders', fakeRequest(), response);
    expect(response.statusCode).toBe(403);
    expect(route).not.toHaveBeenCalled();
  });

  it('checks role permissions before invoking protected handlers', async () => {
    mocks.authenticate.mockResolvedValue({
      ok: true, token: 'token', staff: { id: 'staff-1', role: 'accountant' },
    });
    const route = vi.fn();
    const response = fakeResponse();
    await dispatchVercelRoute(route, '/admin/orders', fakeRequest(), response);
    expect(response.statusCode).toBe(403);
    expect(route).not.toHaveBeenCalled();
  });

  it('does not allow development localhost origins in production CORS', async () => {
    const oldEnv = process.env.NODE_ENV;
    const oldOrigins = process.env.CORS_ALLOWED_ORIGINS;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.CORS_ALLOWED_ORIGINS;
      mocks.authenticate.mockResolvedValue({
        ok: true, token: 'token', staff: { id: 'staff-1', role: 'owner' },
      });
      const response = fakeResponse();
      const request = fakeRequest();
      request.headers.origin = 'http://localhost:4173';
      await dispatchVercelRoute(vi.fn(() => new Response('{}')), '/admin/orders', request, response);
      expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
    } finally {
      if (oldEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = oldEnv;
      if (oldOrigins === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
      else process.env.CORS_ALLOWED_ORIGINS = oldOrigins;
    }
  });
});
