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