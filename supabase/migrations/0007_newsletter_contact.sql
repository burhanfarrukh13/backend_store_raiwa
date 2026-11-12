-- 0007_newsletter_contact.sql

-- ---------- Newsletter Subscribers ----------
create table newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null,
  name          text,
  source        text not null default 'website',
  subscribed_at timestamptz not null default now(),
  status        text not null default 'active' check (status in ('active','inactive')),
  deleted_at    timestamptz
);
create unique index newsletter_email_uq on newsletter_subscribers (email) where deleted_at is null;

-- ---------- Contact Inquiries ----------
create table contact_inquiries (
  id              uuid primary key default gen_random_uuid(),
  sender_name     text not null,
  sender_email    citext not null,
  subject         text not null default '',
  message         text not null,
  status          text not null default 'unread' check (status in ('unread','read')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index contact_inquiries_status_idx on contact_inquiries (status) where deleted_at is null;

-- ---------- Email Log ----------
create table email_log (
  id            uuid primary key default gen_random_uuid(),
  recipient     citext not null,
  subject       text not null,
  template     text,
  result         text not null default 'not_sent' check (result in ('sent','failed','not_sent')),
  sent_at       timestamptz,
  error_details text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index email_log_result_idx on email_log (result);

-- ---------- Accounting Setup Steps ----------
create table accounting_setup_steps (
  id              text primary key,
  label           text not null,
  completed       boolean not null default false,
  completed_at    timestamptz
);

-- ---------- Add-ons ----------
create table addons (
  id              text primary key,
  name            text not null,
  description     text,
  features        jsonb,
  monthly_price   numeric(12,2) not null default 0,
  yearly_price    numeric(12,2) not null default 0,
  trial_days      int not null default 0,
  status          text not null default 'inactive' check (status in ('active','inactive','trial')),
  trial_ends_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ---------- AI Connections ----------
create table ai_connections (
  id              uuid primary key default gen_random_uuid(),
  provider        text not null check (provider in ('openai','anthropic','gemini')),
  model           text not null,
  api_key_encrypted text,
  permission_level text not null default 'read' check (permission_level in ('read','propose','full')),
  connected_at    timestamptz,
  last_used_at    timestamptz,
  status          text not null default 'disconnected' check (status in ('connected','disconnected')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);