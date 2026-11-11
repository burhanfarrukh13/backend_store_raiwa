-- 0001_foundations.sql
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists citext;

alter database postgres set timezone to 'Asia/Karachi';

-- Deny-by-default for functions created from now on; grant explicitly where needed.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

create type product_status      as enum ('active', 'draft', 'archived');
create type payment_status      as enum ('unpaid', 'paid', 'refunded', 'partially_refunded');
create type fulfillment_status  as enum ('unfulfilled', 'fulfilled', 'returned', 'cancelled');
create type payment_method      as enum ('cod', 'bank_transfer', 'card');
create type staff_role          as enum ('owner', 'manager', 'support', 'accountant');

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- "03xx xxxxxxx", "+2 3xx …", "0092…", "3xxxxxxxxx" → "+923xxxxxxxxx"; NULL if not a 10-digit PK number.
create or replace function normalize_pk_phone(p text)
returns text language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if d like '0092%' then d := substr(d, 5);
  elsif d like '92%' and length(d) = 12 then d := substr(d, 3);
  elsif d like '0%' and length(d) = 11 then d := substr(d, 2);
  end if;
  if length(d) <> 10 then return null; end if;
  return '+92' || d;
end $$;
grant execute on function normalize_pk_phone(text) to authenticated, service_role;