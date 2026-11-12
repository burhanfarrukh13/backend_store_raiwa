import { setCorsHeaders } from '../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}