-- Minimal stand-ins for the Supabase-managed pieces, so the schema can be verified on
-- a plain local Postgres (no Docker, no Supabase CLI). NEVER run this on Supabase.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon')          then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role')  then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id), name text
);
alter table storage.objects enable row level security;

create schema if not exists vault;
create or replace view vault.decrypted_secrets as
  select null::text as name, null::text as decrypted_secret where false;
create or replace function vault.create_secret(secret text, name text default null, description text default '')
  returns uuid language sql as $$ select gen_random_uuid() $$;

create schema if not exists cron;
create or replace function cron.schedule(job text, schedule text, command text)
  returns bigint language sql as $$ select 1::bigint $$;

create schema if not exists net;
create or replace function net.http_post(url text, headers jsonb default '{}'::jsonb)
  returns bigint language sql as $$ select 1::bigint $$;

grant usage on schema auth, storage to anon, authenticated, service_role;
