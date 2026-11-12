/// <reference types="node" />

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Public client for server-side (service_role) operations
// In production, SUPABASE_SERVICE_ROLE_KEY is set as a Vercel secret
export const createSupabaseServerClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      // Server-side client doesn't need browser auth flow
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// A public-key client used only for JWT verification and RLS-scoped staff lookup.
// Never use the service-role key to decide whether a caller is authorized.
export const createSupabaseAnonClient = (accessToken?: string): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  return createClient(supabaseUrl, supabaseKey, {
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

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

// CORS helper for API routes
export const setCorsHeaders = (headers: Record<string, string>) => {
  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Cron-Secret, X-Hub-Signature-256, Idempotency-Key';
};