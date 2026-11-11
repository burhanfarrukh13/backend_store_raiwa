import { setCorsHeaders } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  // Verification request from Meta
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return c.newResponse(challenge, { status: 200 });
  }

  // Incoming webhook from Meta
  if (mode === 'receive') {
    const body = await c.req.json();
    const { entry } = body;

    // Process each entry and message
    if (entry && entry.changes) {
      for (const change of entry.changes) {
        const value = change.value;
        if (value.messages) {
          // Extract message details
          const messages = value.messages;
          const messageId = messages[0].id;
          const phone = value.contact?.phone || messages[0].from;

          // TODO: Update whatsapp_threads and whatsapp_messages tables
          // TODO: Set needs_reply flag if the message requires a response
          // TODO: Handle quick replies, template messages, etc.
        }

        if (value.statuses) {
          // Handle delivery status updates
          // Update whatsapp_messages delivery status
        }
      }
    }

    return c.json({ status: 'received' }, 200);
  }

  return c.json({ error: 'Invalid webhook mode' }, 400);
}