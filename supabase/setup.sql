-- =====================================================================
-- Baytak Noor store: COMPLETE database setup (one file, run once)
--
-- HOW TO USE
--   1. Create a NEW, EMPTY Supabase project (do not run this on a project that
--      already holds data - it creates tables and will fail if they exist).
--   2. Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   3. Then follow the "after the script" steps in DEPLOY.md.
--
-- Generated from supabase/migrations/0001_foundations.sql .. 0013_admin_order_status.sql
-- by supabase/build-setup.mjs. Edit the migrations, then rebuild; do not hand-edit.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0001_foundations.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 0002_catalog.sql
-- ---------------------------------------------------------------------
-- 0002_catalog.sql

-- ---------- Staff ----------
create table staff_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         citext not null,
  role          staff_role not null default 'support',
  status        text not null default 'active' check (status in ('active','invited','suspended')),

  preferences   jsonb not null default '{}',
  last_active_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create unique index staff_profiles_email_uq on staff_profiles (email) where deleted_at is null;

create or replace function current_staff_role()
returns staff_role language sql stable security definer set search_path = public as $$
  select role from staff_profiles
  where id = auth.uid() and status = 'active' and deleted_at is null
$$;

create or replace function has_role(roles staff_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(current_staff_role() = any(roles), false)
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select current_staff_role() is not null
$$;

grant execute on function current_staff_role(), has_role(staff_role[]), is_staff() to authenticated, service_role;

-- ---------- Store settings (singleton; NO secrets here) ----------
create table store_settings (
  id            int primary key default 1 check (id = 1),
  identity      jsonb not null default '{}',
  contact       jsonb not null default '{}',
  theme         jsonb not null default '{"primary":"#1a1a1a","accent":"#c4a484","radius":"2px","font":"Roboto"}',
  shipping      jsonb not null default '{"flatRate":250,"freeThreshold":10000,"codFee":100,"taxRate":0}',
  payments      jsonb not null default '{"cod":true,"bank":true,"card":false,"bankDetails":""}',
  couriers      jsonb not null default '{"default":"PostEx","account":""}',
  messaging     jsonb not null default '{"fromName":"","replyTo":"","copyOrders":true}',
  tracking      jsonb not null default '{}',
  social        jsonb not null default '{}',
  seo           jsonb not null default '{}',
  ai            jsonb not null default '{"privacy":false,"areas":{}}',
  notifications jsonb not null default '{"enabled":true,"lowStock":true,"dailySummary":true}',
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id)
);

-- Safe subset for the public storefront (no courier, no messaging, no bank details).
create or replace function get_storefront_settings()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'identity', identity,
    'contact', contact,
    'theme', theme,
    'shipping', shipping,
    'payments', payments - 'bankDetails',
    'tracking', tracking,
    'social', social,
    'seo', seo
  )
  from store_settings where id = 1
$$;
grant execute on function get_storefront_settings() to service_role;

-- ---------- Suppliers ----------
create table suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- Categories ----------
create table categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null,
  parent_id       uuid references categories(id) on delete set null,
  description     text,
  card_image_path text,
  banner_image_path text,
  image_alt       text,
  seo_title       text,
  seo_description text,
  status          text not null default 'active' check (status in ('active','draft')),
  sort_order      int  not null default 0,
  featured        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create unique index categories_slug_uq on categories (slug) where deleted_at is null;
create index categories_parent_idx on categories (parent_id);

-- ---------- Collections ----------
create table collections (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null,
  description     text,
  type            text not null default 'manual' check (type in ('manual','smart')),
  rule            jsonb not null default '{}',
  rule_label      text,
  card_image_path text,
  banner_image_path text,
  image_alt       text,
  seo_title       text,
  seo_description text,
  status          text not null default 'active' check (status in ('active','draft')),
  sort_order      int  not null default 0,
  featured        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create unique index collections_slug_uq on collections (slug) where deleted_at is null;

-- ---------- Products ----------
create table products (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null,
  sku              text not null,
  description      text not null default '',
  spec_size        text,
  spec_fabric      text,
  spec_included    text,
  price            numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2) not null default 0 check (compare_at_price >= 0),
  cost_price       numeric(12,2) not null default 0 check (cost_price >= 0),
  extra_expenses   numeric(12,2) not null default 0 check (extra_expenses >= 0),
  status           product_status not null default 'draft',
  brand            text,
  supplier_id      uuid references suppliers(id) on delete set null,
  supplier_code    text,
  featured         boolean not null default false,
  has_variants     boolean not null default false,
  seo_title        text,
  seo_description  text,
  search_vector    tsvector generated always as (
                     to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(brand,''))
                   ) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create unique index products_slug_uq on products (slug) where deleted_at is null;
create unique index products_sku_uq  on products (sku)  where deleted_at is null;
create index products_status_idx on products (status) where deleted_at is null;
create index products_search_idx on products using gin (search_vector);
create index products_name_trgm  on products using gin (name gin_trgm_ops);

