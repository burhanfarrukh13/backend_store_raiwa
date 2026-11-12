import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('../lib/supabase-client', () => ({
  setCorsHeaders: vi.fn(),
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import handler from '../api/cron/process-outbox';

const emailJob = {
  id: 'job-1',
  channel: 'email',
  recipient: 'customer@example.test',
  template: 'order_confirmation',
  payload: { order_number: 'BN-1', customer_name: 'Customer', total: 50 },
  attempts: 1,
};

function context() {
  return {
    req: {
      method: 'POST',
      header: (name: string) => name.toLowerCase() === 'authorization' ? 'Bearer test-cron-secret' : undefined,
    },
    res: { headers: {} },
    json: (body: unknown, status = 200) => new Response(JSON.stringify(body), { status }),
  };
}

describe('outbox delivery worker', () => {
  const previous = {
    cron: process.env.CRON_SHARED_SECRET,
    resend: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
  };

  beforeEach(() => {
    process.env.CRON_SHARED_SECRET = 'test-cron-secret';
    process.env.RESEND_API_KEY = '';
    process.env.EMAIL_FROM = '';
    mocks.rpc.mockReset();
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_outbox_jobs') return { data: [emailJob], error: null };
      return { data: null, error: null };
    });
    mocks.createSupabaseServerClient.mockReturnValue({ rpc: mocks.rpc });
  });

  afterEach(() => {
    if (previous.cron === undefined) delete process.env.CRON_SHARED_SECRET;
    else process.env.CRON_SHARED_SECRET = previous.cron;
    if (previous.resend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.resend;
    if (previous.from === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previous.from;
    vi.unstubAllGlobals();
  });

  it('marks a job failed/retryable when provider configuration is absent', async () => {
    const response = await handler(context() as any);
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('finish_outbox_job', expect.objectContaining({ p_success: false }));
  });

  it('marks email sent only after the Resend provider succeeds', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_FROM = 'Store <orders@example.test>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const response = await handler(context() as any);
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('finish_outbox_job', expect.objectContaining({ p_success: true }));
  });

  it('does not mark sent when the provider rejects the request', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_FROM = 'Store <orders@example.test>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await handler(context() as any);
    expect(mocks.rpc).toHaveBeenCalledWith('finish_outbox_job', expect.objectContaining({
      p_success: false,
      p_error: expect.stringContaining('503'),
    }));
  });

  it('sends contact inquiry data using its own escaped email template', async () => {
    const contactJob = {
      ...emailJob,
      template: 'contact_inquiry',
      payload: {
        sender_name: '<Customer>',
        sender_email: 'customer@example.test',
        subject: 'Help',
        message: '<script>alert(1)</script>',
      },
    };
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_outbox_jobs') return { data: [contactJob], error: null };
      return { data: null, error: null };
    });
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_FROM = 'Store <orders@example.test>';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await handler(context() as any);

    const sentEmail = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentEmail.subject).toBe('New contact inquiry: Help');
    expect(sentEmail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(mocks.rpc).toHaveBeenCalledWith('finish_outbox_job', expect.objectContaining({ p_success: true }));
  });

  it('sends the configured administrator a new-order alert', async () => {
    const adminJob = {
      ...emailJob,
      recipient: 'admin@example.test',
      template: 'admin_new_order',
      payload: {
        order_number: 'BN-1',
        customer_name: '<Customer>',
        customer_email: 'customer@example.test',
        customer_phone: '03001234567',
        total: 250,
      },
    };
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_outbox_jobs') return { data: [adminJob], error: null };
      return { data: null, error: null };
    });
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_FROM = 'Store <orders@example.test>';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await handler(context() as any);

    const sentEmail = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentEmail.to).toEqual(['admin@example.test']);
    expect(sentEmail.subject).toBe('New store order BN-1');
    expect(sentEmail.html).toContain('&lt;Customer&gt;');
    expect(mocks.rpc).toHaveBeenCalledWith('finish_outbox_job', expect.objectContaining({ p_success: true }));
  });
});
