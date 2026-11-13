import { setCorsHeaders } from '../lib/supabase-client';
import { isCloudinaryConfigured } from '../lib/media-storage';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasAnonKey = Boolean(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const cloudinaryReady = isCloudinaryConfigured();

  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      services: {
        supabase: {
          url: supabaseUrl ? 'configured' : 'missing',
          serviceKey: hasServiceKey ? 'configured' : 'missing',
          anonKey: hasAnonKey ? 'configured' : 'missing',
        },
        cloudinary: {
          status: cloudinaryReady ? 'ready' : 'missing_credentials',
          cloudName: Boolean(process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME),
          apiKey: Boolean(process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY),
          apiSecret: Boolean(process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET),
          folder: process.env.CLOUDINARY_FOLDER || 'catalog',
        }
      }
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}