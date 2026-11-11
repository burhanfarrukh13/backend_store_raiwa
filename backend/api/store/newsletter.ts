import { setCorsHeaders } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { email } = await c.req.json();

  if (!email) {
    return c.json({ error: 'Email required' }, 400);
  }

  // Check if subscriber already exists
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('email', email)
    .single();

  if (existing) {
    return c.json({ data: existing, already_subscribed: true }, 200);
  }

  // Add subscriber
  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert([{ email, subscribed_at: new Date().toISOString(), status: 'active' }]);

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ data: { email }, already_subscribed: false }, 201);
}