create table product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size       text,
  color      text,
  sku        text not null,
  price      numeric(12,2) not null check (price >= 0),
  stock_qty  int not null default 0 check (stock_qty >= 0),
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index product_variants_sku_uq on product_variants (sku) where deleted_at is null;
create index product_variants_product_idx on product_variants (product_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- 0003_images_inventory.sql
-- ---------------------------------------------------------------------
-- 0003_images_inventory.sql

-- ---------- Product Images ----------
create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url        text not null,
  alt_text   text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index product_images_product_idx on product_images (product_id) where deleted_at is null;

-- ---------- Media Assets (general file uploads) ----------
create table media_assets (
  id              uuid primary key default gen_random_uuid(),
  file_name       text not null,
  original_name   text not null,
  bucket          text not null,       -- storage bucket name
  path            text not null,       -- object path in storage
  mime_type       text not null,
  alt_text        text,
  sort_order      int not null default 0,
  product_id      uuid references product_images(id) on delete set null,
  status          text not null default 'active' check (status in ('active','deleted')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index media_assets_product_idx on media_assets (product_id) where deleted_at is null;
create index media_assets_bucket_idx on media_assets (bucket) where deleted_at is null;

-- ---------- Inventory Movements (ledger) ----------
create table inventory_movements (
  id         uuid primary key default gen_random_uuid(),
  variant_id uuid references product_variants(id) on delete cascade,
  delta      int not null,        -- positive = in, negative = out
  reason     text not null,       -- e.g. 'sale', 'return', 'adjustment', 'restock'
  notes      text,
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on inventory_movements (variant_id);

-- ---------- Stock adjustment trigger: atomically rejects negative stock ----------
create or replace function adjust_stock_from_movement()
returns trigger language plpgsql as $$
begin
  update product_variants
  set stock_qty = stock_qty + new.delta,
      updated_at = now()
  where id = new.variant_id
    and stock_qty + new.delta >= 0;
  if not found then
    raise exception 'insufficient stock or variant not found' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger inventory_movement_trigger
after insert on inventory_movements
for each row
execute procedure adjust_stock_from_movement();

-- ---------- RLS policies ----------
-- Enable RLS on all relevant tables
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table categories enable row level security;
alter table collections enable row level security;
alter table suppliers enable row level security;
alter table store_settings enable row level security;
alter table staff_profiles enable row level security;
alter table inventory_movements enable row level security;

-- Staff can read catalog data; only owners/managers can change it.
create policy staff_read on products for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on products for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

create policy staff_read on product_variants for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on product_variants for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

create policy staff_read on product_images for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on product_images for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

create policy staff_read on categories for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on categories for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

create policy staff_read on collections for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on collections for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

create policy staff_read on suppliers for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on suppliers for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

create policy staff_settings_manage on store_settings for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

create policy staff_profiles_read on staff_profiles for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_profiles_manage on staff_profiles for all to authenticated
  using (public.has_role(array['owner']::staff_role[]))
  with check (public.has_role(array['owner']::staff_role[]));

create policy inventory_movements_read on inventory_movements for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy inventory_movements_insert on inventory_movements for insert to authenticated
  with check (public.has_role(array['owner','manager']::staff_role[]));

-- anon receives no SQL table, view, sequence, or function privileges.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;

-- ---------------------------------------------------------------------
-- 0004_orders_payments.sql
-- ---------------------------------------------------------------------
-- 0004_orders_payments.sql

-- ---------- Customers (derived from orders) ----------
create table customers (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             citext,
  phone             text,
  total_spent       numeric(12,2) not null default 0,
  total_orders      int not null default 0,
  last_order_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create unique index customers_email_uq on customers (email) where deleted_at is null;

-- ---------- Orders ----------
create table orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique,
  customer_id       uuid references customers(id) on delete set null,
  staff_id          uuid references staff_profiles(id) on delete set null,
  status            fulfillment_status not null default 'unfulfilled',
  payment_method    payment_method not null default 'cod',
  payment_status    payment_status not null default 'unpaid',
  subtotal          numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping          numeric(12,2) not null default 0 check (shipping >= 0),
  discount          numeric(12,2) not null default 0 check (discount >= 0),
  tax               numeric(12,2) not null default 0 check (tax >= 0),
  total             numeric(12,2) not null default 0 check (total >= 0),
  notes             text,
  courier_name      text,
  tracking_number   text,
  reference         text,
  fulfillment_status fulfillment_status not null default 'unfulfilled',
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_customer_idx on orders (customer_id) where deleted_at is null;
create index orders_staff_idx on orders (staff_id) where deleted_at is null;
create index orders_status_idx on orders (status) where deleted_at is null;

-- ---------- Order Items ----------
create table order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  variant_id    uuid references product_variants(id) on delete cascade,
  quantity      int not null check (quantity > 0),
  price         numeric(12,2) not null check (price >= 0), -- price at time of purchase
  total         numeric(12,2) not null check (total >= 0),   -- quantity * price
  sku           text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index order_items_order_idx on order_items (order_id);
create index order_items_variant_idx on order_items (variant_id);

-- ---------- Order Payments ----------
create table order_payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  amount        numeric(12,2) not null check (amount >= 0),
  method        payment_method not null,
  proof_url     text,           -- uploaded proof (bank transfer, card receipt)
  status        payment_status not null default 'unpaid',
  verified_at   timestamptz,
  verified_by   uuid references staff_profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index order_payments_order_idx on order_payments (order_id);

-- ---------- place_order() SECURITY DEFINER function ----------
-- Core checkout function. Validates pricing, stock, and coupons in a single transaction.
-- Called only from the API (service_role).
create or replace function place_order(
  p_order_number text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_payment_method payment_method,
  p_variant_ids uuid[],   -- variant IDs
  p_quantities int[],
  p_coupon_code text default null,
  p_notes text default null
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  raise exception 'Checkout schema is not fully migrated';
end $$;

grant execute on function place_order(text, text, text, text, payment_method, uuid[], int[], text, text) to service_role;

-- ---------- Order Events ----------
create table order_events (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  event_type    text not null,   -- e.g. 'status_change', 'payment_received', 'refund'
  description   text,
  metadata      jsonb default '{}',
  created_at    timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id);

-- ---------------------------------------------------------------------
-- 0005_coupons.sql
-- ---------------------------------------------------------------------
-- 0005_coupons.sql

-- ---------- Coupons ----------
create table coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null,  -- uniqueness among live coupons: code_uq below (lets a deleted code be reused)
  description     text,
  type            text not null check (type in ('percentage','fixed')),
  discount_value  numeric(12,2) not null check (discount_value >= 0),
  minimum_order   numeric(12,2) not null default 0 check (minimum_order >= 0),
  maximum_uses   int default null,
  used_count      int not null default 0,
  start_date      timestamptz,
  expiration_date timestamptz,
  status          text not null default 'active' check (status in ('active','inactive','expired')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create unique index code_uq on coupons (code) where deleted_at is null;

-- ---------- Coupon Redemptions ----------
create table coupon_redemptions (
  id            uuid primary key default gen_random_uuid(),
  coupon_id     uuid not null references coupons(id) on delete cascade,
  order_id      uuid not null references orders(id) on delete cascade,
  redeemed_at   timestamptz not null default now(),
  redeemed_by   uuid references staff_profiles(id),
  constraint uq_coupon_order unique (coupon_id, order_id)
);

-- ---------- Coupon validation function (called from place_order) ----------
create or replace function validate_coupon(
  p_code text,
  p_order_total numeric(12,2)
)
returns table (
  valid boolean,
  discount_amount numeric(12,2),
  error text
) language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return query
  select
    true,
    case when type = 'percentage' then greatest(least(p_order_total * discount_value / 100, 999999.99), 0)
         when type = 'fixed' then greatest(least(discount_value, p_order_total), 0)
    end as discount_amount,
    null as error
  from coupons
  where code = p_code
    and status = 'active'
    and (start_date is null or start_date <= now())
    and (expiration_date > now() or expiration_date is null)
    and (minimum_order is null or p_order_total >= minimum_order)
    and (maximum_uses is null or used_count < maximum_uses);

  -- A missing row means invalid or expired; callers treat an empty result as rejection.
end $$;

grant execute on function validate_coupon(text, numeric(12,2)) to service_role;

-- ---------------------------------------------------------------------
-- 0006_reviews_blog.sql
-- ---------------------------------------------------------------------
-- 0006_reviews_blog.sql

-- ---------- Reviews ----------
create table reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references products(id) on delete set null,
  customer_name text not null,
  customer_email citext,
  rating        int not null check (rating >= 1 and rating <= 5),
  title         text not null default '',
  body          text not null default '',
  photo_path    text,        -- signed URL or data URL
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index reviews_product_idx on reviews (product_id) where deleted_at is null;

-- ---------- Waitlist Subscribers ----------
create table waitlist_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null,
  phone         text,
  product_id    uuid references products(id) on delete set null,
  restock_date  timestamptz,
  subscribed_at timestamptz not null default now(),
  notified_flag boolean not null default false,
  deleted_at    timestamptz
);
create unique index waitlist_email_product_uq on waitlist_subscribers (email, product_id) where product_id is not null;
create unique index waitlist_phone_product_uq on waitlist_subscribers (phone, product_id) where product_id is not null and phone is not null;
create index waitlist_product_idx on waitlist_subscribers (product_id) where deleted_at is null;

-- ---------- Blog Articles ----------
create table blog_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null,
  excerpt         text not null default '',
  body            text not null default '',
  author          text,
  status          text not null default 'draft' check (status in ('draft','published')),
  published_at    timestamptz,
  view_count      int not null default 0,
  featured_image_url text,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create unique index blog_slug_uq on blog_posts (slug) where deleted_at is null;

-- ---------- Custom Pages (CMS) ----------
create table cms_pages (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null,
  content         text not null default '',
  status          text not null default 'draft' check (status in ('draft','published')),
  published_at    timestamptz,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create unique index cms_slug_uq on cms_pages (slug) where deleted_at is null;

-- ---------- FAQ Manager ----------
create table faqs (
  id              uuid primary key default gen_random_uuid(),
  question        text not null,
  answer          text not null,
  category        text,
  sort_order      int not null default 0,
  status          text not null default 'published' check (status in ('draft','published')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index faqs_status_idx on faqs (status) where deleted_at is null;

-- ---------- URL Redirects ----------
create table redirects (
  id              uuid primary key default gen_random_uuid(),
  from_path       text not null,
  to_path         text not null,
  type            text not null check (type in ('301','302')),
  hits            int not null default 0,
  status          text not null default 'active' check (status in ('active','disabled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create unique index from_path_uq on redirects (from_path) where deleted_at is null;

-- ---------------------------------------------------------------------
-- 0007_newsletter_contact.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 0008_staff_archive_addons.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 0009_storage.sql
-- ---------------------------------------------------------------------
-- 0009_storage.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media',          'media',          true,  5242880, array['image/jpeg','image/png','image/webp','image/avif']),
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('review-photos',  'review-photos',  false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- media: public read; uploads/deletes are authorized by the Vercel API
create policy media_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');

-- Private bucket reads/writes are performed by the Vercel API or signed URLs it issues.
-- Approved review photos are copied into "media" (or served via signed URLs) by the moderation action.
-- (No policies for payment-proofs or review-photos from anon; API-owned)

-- ---------------------------------------------------------------------
-- 0010_seed_and_cron.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 0011_atomic_checkout_outbox.sql
-- ---------------------------------------------------------------------
-- 0011_atomic_checkout_outbox.sql
-- Additive safety migration. The earlier migration files also contain corrections
-- for a fresh database; this migration makes the required runtime schema explicit
-- for environments that had already recorded versions 0001-0010.

create sequence if not exists order_number_seq start with 1054;

alter table orders add column if not exists idempotency_key text;
create unique index if not exists orders_idempotency_key_uq
  on orders (idempotency_key) where idempotency_key is not null;

alter table outbox add column if not exists available_at timestamptz not null default now();
alter table outbox add column if not exists claimed_at timestamptz;
alter table outbox add column if not exists sent_at timestamptz;
alter table outbox add column if not exists dedupe_key text;
alter table outbox drop constraint if exists outbox_status_check;
alter table outbox add constraint outbox_status_check
  check (status in ('pending','processing','sent','failed'));
create unique index if not exists outbox_dedupe_key_uq
  on outbox (dedupe_key) where dedupe_key is not null;
create index if not exists outbox_claim_idx
  on outbox (available_at, created_at) where status in ('pending','processing');

alter table inventory_movements enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_payments enable row level security;
alter table order_events enable row level security;
alter table coupon_redemptions enable row level security;
alter table coupons enable row level security;
alter table outbox enable row level security;
alter table media_assets enable row level security;

-- Replace the initial broad CRUD policy (if an environment applied an earlier
-- version of 0003) with the documented role matrix. These statements are also
-- idempotent on a clean database running the corrected migration history.
drop policy if exists staff_crud on products;
drop policy if exists staff_read on products;
drop policy if exists staff_manage on products;
create policy staff_read on products for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on products for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

drop policy if exists staff_crud on product_variants;
drop policy if exists staff_read on product_variants;
drop policy if exists staff_manage on product_variants;
create policy staff_read on product_variants for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on product_variants for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

drop policy if exists staff_crud on product_images;
drop policy if exists staff_read on product_images;
drop policy if exists staff_manage on product_images;
create policy staff_read on product_images for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on product_images for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

drop policy if exists staff_crud on categories;
drop policy if exists staff_read on categories;
drop policy if exists staff_manage on categories;
create policy staff_read on categories for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on categories for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

drop policy if exists staff_crud on collections;
drop policy if exists staff_read on collections;
drop policy if exists staff_manage on collections;
create policy staff_read on collections for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on collections for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

drop policy if exists staff_crud on suppliers;
drop policy if exists staff_read on suppliers;
drop policy if exists staff_manage on suppliers;
create policy staff_read on suppliers for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on suppliers for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

drop policy if exists staff_crud on staff_profiles;
drop policy if exists staff_profiles_read on staff_profiles;
drop policy if exists staff_profiles_manage on staff_profiles;
create policy staff_profiles_read on staff_profiles for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_profiles_manage on staff_profiles for all to authenticated
  using (public.has_role(array['owner']::staff_role[]))
  with check (public.has_role(array['owner']::staff_role[]));

drop policy if exists staff_read on media_assets;
drop policy if exists staff_manage on media_assets;
create policy staff_read on media_assets for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy staff_manage on media_assets for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));

drop policy if exists inventory_movements_read on inventory_movements;
drop policy if exists inventory_movements_insert on inventory_movements;
drop policy if exists staff_crud on inventory_movements;
create policy inventory_movements_read on inventory_movements for select to authenticated
  using (public.has_role(array['owner','manager','support','accountant']::staff_role[]));
create policy inventory_movements_insert on inventory_movements for insert to authenticated
  with check (public.has_role(array['owner','manager']::staff_role[]));

drop policy if exists staff_orders_read on orders;
create policy staff_orders_read on orders for select to authenticated
  using (public.is_staff());
drop policy if exists staff_customers_read on customers;
create policy staff_customers_read on customers for select to authenticated
  using (public.is_staff());
drop policy if exists staff_order_items_read on order_items;
create policy staff_order_items_read on order_items for select to authenticated
  using (public.is_staff());
drop policy if exists staff_order_payments_read on order_payments;
create policy staff_order_payments_read on order_payments for select to authenticated
  using (public.is_staff());
drop policy if exists staff_order_events_read on order_events;
create policy staff_order_events_read on order_events for select to authenticated
  using (public.is_staff());
drop policy if exists staff_coupons_manage on coupons;
create policy staff_coupons_manage on coupons for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));
drop policy if exists staff_coupons_read on coupons;
create policy staff_coupons_read on coupons for select to authenticated
  using (public.is_staff());
drop policy if exists staff_coupon_redemptions_read on coupon_redemptions;
create policy staff_coupon_redemptions_read on coupon_redemptions for select to authenticated
  using (public.is_staff());

revoke all on customers, orders, order_items, order_payments, order_events,
  coupon_redemptions, outbox from anon, authenticated;
grant select on staff_profiles to authenticated;
grant all on customers, orders, order_items, order_payments, order_events,
  inventory_movements, coupons, coupon_redemptions, outbox to service_role;
grant usage, select on sequence order_number_seq to service_role;

-- Public product projection exposes only published catalog fields.
create table if not exists product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);
create table if not exists collection_products (
  collection_id uuid not null references collections(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, product_id)
);
alter table product_categories enable row level security;
alter table collection_products enable row level security;
drop policy if exists staff_product_categories on product_categories;
drop policy if exists staff_product_categories_read on product_categories;
create policy staff_product_categories_read on product_categories for select to authenticated
  using (public.is_staff());
create policy staff_product_categories on product_categories for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));
drop policy if exists staff_collection_products on collection_products;
drop policy if exists staff_collection_products_read on collection_products;
create policy staff_collection_products_read on collection_products for select to authenticated
  using (public.is_staff());
create policy staff_collection_products on collection_products for all to authenticated
  using (public.has_role(array['owner','manager']::staff_role[]))
  with check (public.has_role(array['owner','manager']::staff_role[]));
grant all on product_categories, collection_products to service_role;

create table if not exists whatsapp_threads (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  customer_name text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text not null unique,
  thread_id uuid not null references whatsapp_threads(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  body text not null default '',
  delivery_status text not null default 'received',
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table whatsapp_threads enable row level security;
alter table whatsapp_messages enable row level security;
grant all on whatsapp_threads, whatsapp_messages to service_role;

create or replace view storefront_products as
select p.id, p.name, p.slug, p.description, p.price, p.compare_at_price,
       p.featured, p.seo_title, p.seo_description,
       coalesce((
         select jsonb_agg(c.slug order by c.sort_order)
         from product_categories pc
         join categories c on c.id = pc.category_id
         where pc.product_id = p.id and c.status = 'active' and c.deleted_at is null
       ), '[]'::jsonb) as category_slugs,
       coalesce((
         select jsonb_agg(jsonb_build_object(
           'id', v.id, 'size', v.size, 'color', v.color, 'sku', v.sku,
           'price', v.price, 'stock_qty', v.stock_qty, 'position', v.position
         ) order by v.position)
         from product_variants v
         where v.product_id = p.id and v.deleted_at is null
       ), '[]'::jsonb) as product_variants,
       coalesce((
         select jsonb_agg(jsonb_build_object('url', i.url, 'alt_text', i.alt_text)
                          order by i.sort_order)
         from product_images i
         where i.product_id = p.id and i.deleted_at is null
       ), '[]'::jsonb) as product_images
from products p
where p.status = 'active' and p.deleted_at is null;

grant select on storefront_products to anon, authenticated, service_role;

create or replace function track_order_public(p_order_number text, p_phone text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.fulfillment_status,
    'payment_status', o.payment_status,
    'total', o.total,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('sku', oi.sku, 'quantity', oi.quantity, 'total', oi.total))
      from order_items oi where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from orders o
  join customers c on c.id = o.customer_id
  where upper(o.order_number) = upper(trim(p_order_number))
    and public.normalize_pk_phone(c.phone) = public.normalize_pk_phone(p_phone)
    and o.deleted_at is null
$$;
revoke all on function track_order_public(text,text) from public;
grant execute on function track_order_public(text,text) to anon, authenticated, service_role;

create or replace view inventory_overview as
select p.id as product_id, p.name as product_name, p.status as product_status,
       v.id as variant_id, v.sku, v.size, v.color, v.stock_qty,
       case when v.stock_qty = 0 then 'out_of_stock'
            when v.stock_qty <= 5 then 'low_stock'
            else 'in_stock' end as stock_status
from products p
join product_variants v on v.product_id = p.id
where p.deleted_at is null and v.deleted_at is null;
grant select on inventory_overview to service_role;

drop function if exists place_order(text, text, text, text, payment_method, uuid[], int[], text, text);

create or replace function place_order(
  p_order_number text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_payment_method payment_method,
  p_variant_ids uuid[],
  p_quantities int[],
  p_coupon_code text default null,
  p_notes text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing orders%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_shipping numeric(12,2) := 0;
  v_shipping_rate numeric(12,2) := 250;
  v_free_threshold numeric(12,2) := 10000;
  v_cod_fee numeric(12,2) := 100;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2);
  v_coupon coupons%rowtype;
  v_variant record;
  v_line record;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 128 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;
  if p_customer_name is null or length(trim(p_customer_name)) not between 1 and 160
     or p_customer_email is null or length(trim(p_customer_email)) > 320
     or p_customer_phone is null or length(trim(p_customer_phone)) not between 7 and 32 then
    raise exception 'invalid_customer_details' using errcode = '22023';
  end if;
  if p_payment_method not in ('cod', 'bank_transfer', 'card') then
    raise exception 'invalid_payment_method' using errcode = '22023';
  end if;
  if p_variant_ids is null or p_quantities is null
     or cardinality(p_variant_ids) < 1 or cardinality(p_variant_ids) > 50
     or cardinality(p_variant_ids) <> cardinality(p_quantities)
     or array_position(p_variant_ids, null) is not null
     or array_position(p_quantities, null) is not null
     or exists (select 1 from unnest(p_quantities) q where q < 1 or q > 100) then
    raise exception 'invalid_order_lines' using errcode = '22023';
  end if;

  select * into v_existing from orders where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'order_id', v_existing.id, 'order_number', v_existing.order_number,
      'total', v_existing.total, 'status', v_existing.status, 'duplicate', true
    );
  end if;

  -- Lock variants in stable UUID order before calculating prices and stock.
  for v_line in
    select u.variant_id, sum(u.quantity)::integer as quantity
    from unnest(p_variant_ids, p_quantities) as u(variant_id, quantity)
    group by u.variant_id
    order by u.variant_id
  loop
    select v.id, v.price, v.stock_qty, v.sku
      into v_variant
      from product_variants v
      join products p on p.id = v.product_id
     where v.id = v_line.variant_id
       and v.deleted_at is null
       and p.deleted_at is null
       and p.status = 'active'
     for update of v;
    if not found then
      raise exception 'product_unavailable' using errcode = 'P0001';
    end if;
    if v_variant.stock_qty < v_line.quantity then
      raise exception 'insufficient_stock' using errcode = 'P0001';
    end if;
    v_subtotal := v_subtotal + v_variant.price * v_line.quantity;
  end loop;

  select coalesce(nullif(shipping->>'flatRate','')::numeric, 250),
         coalesce(nullif(shipping->>'freeThreshold','')::numeric, 10000),
         coalesce(nullif(shipping->>'codFee','')::numeric, 100)
    into v_shipping_rate, v_free_threshold, v_cod_fee
    from store_settings where id = 1;
  v_shipping := case when v_subtotal >= v_free_threshold then 0 else v_shipping_rate end;
  if p_payment_method = 'cod' then v_shipping := v_shipping + v_cod_fee; end if;

  if nullif(trim(p_coupon_code), '') is not null then
    select * into v_coupon
      from coupons
     where upper(code::text) = upper(trim(p_coupon_code))
       and status = 'active'
       and deleted_at is null
       and (start_date is null or start_date <= now())
       and (expiration_date is null or expiration_date > now())
       and (maximum_uses is null or used_count < maximum_uses)
       and v_subtotal >= minimum_order
     for update;
    if not found then raise exception 'invalid_coupon' using errcode = 'P0001'; end if;
    v_discount := case when v_coupon.type = 'percentage'
      then least(v_subtotal, round(v_subtotal * v_coupon.discount_value / 100, 2))
      else least(v_coupon.discount_value, v_subtotal) end;
  end if;
  v_total := greatest(v_subtotal + v_shipping - v_discount, 0);

  insert into customers (name, email, phone)
  values (trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone))
  on conflict (email) where deleted_at is null
  do update set name = excluded.name, phone = excluded.phone, updated_at = now()
  returning id into v_customer_id;

  v_order_number := 'BN-' || to_char(now(), 'YYMMDD') || '-' ||
                    lpad(nextval('order_number_seq')::text, 6, '0');
  insert into orders (
    order_number, idempotency_key, customer_id, payment_method, payment_status,
    subtotal, shipping, discount, tax, total, notes
  ) values (
    v_order_number, p_idempotency_key, v_customer_id, p_payment_method, 'unpaid',
    v_subtotal, v_shipping, v_discount, 0, v_total, nullif(trim(p_notes), '')
  ) returning id into v_order_id;

  for v_line in
    select u.variant_id, sum(u.quantity)::integer as quantity
    from unnest(p_variant_ids, p_quantities) as u(variant_id, quantity)
    group by u.variant_id
    order by u.variant_id
  loop
    select v.price, v.sku into v_variant
      from product_variants v where v.id = v_line.variant_id;
    insert into order_items (order_id, variant_id, quantity, price, total, sku)
    values (v_order_id, v_line.variant_id, v_line.quantity, v_variant.price,
            v_variant.price * v_line.quantity, v_variant.sku);
    insert into inventory_movements (variant_id, delta, reason, notes)
    values (v_line.variant_id, -v_line.quantity, 'sale', 'Order ' || v_order_number);
  end loop;

  if nullif(trim(p_coupon_code), '') is not null then
    update coupons set used_count = used_count + 1, updated_at = now()
     where id = v_coupon.id;
    insert into coupon_redemptions (coupon_id, order_id)
    values (v_coupon.id, v_order_id);
  end if;

  insert into order_events (order_id, event_type, description, metadata)
  values (v_order_id, 'order_placed', 'Order placed through storefront',
          jsonb_build_object('idempotency_key', p_idempotency_key));

  insert into outbox (channel, recipient, template, payload, dedupe_key)
  values ('email', lower(trim(p_customer_email)), 'order_confirmation',
          jsonb_build_object('order_number', v_order_number,
                             'customer_name', trim(p_customer_name),
                             'total', v_total),
          p_idempotency_key || ':email')
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  if public.normalize_pk_phone(p_customer_phone) is not null then
    insert into outbox (channel, recipient, template, payload, dedupe_key)
    values ('whatsapp', public.normalize_pk_phone(p_customer_phone), 'order_confirmation',
            jsonb_build_object('order_number', v_order_number,
                               'customer_name', trim(p_customer_name),
                               'total', v_total),
            p_idempotency_key || ':whatsapp')
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_order_number,
    'total', v_total, 'status', 'unfulfilled', 'duplicate', false
  );
exception
  when unique_violation then
    select * into v_existing from orders where idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object(
        'order_id', v_existing.id, 'order_number', v_existing.order_number,
        'total', v_existing.total, 'status', v_existing.status, 'duplicate', true
      );
    end if;
    raise;
end;
$$;

revoke all on function place_order(text,text,text,text,payment_method,uuid[],int[],text,text,text)
  from public, anon, authenticated;
grant execute on function place_order(text,text,text,text,payment_method,uuid[],int[],text,text,text)
  to service_role;

create or replace function claim_outbox_jobs(p_limit integer default 10)
returns setof outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_limit < 1 or p_limit > 50 then
    raise exception 'invalid_batch_size' using errcode = '22023';
  end if;

  update outbox
     set status = 'failed',
         error_details = coalesce(error_details, 'Delivery lease expired after maximum attempts'),
         processed_at = now()
   where status = 'processing'
     and claimed_at < now() - interval '10 minutes'
     and attempts >= max_attempts;

  return query
  with claimed as (
    select id
      from outbox
     where attempts < max_attempts
       and ((status = 'pending' and available_at <= now())
         or (status = 'processing' and claimed_at < now() - interval '10 minutes'))
     order by available_at, created_at
     for update skip locked
     limit p_limit
  )
  update outbox o
     set status = 'processing', attempts = o.attempts + 1, claimed_at = now()
    from claimed
   where o.id = claimed.id
  returning o.*;
end;
$$;

create or replace function finish_outbox_job(p_id uuid, p_success boolean, p_error text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_success then
    update outbox
       set status = 'sent', sent_at = now(), processed_at = now(),
           claimed_at = null, error_details = null
     where id = p_id and status = 'processing';
  else
    update outbox
       set status = case when attempts >= max_attempts then 'failed' else 'pending' end,
           available_at = now() + make_interval(mins => least(60, power(2, least(attempts, 6))::integer)),
           processed_at = case when attempts >= max_attempts then now() else null end,
           claimed_at = null,
           error_details = left(coalesce(p_error, 'Provider delivery failed'), 2000)
     where id = p_id and status = 'processing';
  end if;
end;
$$;

revoke all on function claim_outbox_jobs(integer), finish_outbox_job(uuid,boolean,text)
  from public, anon, authenticated;
grant execute on function claim_outbox_jobs(integer), finish_outbox_job(uuid,boolean,text)
  to service_role;

-- Customers, orders, inventory and outbox remain server-owned; no browser role gets
-- direct write access. Public reads are limited to storefront_products and the
-- phone-verified tracking function above.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on staff_profiles to authenticated;
grant select on storefront_products to anon, authenticated, service_role;
grant select on inventory_overview to service_role;
grant all on customers, orders, order_items, order_payments, order_events,
  inventory_movements, coupons, coupon_redemptions, outbox,
  product_categories, collection_products, whatsapp_threads, whatsapp_messages
  to service_role;
grant usage, select on sequence order_number_seq to service_role;
grant execute on function track_order_public(text,text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 0012_admin_order_notifications.sql
-- ---------------------------------------------------------------------
-- Send an order alert to the configured store administrator through the outbox.
-- Configure notifications.adminEmail in store_settings before enabling checkout.
update store_settings
set notifications = jsonb_set(
  coalesce(notifications, '{}'::jsonb),
  '{adminEmail}',
  to_jsonb(coalesce(notifications->>'adminEmail', '')),
  true
)
where id = 1;

create or replace function enqueue_admin_order_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recipient text;
  v_customer customers%rowtype;
begin
  select nullif(trim(notifications->>'adminEmail'), '')
    into v_recipient
    from store_settings
   where id = 1;

  if v_recipient is null then
    return new;
  end if;

  select * into v_customer from customers where id = new.customer_id;
  if not found then return new; end if;

  insert into outbox (channel, recipient, template, payload, dedupe_key)
  values (
    'email',
    v_recipient,
    'admin_new_order',
    jsonb_build_object(
      'order_number', new.order_number,
      'customer_name', v_customer.name,
      'customer_email', v_customer.email,
      'customer_phone', v_customer.phone,
      'total', new.total
    ),
    'order:' || new.id::text || ':admin'
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return new;
end;
$$;

drop trigger if exists orders_admin_notification on orders;
create trigger orders_admin_notification
after insert on orders
for each row
execute function enqueue_admin_order_notification();

-- ---------------------------------------------------------------------
-- 0013_admin_order_status.sql
-- ---------------------------------------------------------------------
-- 0013_admin_order_status.sql
-- Atomic admin order transitions. Stock is returned through the inventory ledger in
-- the same transaction as the status change, so a failed restock rolls back the status.
-- Called only by the backend with the service role (never by browsers).

create or replace function admin_set_order_status(p_order_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order   orders%rowtype;
  v_item    record;
  v_status  fulfillment_status;
  v_payment payment_status;
  v_restock boolean := false;
begin
  if p_action is null or p_action not in ('fulfill', 'cancel', 'return', 'refund') then
    raise exception 'invalid_action';
  end if;

  select * into v_order
    from orders
   where id = p_order_id and deleted_at is null
     for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  v_status  := v_order.status;
  v_payment := v_order.payment_status;

  if p_action = 'fulfill' then
    if v_order.status <> 'unfulfilled' then raise exception 'invalid_transition'; end if;
    v_status := 'fulfilled';

  elsif p_action = 'cancel' then
    if v_order.status <> 'unfulfilled' then raise exception 'invalid_transition'; end if;
    v_status  := 'cancelled';
    v_restock := true;

  elsif p_action = 'return' then
    if v_order.status <> 'fulfilled' then raise exception 'invalid_transition'; end if;
    v_status  := 'returned';
    v_restock := true;

  else -- refund: payment only, stock is handled by cancel/return
    if v_order.payment_status not in ('paid', 'partially_refunded') then
      raise exception 'nothing_to_refund';
    end if;
    v_payment := 'refunded';
  end if;

  if v_restock then
    for v_item in
      select variant_id, quantity
        from order_items
       where order_id = v_order.id and variant_id is not null
    loop
      insert into inventory_movements (variant_id, delta, reason, notes)
      values (v_item.variant_id, v_item.quantity, 'return',
              p_action || ' of order ' || v_order.order_number);
    end loop;
  end if;

  -- orders.status and orders.fulfillment_status are kept identical: the public
  -- tracking endpoint reads fulfillment_status, the admin reads status.
  update orders
     set status = v_status,
         fulfillment_status = v_status,
         payment_status = v_payment,
         updated_at = now()
   where id = v_order.id;

  return jsonb_build_object(
    'order_id', v_order.id,
    'status', v_status,
    'payment_status', v_payment,
    'restocked', v_restock
  );
end;
$$;

revoke all on function admin_set_order_status(uuid, text) from public, anon, authenticated;
grant execute on function admin_set_order_status(uuid, text) to service_role;
