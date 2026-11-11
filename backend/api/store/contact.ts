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

  const { name, email, subject, message } = await c.req.json();

  if (!name || !email || !message) {
    return c.json({ error: 'Name, email, and message are required' }, 400);
  }

  // Insert contact inquiry
  const { error } = await supabase
    .from('contact_inquiries')
    .insert([{ sender_name: name, sender_email: email, subject, message, status: 'unread' }]);

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  // Also add to outbox for notification
  await supabase
    .from('outbox')
    .insert([{ 
      channel: 'email', 
      recipient: email, 
      template: 'contact_form',
      payload: { subject, name },
      status: 'pending',
      attempts: 0,
      max_attempts: 3
    }]);

  return c.json({ data: { submitted: true } }, 201);
}