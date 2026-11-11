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
  constraint uq_email_product unique (email, product_id) where product_id is not null,
  constraint uq_phone_product unique (phone, product_id) where product_id is not null
);
create index waitlist_product_idx on waitlist_subscribers (product_id) where deleted_at is null;

-- ---------- Blog Articles ----------
create table blog_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
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
create unique index blog_slug_uq on slug where deleted_at is null;

-- ---------- Custom Pages (CMS) ----------
create table cms_pages (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  content         text not null default '',
  status          text not null default 'draft' check (status in ('draft','published')),
  published_at    timestamptz,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create unique index cms_slug_uq on slug where deleted_at is null;

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
create index faqs_status_idx on status where deleted_at is null;

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
create unique index from_path_uq on from_path where deleted_at is null;