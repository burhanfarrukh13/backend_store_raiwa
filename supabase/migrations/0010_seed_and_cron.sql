-- 0010_seed_and_cron.sql

-- ---------- Outbox (for email/WhatsApp notifications) ----------
create table outbox (
  id            uuid primary key default gen_random_uuid(),
  channel       text not null,       -- 'email' or 'whatsapp'
  recipient     citext not null,     -- email address or phone number
  template      text,                -- optional template name
  payload       jsonb default '{}',  -- additional data for sending
  status        text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts      int not null default 0,
  max_attempts  int not null default 3,
  error_details text,
  created_at    timestamptz not null default now(),
  processed_at  timestamptz,
  constraint outbox_chk_attempts check (attempts >= 0 and max_attempts > 0)
);

-- ---------- Channels (configuration for notification channels) ----------
create table channels (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  type          text not null check (type in ('email','whatsapp','sms','push')),
  config        jsonb default '{}',  -- channel-specific configuration (API keys, endpoints)
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- Seed: outbox cleanup ----------

-- ---------- Seed: store_settings ----------
insert into store_settings (id, identity, contact, seo) values (
  1,
  '{"storeName":"Baytak Noor","tagline":"Luxury bed linen, woven for everyday rest."}',
  '{"email":"","phone":"","whatsapp":"","address":""}',
  '{"title":"Baytak Noor -- Luxury Bed Linen"}'
) on conflict (id) do nothing;

-- ---------- Seed: accounting_setup_steps ----------
insert into accounting_setup_steps (id, label) values
  ('s1','Set the store currency and country'),
  ('s2','Add courier accounts'),
  ('s3','Add cost prices for every product'),
  ('s4','Record monthly running costs'),
  ('s5','Connect ad accounts'),
  ('s6','Invite your accountant')
on conflict do nothing;

-- ---------- Seed: addons ----------
insert into addons (id, name, description, features, monthly_price, yearly_price, trial_days) values
  ('accounting','Accounting & Ledger','True profit after product costs, delivery, ads and running costs.',
   '["Profit & loss","Expenses & bills","Courier COD tracking","Tax reports"]'::jsonb, 2499, 24990, 14),
  ('abandoned_cart','Abandoned Cart Recovery','Recover checkout drop-offs with timed WhatsApp and email reminders.',
   '["Recovery emails","WhatsApp reminders","Recovered revenue report"]'::jsonb, 1499, 14990, 14),
  ('loyalty','Loyalty & Rewards','Points, referrals and early access for returning customers.',
   '["Points ledger","Referral codes","VIP tiers"]'::jsonb, 1999, 19990, 14),
  ('advanced_reports','Advanced Reports','Cohorts, channel attribution, product profitability and exports.',
   '["Cohort analysis","Product margins","Scheduled exports"]'::jsonb, 999, 9990, 0)
on conflict do nothing;

-- ---------- Cron (pg_cron runs in UTC; PKT = UTC+5) ----------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Housekeeping: outbox cleanup (weekly Sunday 22:00 UTC = Monday 03:00 PKT)
select cron.schedule('outbox-cleanup', '0 22 * * 0', $$
  delete from outbox where status = 'sent' and processed_at < now() - interval '30 days'
$$);

-- Analytics trim (weekly Sunday 22:30 UTC = Monday 03:30 PKT)
select cron.schedule('analytics-trim', '30 22 * * 0', $$
  delete from analytics_events where created_at < now() - interval '180 days'
$$);

-- Wake the outbox worker every minute.
-- Store the Vercel route URL + CRON_SHARED_SECRET in Vault before scheduling.
select cron.schedule('process-outbox', '* * * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'outbox_fn_url'),
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
               (select decrypted_secret from vault.decrypted_secrets where name = 'cron_shared_secret'))
  );
$$);