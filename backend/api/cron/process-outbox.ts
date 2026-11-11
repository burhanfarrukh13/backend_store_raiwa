import { setCorsHeaders, createSupabaseServerClient } from '../../lib/supabase-client';

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);

  // This route is called by Supabase pg_cron via pg_net
  // It requires the CRON_SHARED_SECRET header for authentication
  const secret = c.req.header('X-Cron-Secret') || c.req.header('x-cron-secret');

  if (secret !== process.env.CRON_SHARED_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createSupabaseServerClient();

  // Process a bounded batch of outbox jobs (e.g., max 10 per call)
  const { data, error } = await supabase
    .from('outbox')
    .select('*, channels:channels(*)')
    .eq('status', 'pending')
    .limit(10);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  if (!data || data.length === 0) {
    return c.json({ processed: 0, message: 'No pending outbox items' }, 200);
  }

  // Process each outbox item
  const results = await Promise.allSettled(
    data.map(item => processOutboxItem(item as any))
  );

  // Update outbox statuses based on processing results
  const updatePromises = data.map((item, index) => {
    const status = results[index].status;
    let updateStatus: string;
    let errorDetails: string | null = null;

    if (status === 'fulfilled') {
      const result = results[index].value;
      if (result && 'error' in result && result.status) {
        updateStatus = 'sent';
      } else {
        updateStatus = 'failed';
        errorDetails = (result as any).error || 'Unknown error';
      }
    } else {
      updateStatus = 'failed';
      errorDetails = (results[index] as any).reason?.message || 'Processing failed';
    }

    return supabase
      .from('outbox')
      .update({ status: updateStatus, processed_at: new Date().toISOString(), error_details: errorDetails })
      .eq('id', item.id);
  });

  await Promise.all(updatePromises);

  return c.json({
    processed: data.length,
    results: results.map(r => r.status),
  }, 200);
}

async function processOutboxItem(item: any) {
  // Process based on channel
  switch (item.channel) {
    case 'email':
      return await sendEmail(item);

    case 'whatsapp':
      return await sendWhatsApp(item);

    default:
      return { channel: item.channel, status: 'unknown' };
  }
}

async function sendEmail(item: any) {
  // In a real implementation, this would use Resend, SendGrid, or SMTP
  // For now, mark as sent (or failed if no sender configured)
  const recipient = item.payload?.recipient || item.recipient;
  const template = item.payload?.template || item.template;
  const subject = item.payload?.subject || item.subject;

  // TODO: Integrate with actual email service
  // e.g., using Resend: await resend.emails.send({ from, to, subject, html })
  
  // Simulate successful send
  return { channel: 'email', status: 'sent' };
}

async function sendWhatsApp(item: any) {
  // In a real implementation, this would use Meta Cloud API
  // with proper signature verification and message formatting
  const phone = item.payload?.phone || item.phone;
  const message = item.payload?.message || item.message;

  // TODO: Integrate with actual WhatsApp API
  // e.g., using Meta Business API with template messaging
  
  // Simulate successful send
  return { channel: 'whatsapp', status: 'sent' };
}