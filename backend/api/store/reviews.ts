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

  const { product_id, rating, title, body } = await c.req.json();

  if (!product_id || !rating) {
    return c.json({ error: 'Product ID and rating are required' }, 400);
  }

  if (rating < 1 || rating > 5) {
    return c.json({ error: 'Rating must be between 1 and 5' }, 400);
  }

  // Insert review
  const { error } = await supabase
    .from('reviews')
    .insert([{ product_id, customer_name: 'Anonymous', rating, title, body, status: 'pending' }]);

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ data: { submitted: true } }, 201);
}