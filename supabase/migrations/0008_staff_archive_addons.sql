-- 0008_staff_archive_addons.sql

-- ---------- Staff Profiles (extended) ----------
-- This migration assumes staff_profiles from 0002 already exists.
-- Add any additional columns or modify as needed.

-- ---------- Archive (soft-delete tracking) ----------
-- The plan uses deleted_at on many tables for soft delete.
-- Archive screen recovers these.

-- ---------- Push Subscriptions ----------
create table push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  staff_id      uuid references staff_profiles(id) on delete cascade,
  endpoint      text not null,
  keys         jsonb not null,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create unique index staff_endpoint_uq on push_subscriptions (endpoint) where deleted_at is null;

-- ---------- Analytics Events ----------
create table analytics_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null,   -- e.g. 'page_view', 'add_to_cart', 'order_placed'
  user_id       uuid references staff_profiles(id),
  session_id    text,
  properties    jsonb default '{}',
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index analytics_events_type_idx on analytics_events (event_type);

-- ---------- Abandoned Carts ----------
create table abandoned_carts (
  id            uuid primary key default gen_random_uuid(),
  variant_id    uuid references product_variants(id),
  customer_email citext,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index abandoned_cart_variant_customer_uq on abandoned_carts (variant_id, customer_email) where variant_id is not null and customer_email is not null;

-- ---------- Expenses ----------
create table expenses (
  id              uuid primary key default gen_random_uuid(),
  description     text not null,
  amount          numeric(12,2) not null check (amount >= 0),
  category        text not null default 'general',
  payment_method  text not null default 'cash',
  paid            boolean not null default false,
  paid_at         timestamptz,
  paid_by         uuid references staff_profiles(id),
  recorded_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index expenses_paid_idx on expenses (paid) where deleted_at is null;

-- ---------- Marketing Spend ----------
create table marketing_spend (
  id              uuid primary key default gen_random_uuid(),
  channel         text not null,   -- e.g. 'meta', 'google', 'tiktok'
  amount          numeric(12,2) not null check (amount >= 0),
  campaign        text,
  started_at      timestamptz,
  ended_at        timestamptz,
  revenue_attributed numeric(12,2) not null default 0,
  roas            numeric(10,2) generated always as (case when amount > 0 then revenue_attributed / amount else null end) stored,
  recorded_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ---------- Courier Settlements ----------
create table courier_settlements (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references orders(id),
  collected_amount numeric(12,2) not null check (collected_amount >= 0),
  fees            numeric(12,2) not null default 0,
  net_amount      numeric(12,2) generated always as (collected_amount - fees) stored,
  settled_at      timestamptz,
  settled_by      uuid references staff_profiles(id),
  status          text not null default 'pending' check (status in ('pending','settled','disputed')),
  recorded_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ---------- Staff Role Matrix (explicit enum extension) ----------
-- The plan mentions adding a separate "Admin" tier later
alter type staff_role add value 'admin';

-- ---------- RLS policies for new tables ----------
alter table push_subscriptions enable row level security;
create policy own_push on push_subscriptions for all to authenticated
  using (staff_id = auth.uid()) with check (staff_id = auth.uid());

-- anon receives no SQL table, view, sequence, or function privileges (already done in 0003)
-- (re-stated here for completeness)
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;