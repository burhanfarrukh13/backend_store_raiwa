import { createHmac, timingSafeEqual } from 'node:crypto';
import { setCorsHeaders, createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);
  if (c.req.method === 'GET') {
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');
    if (
      mode === 'subscribe' &&
      process.env.WHATSAPP_VERIFY_TOKEN &&
      token === process.env.WHATSAPP_VERIFY_TOKEN &&
      challenge
    ) {
      return new Response(String(challenge), { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return c.json({ error: 'Webhook verification failed' }, 403);
  }
  if (c.req.method !== 'POST') return c.json({ error: 'Method not allowed' }, 405);

  const secret = process.env.META_APP_SECRET;
  const signature = c.req.header('X-Hub-Signature-256') || '';
  if (!secret || !validSignature(c.req.rawBody, signature, secret)) {
    return c.json({ error: 'Invalid webhook signature' }, 401);
  }

  let payload: any;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) {
    return c.json({ error: 'Unsupported webhook payload' }, 400);
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch {
    return c.json({ error: 'Webhook storage is not configured' }, 503);
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const message of value.messages || []) {
        const phone = message.from;
        if (!phone || !message.id) continue;
        const contact = (value.contacts || []).find((item: any) => item.wa_id === phone);
        const { data: thread, error: threadError } = await supabase
          .from('whatsapp_threads')
          .upsert({
            phone,
            customer_name: contact?.profile?.name || phone,
            last_message_at: new Date(Number(message.timestamp || Date.now() / 1000) * 1000).toISOString(),
          }, { onConflict: 'phone' })
          .select('id')
          .single();
        if (threadError || !thread) {
          console.error('WhatsApp thread save failed:', threadError);
          return c.json({ error: 'Could not save webhook message' }, 500);
        }
        const text = message.text?.body || `[${String(message.type || 'unsupported')} message]`;
        const { error: messageError } = await supabase.from('whatsapp_messages').upsert({
          provider_message_id: message.id,
          thread_id: thread.id,
          direction: 'inbound',
          body: String(text).slice(0, 10000),
          delivery_status: 'received',
          sent_at: new Date(Number(message.timestamp || Date.now() / 1000) * 1000).toISOString(),
        }, { onConflict: 'provider_message_id', ignoreDuplicates: true });
        if (messageError) {
          console.error('WhatsApp message save failed:', messageError);
          return c.json({ error: 'Could not save webhook message' }, 500);
        }
      }

      for (const status of value.statuses || []) {
        if (!status.id) continue;
        const { error } = await supabase
          .from('whatsapp_messages')
          .update({ delivery_status: String(status.status || 'unknown') })
          .eq('provider_message_id', status.id);
        if (error) console.error('WhatsApp delivery status update failed:', error);
      }
    }
  }
  return c.json({ status: 'received' }, 200);
}

function validSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}
