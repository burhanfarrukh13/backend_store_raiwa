import type { IncomingMessage, ServerResponse } from 'node:http';
import { createSupabaseAnonClient } from './supabase-client';
import { authenticateStaff, AuthorizationError } from './auth-guard';

type RouteContext = {
  req: {
    method: string;
    header(name: string): string | undefined;
    query(name?: string): string | Record<string, string>;
    json(): Promise<any>;
    rawBody: Buffer;
    ip: string;
  };
  res: { headers: Record<string, string> };
  json(body: unknown, status?: number): Response;
  set(key: string, value: unknown): void;
  get(key: string): any;
  staffPayload?: { sub: string; role: string };
};

type RouteHandler = (context: RouteContext) => Promise<Response | void> | Response | void;

const roleMap: Record<string, string[]> = {
  '/admin/accounting': ['owner', 'manager', 'accountant'],
  '/admin/add-ons': ['owner', 'manager'],
  '/admin/archive': ['owner', 'manager'],
  '/admin/blog': ['owner', 'manager'],
  '/admin/categories': ['owner', 'manager', 'support'],
  '/admin/cms-pages': ['owner', 'manager'],
  '/admin/collections': ['owner', 'manager', 'support'],
  '/admin/contact-inquiries': ['owner', 'manager', 'support'],
  '/admin/coupons': ['owner', 'manager'],
  '/admin/faqs': ['owner', 'manager', 'support'],
  '/admin/media-library': ['owner', 'manager', 'support', 'accountant'],
  '/admin/newsletter': ['owner', 'manager', 'support'],
  '/admin/orders': ['owner', 'manager', 'support'],
  '/admin/phone-app': ['owner', 'manager'],
  '/admin/products': ['owner', 'manager', 'support'],
  '/admin/redirects': ['owner', 'manager'],
  '/admin/profile': ['owner', 'manager', 'support', 'accountant', 'admin'],
  '/admin/reviews': ['owner', 'manager', 'support'],
  '/admin/staff': ['owner', 'manager'],
  '/admin/store-settings': ['owner', 'manager'],
  '/admin/suppliers': ['owner', 'manager', 'support'],
  '/admin/waitlist': ['owner', 'manager', 'support'],
};

export async function dispatchVercelRoute(
  route: RouteHandler,
  routePath: string,
  request: IncomingMessage & { body?: unknown },
  response: ServerResponse,
): Promise<void> {
  const headers = normalizeHeaders(request.headers);
  const url = new URL(request.url || '/', 'https://api.local');
  const origin = headers.origin;
  const cors = corsHeaders(origin);

  if ((request.method || 'GET').toUpperCase() === 'OPTIONS') {
    response.statusCode = 204;
    Object.entries(cors).forEach(([name, value]) => response.setHeader(name, value));
    response.end();
    return;
  }

  const contextValues = new Map<string, unknown>();
  let requestBody: Buffer;
  try {
    requestBody = await readRequestBody(request, headers);
  } catch {
    response.statusCode = 413;
    Object.entries(cors).forEach(([name, value]) => response.setHeader(name, value));
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'Request body is too large' }));
    return;
  }
  let context: RouteContext;
  context = {
    req: {
      method: (request.method || 'GET').toUpperCase(),
      header: (name) => headers[name.toLowerCase()],
      query: (name) => {
        if (name) return url.searchParams.get(name) || '';
        return Object.fromEntries(url.searchParams.entries());
      },
      json: async () => {
        if (requestBody.length === 0) return {};
        return JSON.parse(requestBody.toString('utf8'));
      },
      rawBody: requestBody,
      ip: headers['x-forwarded-for']?.split(',')[0].trim() || request.socket.remoteAddress || 'unknown',
    },
    res: { headers: {} },
    json: (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    set: (key, value) => contextValues.set(key, value),
    get: (key) => contextValues.get(key),
  };

  try {
    if (routePath.startsWith('/admin/')) {
      const auth = await authenticateStaff(headers.authorization || null, createSupabaseAnonClient);
      if (!auth.ok) {
        await sendResponse(response, context.json({ error: auth.error }, auth.status), cors);
        return;
      }

      const allowedRoles = roleMap[routePath] || [];
      if (!allowedRoles.includes(auth.staff.role)) {
        await sendResponse(response, context.json({ error: 'Forbidden' }, 403), cors);
        return;
      }
      if (
        routePath === '/admin/staff' &&
        ['POST', 'DELETE'].includes(context.req.method) &&
        auth.staff.role !== 'owner'
      ) {
        await sendResponse(response, context.json({ error: 'Forbidden' }, 403), cors);
        return;
      }
      context.staffPayload = { sub: auth.staff.id, role: auth.staff.role };
      context.set('staffPayload', context.staffPayload);
      context.set('staffJwt', auth.token);
    }

    const result = await route(context);
    const output = result instanceof Response
      ? result
      : context.json({ error: 'Route did not return a response' }, 500);
    await sendResponse(response, output, cors);
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 500;
    const message = status === 403 ? 'Forbidden' : 'Internal server error';
    if (status === 500) console.error('API route failed:', routePath, error);
    await sendResponse(response, context.json({ error: message }, status), cors);
  }
}

function corsHeaders(origin?: string): Record<string, string> {
  const configured = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const allowed = new Set(configured);
  if (process.env.NODE_ENV !== 'production') {
    [
      'http://localhost:4173',
      'http://127.0.0.1:4173',
      'http://localhost:8787',
      'http://127.0.0.1:8787',
    ].forEach((localOrigin) => allowed.add(localOrigin));
  }
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret, X-Hub-Signature-256, Idempotency-Key',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
  if (origin && allowed.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function normalizeHeaders(headers: IncomingMessage['headers']): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (typeof value === 'string') result[name.toLowerCase()] = value;
    else if (Array.isArray(value)) result[name.toLowerCase()] = value.join(', ');
  }
  return result;
}

async function readRequestBody(
  request: IncomingMessage & { body?: unknown },
  headers: Record<string, string>,
): Promise<Buffer> {
  if (request.body !== undefined) {
    const body = typeof request.body === 'string' || Buffer.isBuffer(request.body)
      ? request.body
      : JSON.stringify(request.body);
    return Buffer.from(body);
  }
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes((request.method || '').toUpperCase())) return Buffer.alloc(0);

  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > 1024 * 1024) throw new Error('Request body exceeds 1 MB');
    chunks.push(buffer);
  }
  if (!headers['content-length'] && chunks.length === 0) return Buffer.alloc(0);
  return Buffer.concat(chunks);
}

async function sendResponse(
  response: ServerResponse,
  result: Response,
  cors: Record<string, string>,
): Promise<void> {
  response.statusCode = result.status;
  const headers = new Headers(result.headers);
  Object.entries(cors).forEach(([name, value]) => headers.set(name, value));
  headers.forEach((value, name) => response.setHeader(name, value));
  response.end(Buffer.from(await result.arrayBuffer()));
}
