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

  const { email, phone, product_id } = await c.req.json();

  if (!email) {
    return c.json({ error: 'Email required' }, 400);
  }

  // Check if already on waitlist
  const { data: existing } = await supabase
    .from('waitlist_subscribers')
    .select('*')
    .eq('email', email);

  if (existing && existing.length > 0) {
    return c.json({ data: existing[0], already_subscribed: true }, 200);
  }

  // Add to waitlist
  const { error } = await supabase
    .from('waitlist_subscribers')
    .insert([{ email, phone, product_id, subscribed_at: new Date().toISOString(), notified_flag: false }]);

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ data: { id: 'new' }, already_subscribed: false }, 201);
}