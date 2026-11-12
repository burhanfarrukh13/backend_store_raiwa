import { timingSafeEqual } from 'node:crypto';
import { setCorsHeaders, createSupabaseServerClient } from '../../lib/supabase-client';

type OutboxJob = {
  id: string;
  channel: 'email' | 'whatsapp' | string;
  recipient: string;
  template: string | null;
  payload: Record<string, unknown> | null;
  attempts: number;
};

export default async function handler(c: any) {
  setCorsHeaders(c.res.headers);
  if (c.req.method !== 'POST') return c.json({ error: 'Method not allowed' }, 405);

  const authorization = c.req.header('Authorization') || '';
  const providedSecret = c.req.header('X-Cron-Secret') || authorization.replace(/^Bearer\s+/i, '');
  const expectedSecret = process.env.CRON_SHARED_SECRET || '';
  if (!expectedSecret || !safeEqual(providedSecret, expectedSecret)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch {
    return c.json({ error: 'Notification worker is not configured' }, 503);
  }

  const { data: jobs, error: claimError } = await supabase.rpc('claim_outbox_jobs', { p_limit: 10 });
  if (claimError) {
    console.error('Outbox claim failed:', claimError);
    return c.json({ error: 'Unable to claim notification jobs' }, 500);
  }

  let sent = 0;
  let failed = 0;
  for (const job of (jobs || []) as OutboxJob[]) {
    let deliveryError: string | null = null;
    try {
      if (job.channel === 'email') await sendEmail(job);
      else if (job.channel === 'whatsapp') await sendWhatsApp(job);
      else throw new Error(`Unsupported notification channel: ${job.channel}`);
    } catch (error) {
      deliveryError = error instanceof Error ? error.message : 'Provider delivery failed';
    }

    const { error: finishError } = await supabase.rpc('finish_outbox_job', {
      p_id: job.id,
      p_success: deliveryError === null,
      p_error: deliveryError,
    });
    if (finishError) {
      console.error('Outbox job status update failed:', job.id, finishError);
      failed += 1;
      continue;
    }
    if (deliveryError === null) sent += 1;
    else {
      failed += 1;
      console.error('Notification delivery failed:', job.id, deliveryError);
    }
  }

  return c.json({ processed: (jobs || []).length, sent, failed }, 200);
}

async function sendEmail(job: OutboxJob): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error('Email delivery disabled: RESEND_API_KEY and EMAIL_FROM are required');

  const payload = job.payload || {};
  let subject: string;
  let html: string;
  if (job.template === 'contact_inquiry') {
    const senderName = escapeHtml(String(payload.sender_name || 'Customer'));
    const senderEmail = escapeHtml(String(payload.sender_email || ''));
    const inquirySubject = escapeHtml(String(payload.subject || ''));
    const message = escapeHtml(String(payload.message || '')).replace(/\r?\n/g, '<br>');
    const subjectLine = String(payload.subject || '').replace(/[\r\n]+/g, ' ').slice(0, 120);
    subject = `New contact inquiry${subjectLine ? `: ${subjectLine}` : ''}`;
    html = `<p>From: ${senderName} &lt;${senderEmail}&gt;</p><p>Subject: ${inquirySubject}</p><p>${message}</p>`;
  } else if (job.template === 'order_confirmation') {
    const orderNumber = escapeHtml(String(payload.order_number || ''));
    const customerName = escapeHtml(String(payload.customer_name || 'Customer'));
    const total = escapeHtml(String(payload.total ?? ''));
    subject = `Order confirmation ${orderNumber}`;
    html = `<p>Hello ${customerName},</p><p>Your order <strong>${orderNumber}</strong> has been received.</p><p>Total: Rs. ${total}</p>`;
  } else if (job.template === 'admin_new_order') {
    const orderNumber = escapeHtml(String(payload.order_number || ''));
    const customerName = escapeHtml(String(payload.customer_name || 'Customer'));
    const customerEmail = escapeHtml(String(payload.customer_email || ''));
    const customerPhone = escapeHtml(String(payload.customer_phone || ''));
    const total = escapeHtml(String(payload.total ?? ''));
    subject = `New store order ${orderNumber}`;
    html = `<p>A new order was placed.</p><p>Order: <strong>${orderNumber}</strong></p><p>Customer: ${customerName}</p><p>Email: ${customerEmail}</p><p>Phone: ${customerPhone}</p><p>Total: Rs. ${total}</p>`;
  } else {
    throw new Error(`Unsupported email template: ${job.template || 'missing'}`);
  }
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': job.id,
    },
    body: JSON.stringify({ from, to: [job.recipient], subject, html }),
  });
  if (!result.ok) throw new Error(`Email provider returned HTTP ${result.status}`);
}

async function sendWhatsApp(job: OutboxJob): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    throw new Error('WhatsApp delivery disabled: WHATSAPP_TOKEN and WHATSAPP_PHONE_ID are required');
  }
  const payload = job.payload || {};
  const text = `Hello ${String(payload.customer_name || 'Customer')}, your order ${String(payload.order_number || '')} has been received. Total: Rs. ${String(payload.total ?? '')}.`;
  const result = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: job.recipient,
      type: 'text',
      text: { body: text },
    }),
  });
  if (!result.ok) throw new Error(`WhatsApp provider returned HTTP ${result.status}`);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character] || character));
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
