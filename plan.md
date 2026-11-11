# Baytak Noor — Backend Roadmap & Database Plan

> Target: **Supabase** (Postgres, Auth, Storage, Edge Functions, Cron) + **Vercel** (temporary storefront + static admin).
> Status of this folder today: `site_admin/` is a complete **frontend-only admin replica** (28 screens, `localStorage`, fictional data). There is no backend, auth, storefront or integrations yet.
> The storefront in this plan is **temporary** — it exists only so backend work can be exercised end to end. The real storefront will replace it later and must only depend on the data contract in section 10.

---

## 1. Goals and non-goals

**Goals**
1. A real database + API behind every admin screen in `site_admin/` (28 tabs, see section 5).
2. A safe public checkout that cannot be tricked (server-side pricing, stock locking, coupon rules).
3. Real integrations in this order: transactional email, WhatsApp Cloud API, courier tracking (PostEx first, then TCS / Leopards).
4. Admin hosted on Vercel, data/auth on Supabase, deployable from Git with migrations.
5. Temporary storefront on Vercel for parallel development; easily thrown away.

**Non-goals for now**
- Final storefront design (you will replace it).
- Multi-store / multi-currency (PKR only, single store).
- Online card payments (design leaves a slot; COD + bank transfer first).

---

## 2. Architecture decisions

| Area | Decision | Why |
| --- | --- | --- |
| Database | Supabase Postgres, SQL migrations in Git | Real relations, RLS, transactions for stock/orders |
| Admin data access | `supabase-js` (PostgREST) directly from admin, guarded by **RLS + role checks** | No custom API server to maintain |
| Public reads | **Views** (`storefront_*`) granted to `anon`; base tables are *not* readable by `anon` | Row-level security cannot hide columns; `cost_price`/supplier data must never leak |
| Public writes | Vercel route handlers (service role) → `SECURITY DEFINER` SQL functions | Lets us add Turnstile + rate limiting before touching the DB; `anon` has zero write surface |
| Checkout | One SQL function `place_order(...)` in a single transaction | Price/coupon/stock are decided in the DB, never trusted from the browser |
| Stock | `product_variants.stock_qty` changed **only** through the `inventory_movements` ledger (trigger) | Full audit trail, no oversell (`CHECK stock_qty >= 0`) |
| Deletes | Soft delete (`deleted_at`) → powers the Archive screen | Restore/purge map 1:1 to the UI |
| Async work | `outbox` table + Edge Function worker (email, WhatsApp, push) | Checkout never waits for third-party APIs; retries are free |
| Files | Supabase Storage buckets (`media`, `payment-proofs`, `review-photos`) | Replaces base64 data URLs in `localStorage` |
| Secrets | Edge Function secrets / Supabase Vault — **never** in `store_settings` | Courier keys and WhatsApp tokens are currently plain settings fields in the demo |
| Time zone | Database timezone `Asia/Karachi`, timestamps stored as `timestamptz` | Date-range analytics line up with Pakistan days |
| Money | `numeric(12,2)`, PKR | Percent discounts can produce fractions |

---

## 3. Repository layout and environments

```
backend_store_raiwa/
├── site_admin/                  (existing) static admin → later wired to Supabase
├── storefront_temp/             Next.js app — TEMPORARY, deleted later
├── supabase/
│   ├── config.toml
│   ├── migrations/              0001_… → 0010_… (SQL from section 6)
│   ├── seed.sql                 settings row, add-ons catalogue, setup steps
│   └── functions/
│       ├── process-outbox/      email (Resend) + WhatsApp + push sender
│       ├── whatsapp-webhook/    inbound messages + delivery receipts
│       ├── postex-sync/         courier status polling (cron)
│       ├── invite-staff/        auth.admin.inviteUserByEmail + staff_profiles row
│       └── save-secret/         writes API keys to Vault, never returns them
├── scripts/
│   └── seed-from-demo.mjs       loads site_admin/assets/data.js into Supabase (dev only)
└── plan.md
```

**Environments**
- `dev`: a separate Supabase project (or local `supabase start` if Docker is available) + Vercel Preview deployments.
- `prod`: its own Supabase project + Vercel Production. Never run experiments in prod.
- Workflow: write migration → `supabase db push` to dev → test → merge → push to prod. Generate types with `supabase gen types typescript`.

---

## 4. Roadmap

Time estimates assume one developer working with AI assistance; treat them as ordering guides, not promises.

### Phase 0 — Foundations (1–2 days)
- [ ] Create Supabase projects (dev, prod). Pick the region closest to Pakistan available to you.
- [ ] `supabase init`, link projects, commit `config.toml`.
- [ ] Create Vercel projects: `baytak-admin` (root `site_admin`), `baytak-storefront-temp` (root `storefront_temp`).
- [ ] Domain plan: `admin.<domain>`, `<domain>` (storefront), Supabase default URL for API.
- [ ] Resend (email) account + domain DNS (SPF/DKIM). Meta WhatsApp Business account started early — verification takes time.

### Phase 1 — Schema, RLS, seed (2–3 days)
- [ ] Apply migrations 0001–0010 (section 6).
- [ ] Bootstrap the first owner (section 12, step 5).
- [ ] Run `seed-from-demo.mjs` on **dev** to load the fictional data.
- [ ] RLS tests with `supabase test db` (section 13).
- **Exit criteria:** staff of each role sees/edits only what the matrix allows; `anon` can read only `storefront_*` views.

### Phase 2 — Catalog backend + admin wiring (3–4 days)
- [ ] Auth login screen for admin; session handling; sign-out.
- [ ] Replace `store.js` with a Supabase-backed adapter (section 11).
- [ ] Products (+ variants, images, categories, collections), Inventory, Suppliers, Categories, Collections, Media Library on real tables and Storage.
- [ ] Smart collections refresh function + cron.
- **Exit criteria:** create a product with 3 variants and 4 images in admin; it shows in `storefront_products`.

### Phase 3 — Temporary storefront + checkout (3–4 days)
- [ ] `storefront_temp` pages: home, collection, product, cart, checkout, order confirmation, order tracking (section 10).
- [ ] `/api/checkout` → `place_order()` with Turnstile, idempotency key, error mapping.
- [ ] Concurrency test: 20 parallel orders for 5 units of stock → exactly 5 succeed.
- **Exit criteria:** place a COD order from the storefront, see it in admin Orders with correct totals and decremented stock.

### Phase 4 — Orders, customers, fulfilment (3 days)
- [ ] Orders list/detail, bulk "Mark fulfilled", notes, refunds (status + stock return), invoices (PDF Edge Function or print view).
- [ ] Customers derived from orders (`customer_stats`), repeat-customer flag.
- [ ] Order timeline (`order_events`), bank-transfer proof upload + approve flow.
- [ ] Realtime: new order toast in admin.

### Phase 5 — Messaging: outbox, email, WhatsApp (3–4 days)
- [ ] `process-outbox` worker; templates: order confirmation, shipping update, back-in-stock, contact reply.
- [ ] Email Log screen fed by the worker (sent / failed / not set up), Resend action re-queues.
- [ ] WhatsApp Cloud API: send order confirmation, inbound webhook, thread view, quick replies, "needs reply" flag, "Confirm order".
- [ ] Inbound Contact replies write to `email_log`.

### Phase 6 — Couriers (2–3 days)
- [ ] PostEx: create booking from an order, store tracking, poll status (`postex-sync`). Verify against PostEx's current merchant API documentation before coding; do not guess endpoints.
- [ ] TCS and Leopards behind the same `courier` adapter interface.
- [ ] Courier settlements table (COD collected vs. fees) feeding Accounting.

### Phase 7 — Content & marketing (2 days)
- [ ] Blog, Custom Pages, FAQs, Redirects (storefront middleware reads redirects and increments hits), Newsletter, Reviews moderation + photo reviews, Waitlist + back-in-stock notifications, Coupons.
- [ ] ISR revalidation webhook: Supabase → `/api/revalidate` on content change.

### Phase 8 — Analytics & Accounting (3 days)
- [ ] `analytics_events` tracking endpoint, abandoned cart capture.
- [ ] `analytics_summary`, `analytics_daily`, `accounting_pnl` functions → Analytics / Accounting screens.
- [ ] CSV exports kept client-side; report definitions documented.

### Phase 9 — Staff, security, settings (2 days)
- [ ] Staff invite flow (Edge Function), role matrix enforced by RLS, suspend/activate.
- [ ] Settings screen reading/writing `store_settings`; secrets through `save-secret`.
- [ ] Audit log screen (optional), session list via Supabase Auth, push subscriptions for the phone app.

### Phase 10 — Later / optional
- [ ] Add-ons billing, Loyalty & Rewards, Abandoned-cart recovery sending.
- [ ] AI Assistant connector (remote MCP server as an Edge Function with OAuth, permission levels from `ai_connections`).
- [ ] Online card payments / wallets (evaluate local gateways when you get there).
- [ ] Replace `storefront_temp` with the real storefront.

### Phase 11 — Launch checklist
- [ ] Upgrade plans where needed (section 12 notes), enable backups, uptime monitor.
- [ ] Remove demo data, rotate all keys, confirm RLS tests pass on prod, set `robots` noindex on admin.
- [ ] Dry-run: real order → email → WhatsApp → courier booking → fulfilled → analytics.

---

## 5. Admin screen → backend map

| Admin tab | Tables / functions | Notes |
| --- | --- | --- |
| Dashboard | — | Navigation hub only |
| Analytics | `analytics_summary()`, `analytics_daily()`, `customer_stats`, `analytics_events` | KPI + charts + CSV |
| Accounting | `accounting_pnl()`, `expenses`, `marketing_spend`, `courier_settlements`, `accounting_setup_steps`, `products.cost_price` | Add-on gated in UI |
| AI Assistant | `ai_connections`, `store_settings.ai` | MCP server is Phase 10 |
| Products | `products`, `product_variants`, `product_images`, `product_categories`, `collection_products` | Every product has ≥1 variant; single SKU = one default variant |
| Inventory | `product_variants`, `inventory_movements`, `adjust_stock()`, `inventory_overview` | Never write `stock_qty` directly |
| Suppliers | `suppliers` | WhatsApp composer uses phone |
| Categories | `categories` | Hierarchy via `parent_id` |
| Collections | `collections`, `collection_products`, `refresh_smart_collection()` | Smart rules are JSON |
| Media Library | `media_assets` + Storage `media` | Replaces data URLs |
| Orders | `orders`, `order_items`, `order_events`, `order_payments` | Created only by `place_order()` (or admin manual order later) |
| WhatsApp Messages | `whatsapp_threads`, `whatsapp_messages`, `outbox` | Webhook Edge Function |
| Email Log | `email_log` | Written by the worker |
| Coupons | `coupons`, `coupon_redemptions` | Validated inside `place_order()` |
| Reviews | `reviews` | Public submit RPC, admin moderation |
| Waitlist | `waitlist_subscribers`, `outbox` | Auto-notify when stock returns |
| Blog Articles | `blog_posts` | Soft delete |
| Custom Pages | `cms_pages` | Soft delete |
| FAQ Manager | `faqs` | `sort_order` |
| URL Redirects | `redirects` | Hits counter |
| Newsletter | `newsletter_subscribers` | CSV export |
| Inbound Contact | `contact_inquiries`, `email_log` | Reply = email + log |
| Store Settings | `store_settings`, Vault secrets | 10 tabs = 10 jsonb columns |
| Phone App & Alerts | `push_subscriptions`, `store_settings.notifications` | Web Push |
| Add-ons | `addons` | Feature flags + trial state |
| Staff & Roles | `staff_profiles`, `invite-staff` function | Role matrix = RLS |
| Archive | `archive_items` view, `restore_archived()`, `purge_archived()` | Soft-deleted rows |
| Admin Profile | `staff_profiles`, Supabase Auth | Password via Auth, not a table column |

---

## 6. Database SQL

Each block below is one migration file in `supabase/migrations/`. Run them in order. **Review before running on prod — this SQL has been written for you but not executed against a live Supabase project yet; run it on `dev` first.**

### 0001 — Extensions, types, helpers, default privileges

```sql
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

-- "03xx xxxxxxx", "+92 3xx …", "0092…", "3xxxxxxxxx" → "+923xxxxxxxxx"; NULL if not a 10-digit PK number.
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
grant execute on function normalize_pk_phone(text) to anon, authenticated, service_role;
```

### 0002 — Staff, settings, catalog

```sql
-- 0002_catalog.sql

-- ---------- Staff ----------
create table staff_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         citext not null,
  role          staff_role not null default 'support',
  status        text not null default 'active' check (status in ('active','invited','suspended')),
  preferences   jsonb not null default '{}',      -- notification toggles etc.
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
  identity      jsonb not null default '{}',   -- storeName, tagline, currency, country, logo path
  contact       jsonb not null default '{}',   -- email, phone, whatsapp, address
  theme         jsonb not null default '{"primary":"#1a1a1a","accent":"#c4a484","radius":"2px","font":"Roboto"}',
  shipping      jsonb not null default '{"flatRate":250,"freeThreshold":10000,"codFee":100,"taxRate":0}',
  payments      jsonb not null default '{"cod":true,"bank":true,"card":false,"bankDetails":""}',
  couriers      jsonb not null default '{"default":"PostEx","account":""}',   -- account label only; keys live in Vault
  messaging     jsonb not null default '{"fromName":"","replyTo":"","copyOrders":true}',
  tracking      jsonb not null default '{}',   -- ga4, gtm, meta pixel, tiktok
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
    'identity', identity, 'contact', contact, 'theme', theme,
    'shipping', shipping, 'payments', payments - 'bankDetails',
    'tracking', tracking, 'social', social, 'seo', seo)
  from store_settings where id = 1
$$;
grant execute on function get_storefront_settings() to anon, authenticated, service_role;

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
  rule            jsonb not null default '{}',     -- smart: {"field":"price","op":"lt","value":10000}
  rule_label      text,                            -- human text shown in admin
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
  spec_size        text,            -- PDP bullet: bedding size
  spec_fabric      text,            -- PDP bullet: fabric / quality
  spec_included    text,            -- PDP bullet: items included
  price            numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2) not null default 0 check (compare_at_price >= 0),
  cost_price       numeric(12,2) not null default 0 check (cost_price >= 0),     -- ADMIN ONLY
  extra_expenses   numeric(12,2) not null default 0 check (extra_expenses >= 0), -- shipping/packaging per unit, ADMIN ONLY
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
  stock_qty  int not null default 0 check (stock_qty >= 0),   -- changed ONLY via inventory_movements
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index product_variants_sku_uq on product_variants (sku) where deleted_at is null;
create index product_variants_product_idx on product_variants (product_id) where deleted_at is null;

create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  path       text not null,        -- Storage path inside bucket "media"
  alt        text,
  position   int not null default 0,   -- 0 = cover
  created_at timestamptz not null default now()
);
create index product_images_product_idx on product_images (product_id, position);

create table product_categories (
  product_id  uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table collection_products (
  collection_id uuid not null references collections(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  position      int not null default 0,
  primary key (collection_id, product_id)
);

create table media_assets (
  id         uuid primary key default gen_random_uuid(),
  path       text not null unique,       -- bucket "media"
  filename   text not null,
  alt        text,
  mime_type  text,
  size_bytes bigint,
  width      int,
  height     int,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

### 0003 — Customers, coupons, orders, inventory ledger

```sql
-- 0003_sales.sql

create table customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      citext,
  phone      text,                          -- normalized +92…
  city       text,
  address    text,
  accepts_marketing boolean not null default false,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_email_uq on customers (email) where email is not null;
create unique index customers_phone_uq on customers (phone) where phone is not null;

create table coupons (
  id             uuid primary key default gen_random_uuid(),
  code           citext not null,
  description    text,
  discount_type  text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  min_order      numeric(12,2) not null default 0,
  usage_limit    int check (usage_limit is null or usage_limit > 0),   -- NULL = unlimited (demo used 0)
  used_count     int not null default 0,
  starts_at      timestamptz,
  expires_at     timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  check (discount_type <> 'percent' or discount_value <= 100)
);
create unique index coupons_code_uq on coupons (code) where deleted_at is null;

create sequence order_number_seq start 1054;

create table orders (
  id                 uuid primary key default gen_random_uuid(),
  number             text not null unique,                 -- "BN-1054"
  idempotency_key    text,
  customer_id        uuid references customers(id) on delete set null,
  customer_name      text not null,
  customer_email     citext,
  customer_phone     text not null,
  shipping_city      text not null,
  shipping_address   text not null,
  subtotal           numeric(12,2) not null check (subtotal >= 0),
  shipping_fee       numeric(12,2) not null default 0 check (shipping_fee >= 0),
  cod_fee            numeric(12,2) not null default 0 check (cod_fee >= 0),
  tax                numeric(12,2) not null default 0 check (tax >= 0),
  discount           numeric(12,2) not null default 0 check (discount >= 0),
  total              numeric(12,2) not null check (total >= 0),
  coupon_id          uuid references coupons(id) on delete set null,
  coupon_code        text,
  payment_method     payment_method not null default 'cod',
  payment_status     payment_status not null default 'unpaid',
  fulfillment_status fulfillment_status not null default 'unfulfilled',
  courier            text,
  tracking_number    text,
  courier_status     text,
  channel            text not null default 'Direct / Organic',
  utm                jsonb not null default '{}',
  notes              text,                  -- customer-visible / delivery notes
  internal_notes     text,
  is_repeat_customer boolean not null default false,
  restocked          boolean not null default false,
  placed_at          timestamptz not null default now(),
  fulfilled_at       timestamptz,
  updated_at         timestamptz not null default now()
);
create unique index orders_idem_uq on orders (idempotency_key) where idempotency_key is not null;
create index orders_placed_idx   on orders (placed_at desc);
create index orders_status_idx   on orders (payment_status, fulfillment_status);
create index orders_customer_idx on orders (customer_id);
create index orders_tracking_idx on orders (tracking_number) where tracking_number is not null;
create index orders_phone_idx    on orders (customer_phone);

create table order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  variant_id    uuid references product_variants(id) on delete set null,
  name          text not null,              -- snapshot
  sku           text,
  variant_label text,
  quantity      int not null check (quantity > 0),
  unit_price    numeric(12,2) not null,
  unit_cost     numeric(12,2) not null default 0,   -- cost_price + extra_expenses at purchase time
  created_at    timestamptz not null default now()
);
create index order_items_order_idx on order_items (order_id);

create table order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references orders(id) on delete cascade,
  type       text not null,                 -- placed, payment_changed, fulfillment_changed, tracking_set, note, refund…
  data       jsonb not null default '{}',
  actor_id   uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id, created_at);

create table order_payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  method     payment_method not null,
  amount     numeric(12,2) not null check (amount >= 0),
  status     text not null default 'pending' check (status in ('pending','confirmed','rejected','refunded')),
  reference  text,
  proof_path text,                          -- bucket "payment-proofs"
  confirmed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table coupon_redemptions (
  id         uuid primary key default gen_random_uuid(),
  coupon_id  uuid not null references coupons(id) on delete cascade,
  order_id   uuid not null references orders(id) on delete cascade,
  email      citext,
  discount   numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (coupon_id, order_id)
);

-- ---------- Inventory ledger ----------
create table inventory_movements (
  id         bigint generated always as identity primary key,
  variant_id uuid not null references product_variants(id) on delete cascade,
  delta      int not null check (delta <> 0),
  reason     text not null check (reason in ('sale','return','adjustment','restock','correction')),
  order_id   uuid references orders(id) on delete set null,
  note       text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on inventory_movements (variant_id, created_at desc);
```

### 0004 — Engagement and content

```sql
-- 0004_engagement_content.sql

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  order_id    uuid references orders(id) on delete set null,
  customer_name text not null,
  email       citext,
  rating      int not null check (rating between 1 and 5),
  title       text,
  body        text not null,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  photo_paths text[] not null default '{}',        -- bucket "review-photos"
  has_photo   boolean generated always as (cardinality(photo_paths) > 0) stored,
  created_at  timestamptz not null default now(),
  moderated_at timestamptz
);
create index reviews_product_idx on reviews (product_id, status);

create table waitlist_subscribers (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  variant_id   uuid references product_variants(id) on delete set null,
  email        citext,
  phone        text,
  restock_date date,
  notified_at  timestamptz,
  created_at   timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create unique index waitlist_unique on waitlist_subscribers (product_id, coalesce(email::text, phone));

create table blog_posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text not null,
  category    text,
  author      text,
  status      text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  views       int not null default 0,
  excerpt     text,
  body        text not null default '',
  hero_image_path text,
  tags        text[] not null default '{}',
  seo_title   text,
  seo_description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index blog_posts_slug_uq on blog_posts (slug) where deleted_at is null;

create table cms_pages (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text not null,
  status      text not null default 'draft' check (status in ('draft','published')),
  body        text not null default '',
  seo_title   text,
  seo_description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index cms_pages_slug_uq on cms_pages (slug) where deleted_at is null;

create table faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  category   text,
  status     text not null default 'published' check (status in ('draft','published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table redirects (
  id         uuid primary key default gen_random_uuid(),
  from_path  text not null,
  to_path    text not null,
  status_code int not null default 301 check (status_code in (301, 302)),
  is_active  boolean not null default true,
  hits       int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (from_path like '/%')
);
create unique index redirects_from_uq on redirects (from_path) where deleted_at is null;

create table newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null,
  name       text,
  source     text not null default 'Footer',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index newsletter_email_uq on newsletter_subscribers (email) where deleted_at is null;

create table contact_inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      citext not null,
  phone      text,
  subject    text not null,
  message    text not null,
  status     text not null default 'unread' check (status in ('unread','read')),
  reply      text,
  replied_at timestamptz,
  replied_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index contact_inquiries_status_idx on contact_inquiries (status, created_at desc);

-- Storefront analytics + abandoned checkouts (written only via service role)
create table analytics_events (
  id         bigint generated always as identity primary key,
  session_id text not null,
  event      text not null,                -- page_view, add_to_cart, begin_checkout, purchase
  path       text,
  referrer   text,
  utm        jsonb not null default '{}',
  product_id uuid references products(id) on delete set null,
  order_id   uuid references orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index analytics_events_created_idx on analytics_events (created_at, event);

create table abandoned_carts (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  email      citext,
  phone      text,
  items      jsonb not null default '[]',
  subtotal   numeric(12,2) not null default 0,
  reminders_sent int not null default 0,
  recovered_order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 0005 — Messaging, accounting, system

```sql
-- 0005_messaging_accounting_system.sql

create table whatsapp_threads (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete set null,
  customer_name text not null,
  phone       text not null,
  needs_reply boolean not null default false,
  confirmed   boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index whatsapp_threads_phone_idx on whatsapp_threads (phone);

create table whatsapp_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references whatsapp_threads(id) on delete cascade,
  direction   text not null check (direction in ('store','customer')),
  body        text not null,
  status      text not null default 'sent' check (status in ('queued','sent','delivered','read','failed')),
  wa_message_id text unique,
  created_at  timestamptz not null default now()
);
create index whatsapp_messages_thread_idx on whatsapp_messages (thread_id, created_at);

create table email_log (
  id          uuid primary key default gen_random_uuid(),
  to_email    citext not null,
  subject     text not null,
  template    text,
  status      text not null check (status in ('sent','failed','not_sent')),
  error       text,
  body_preview text,
  order_id    uuid references orders(id) on delete set null,
  inquiry_id  uuid references contact_inquiries(id) on delete set null,
  provider_id text,
  created_at  timestamptz not null default now()
);
create index email_log_created_idx on email_log (created_at desc);

-- Async jobs: email / whatsapp / push. Worker = Edge Function process-outbox.
create table outbox (
  id           bigint generated always as identity primary key,
  channel      text not null check (channel in ('email','whatsapp','push')),
  template     text not null,
  payload      jsonb not null default '{}',
  status       text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts     int not null default 0,
  last_error   text,
  run_after    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);
create index outbox_pending_idx on outbox (run_after) where status = 'pending';

-- ---------- Accounting ----------
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,
  category     text not null,              -- Running costs, Packaging, Marketing, …
  amount       numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  notes        text,
  created_at   timestamptz not null default now()
);
create index expenses_date_idx on expenses (expense_date);

create table marketing_spend (
  id          uuid primary key default gen_random_uuid(),
  channel     text not null,
  campaign    text,
  amount      numeric(12,2) not null check (amount >= 0),
  spend_date  date not null default current_date,
  attributed_orders int not null default 0,
  attributed_revenue numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);

create table courier_settlements (
  id         uuid primary key default gen_random_uuid(),
  courier    text not null,
  parcels    int not null default 0,
  collected  numeric(12,2) not null default 0,   -- COD cash collected by courier
  fees       numeric(12,2) not null default 0,
  status     text not null default 'unpaid' check (status in ('unpaid','paid')),
  due_date   date,
  paid_at    timestamptz,
  created_at timestamptz not null default now()
);

create table accounting_setup_steps (
  id    text primary key,
  label text not null,
  done  boolean not null default false
);

-- ---------- System ----------
create table addons (
  id            text primary key,
  name          text not null,
  description   text,
  features      text[] not null default '{}',
  monthly_price numeric(12,2) not null default 0,
  yearly_price  numeric(12,2) not null default 0,
  trial_days    int not null default 14,
  status        text not null default 'inactive' check (status in ('inactive','trial','active','cancelled')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','yearly')),
  trial_ends_at timestamptz,
  activated_at  timestamptz
);

create table ai_connections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  provider    text not null,
  permission  text not null default 'read_only' check (permission in ('read_only','propose','full')),
  connected_at timestamptz not null default now(),
  revoked_at  timestamptz
);

create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff_profiles(id) on delete cascade,
  endpoint    text not null unique,
  keys        jsonb not null,
  device_name text,
  user_agent  text,
  last_seen_at timestamptz not null default now(),
  revoked_at  timestamptz
);

create table audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  table_name text not null,
  record_id  text,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_table_idx on audit_log (table_name, created_at desc);
```

### 0006 — Triggers and functions

```sql
-- 0006_functions.sql

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array[
    'staff_profiles','store_settings','suppliers','categories','collections','products','product_variants',
    'customers','coupons','orders','blog_posts','cms_pages','faqs','redirects','newsletter_subscribers',
    'abandoned_carts'
  ] loop
    execute format('create trigger trg_%1$s_updated before update on %1$I for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ---------- Audit trigger ----------
create or replace function audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    auth.uid(), tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id'),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['store_settings','staff_profiles','products','coupons','orders'] loop
    execute format('create trigger trg_%1$s_audit after insert or update or delete on %1$I for each row execute function audit_row()', t);
  end loop;
end $$;

-- ---------- Inventory ledger → variant stock (+ back-in-stock) ----------
create or replace function apply_inventory_movement()
returns trigger language plpgsql security definer set search_path = public as $$
declare old_qty int; new_qty int; pid uuid;
begin
  update product_variants
     set stock_qty = stock_qty + new.delta
   where id = new.variant_id
  returning stock_qty - new.delta, stock_qty, product_id into old_qty, new_qty, pid;

  if old_qty is null then
    raise exception 'Variant % not found', new.variant_id;
  end if;

  -- Stock came back from zero: queue back-in-stock emails for waiting subscribers.
  if old_qty <= 0 and new_qty > 0 then
    insert into outbox (channel, template, payload)
    select 'email', 'back_in_stock',
           jsonb_build_object('waitlist_id', w.id, 'email', w.email, 'product_id', pid)
      from waitlist_subscribers w
     where w.product_id = pid and w.notified_at is null and w.email is not null;
  end if;
  return new;
end $$;

create trigger trg_inventory_apply
  after insert on inventory_movements
  for each row execute function apply_inventory_movement();

-- Admin "set stock to N" → writes a ledger row for the difference.
create or replace function adjust_stock(p_variant uuid, p_new_qty int, p_note text default null)
returns int language plpgsql security definer set search_path = public as $$
declare cur int; d int;
begin
  if not has_role('{owner,manager}'::staff_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_new_qty < 0 then raise exception 'Stock cannot be negative'; end if;
  select stock_qty into cur from product_variants where id = p_variant for update;
  if not found then raise exception 'Variant not found'; end if;
  d := p_new_qty - cur;
  if d <> 0 then
    insert into inventory_movements (variant_id, delta, reason, note)
    values (p_variant, d, 'adjustment', p_note);
  end if;
  return p_new_qty;
end $$;
grant execute on function adjust_stock(uuid, int, text) to authenticated, service_role;

-- ---------- Orders: BEFORE (timestamps, restock) / AFTER (timeline, outbox) ----------
create or replace function orders_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.fulfillment_status = 'fulfilled' and old.fulfillment_status <> 'fulfilled' and new.fulfilled_at is null then
    new.fulfilled_at := now();
  end if;

  -- Cancelled / returned orders put stock back exactly once.
  if new.fulfillment_status in ('cancelled','returned')
     and old.fulfillment_status not in ('cancelled','returned')
     and not new.restocked then
    insert into inventory_movements (variant_id, delta, reason, order_id, note)
    select variant_id, quantity, 'return', new.id, 'Auto restock: order ' || new.fulfillment_status
      from order_items
     where order_id = new.id and variant_id is not null;
    new.restocked := true;
  end if;
  return new;
end $$;

create trigger trg_orders_before_update
  before update on orders
  for each row execute function orders_before_update();

create or replace function orders_after_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.payment_status is distinct from old.payment_status then
    insert into order_events (order_id, type, data, actor_id)
    values (new.id, 'payment_changed',
            jsonb_build_object('from', old.payment_status, 'to', new.payment_status), auth.uid());
  end if;
  if new.fulfillment_status is distinct from old.fulfillment_status then
    insert into order_events (order_id, type, data, actor_id)
    values (new.id, 'fulfillment_changed',
            jsonb_build_object('from', old.fulfillment_status, 'to', new.fulfillment_status), auth.uid());
  end if;
  if new.tracking_number is distinct from old.tracking_number and new.tracking_number is not null then
    insert into order_events (order_id, type, data, actor_id)
    values (new.id, 'tracking_set',
            jsonb_build_object('courier', new.courier, 'tracking', new.tracking_number), auth.uid());
    if old.tracking_number is null then   -- first tracking number → shipping update
      if new.customer_email is not null then
        insert into outbox (channel, template, payload)
        values ('email', 'shipping_update', jsonb_build_object('order_id', new.id));
      end if;
      insert into outbox (channel, template, payload)
      values ('whatsapp', 'shipping_update', jsonb_build_object('order_id', new.id));
    end if;
  end if;
  return null;
end $$;

create trigger trg_orders_after_update
  after update on orders
  for each row execute function orders_after_update();

-- ---------- Checkout (service role only) ----------
create or replace function place_order(
  p_customer        jsonb,                   -- {name,email,phone,city,address}
  p_items           jsonb,                   -- [{variant_id, qty}]
  p_payment_method  payment_method default 'cod',
  p_coupon_code     text default null,
  p_notes           text default null,
  p_channel         text default 'Direct / Organic',
  p_utm             jsonb default '{}',
  p_idempotency_key text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  st            store_settings%rowtype;
  v_flat        numeric; v_free numeric; v_codfee numeric; v_taxrate numeric;
  it            jsonb;
  v             record;
  v_qty         int;
  v_lines       jsonb := '[]'::jsonb;
  v_subtotal    numeric := 0;
  v_discount    numeric := 0;
  v_shipping    numeric := 0;
  v_cod         numeric := 0;
  v_tax         numeric := 0;
  v_total       numeric;
  v_coupon      coupons%rowtype;
  v_customer_id uuid;
  v_repeat      boolean := false;
  v_order_id    uuid;
  v_number      text;
  v_existing    orders%rowtype;
  v_email       citext := nullif(lower(trim(p_customer->>'email')), '');
  v_phone       text   := normalize_pk_phone(p_customer->>'phone');
begin
  -- Idempotency: a double-click / retry returns the same order.
  if p_idempotency_key is not null then
    select * into v_existing from orders where idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('order_id', v_existing.id, 'number', v_existing.number,
                                'total', v_existing.total, 'payment_method', v_existing.payment_method,
                                'duplicate', true);
    end if;
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_customer->>'name'), '') = '' or coalesce(trim(p_customer->>'address'), '') = ''
     or coalesce(trim(p_customer->>'city'), '') = '' or v_phone is null then
    raise exception 'Missing or invalid customer details' using errcode = 'P0001';
  end if;

  select * into st from store_settings where id = 1;
  v_flat    := coalesce((st.shipping->>'flatRate')::numeric, 0);
  v_free    := coalesce((st.shipping->>'freeThreshold')::numeric, 0);
  v_codfee  := coalesce((st.shipping->>'codFee')::numeric, 0);
  v_taxrate := coalesce((st.shipping->>'taxRate')::numeric, 0);

  if (p_payment_method = 'cod'           and not coalesce((st.payments->>'cod')::boolean, false))
  or (p_payment_method = 'bank_transfer' and not coalesce((st.payments->>'bank')::boolean, false))
  or (p_payment_method = 'card'          and not coalesce((st.payments->>'card')::boolean, false)) then
    raise exception 'Payment method not available' using errcode = 'P0001';
  end if;

  -- Merge duplicate lines, then lock + price every variant from the DB.
  for it in
    select jsonb_build_object('variant_id', x.variant_id, 'qty', sum(x.qty))
      from jsonb_to_recordset(p_items) as x(variant_id uuid, qty int)
     group by x.variant_id
     order by x.variant_id                       -- stable lock order avoids deadlocks
  loop
    v_qty := (it->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then
      raise exception 'Invalid quantity' using errcode = 'P0001';
    end if;

    select pv.id as variant_id, pv.product_id, pv.sku, pv.size, pv.color, pv.price, pv.stock_qty,
           p.name, (p.cost_price + p.extra_expenses) as unit_cost
      into v
      from product_variants pv
      join products p on p.id = pv.product_id
     where pv.id = (it->>'variant_id')::uuid
       and pv.deleted_at is null and p.deleted_at is null and p.status = 'active'
       for update of pv;

    if not found then
      raise exception 'An item in your cart is no longer available' using errcode = 'P0002';
    end if;
    if v.stock_qty < v_qty then
      raise exception 'Not enough stock for %', v.name using errcode = 'P0002';
    end if;

    v_subtotal := v_subtotal + v.price * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v.product_id, 'variant_id', v.variant_id, 'name', v.name, 'sku', v.sku,
      'variant_label', nullif(concat_ws(' / ', v.size, v.color), ''),
      'quantity', v_qty, 'unit_price', v.price, 'unit_cost', v.unit_cost));
  end loop;

  -- Coupon
  if nullif(trim(p_coupon_code), '') is not null then
    select * into v_coupon
      from coupons
     where code = trim(p_coupon_code)::citext and deleted_at is null and is_active
       for update;
    if not found
       or (v_coupon.starts_at  is not null and v_coupon.starts_at  > now())
       or (v_coupon.expires_at is not null and v_coupon.expires_at < now()) then
      raise exception 'Coupon is invalid or expired' using errcode = 'P0003';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'Coupon usage limit reached' using errcode = 'P0003';
    end if;
    if v_subtotal < v_coupon.min_order then
      raise exception 'Order does not meet the coupon minimum' using errcode = 'P0003';
    end if;
    v_discount := case v_coupon.discount_type
                    when 'percent' then round(v_subtotal * v_coupon.discount_value / 100, 2)
                    else least(v_coupon.discount_value, v_subtotal)
                  end;
  end if;

  v_shipping := case when v_free > 0 and (v_subtotal - v_discount) >= v_free then 0 else v_flat end;
  v_cod      := case when p_payment_method = 'cod' then v_codfee else 0 end;
  v_tax      := round((v_subtotal - v_discount) * v_taxrate / 100, 2);
  v_total    := v_subtotal - v_discount + v_shipping + v_cod + v_tax;

  -- Customer upsert (match by email or phone)
  select id into v_customer_id from customers
   where (v_email is not null and email = v_email) or phone = v_phone
   limit 1;
  if v_customer_id is null then
    insert into customers (name, email, phone, city, address)
    values (trim(p_customer->>'name'), v_email, v_phone, trim(p_customer->>'city'), trim(p_customer->>'address'))
    returning id into v_customer_id;
  else
    v_repeat := exists (select 1 from orders where customer_id = v_customer_id);
    update customers
       set name = trim(p_customer->>'name'),
           email = coalesce(email, v_email),
           city = trim(p_customer->>'city'),
           address = trim(p_customer->>'address')
     where id = v_customer_id;
  end if;

  v_number := 'BN-' || nextval('order_number_seq');

  insert into orders (
    number, idempotency_key, customer_id, customer_name, customer_email, customer_phone,
    shipping_city, shipping_address, subtotal, shipping_fee, cod_fee, tax, discount, total,
    coupon_id, coupon_code, payment_method, courier, channel, utm, notes, is_repeat_customer)
  values (
    v_number, p_idempotency_key, v_customer_id, trim(p_customer->>'name'), v_email, v_phone,
    trim(p_customer->>'city'), trim(p_customer->>'address'), v_subtotal, v_shipping, v_cod, v_tax, v_discount, v_total,
    case when v_coupon.id is not null then v_coupon.id end, v_coupon.code::text,
    p_payment_method, st.couriers->>'default', coalesce(p_channel, 'Direct / Organic'),
    coalesce(p_utm, '{}'), nullif(trim(p_notes), ''), v_repeat)
  returning id into v_order_id;

  insert into order_items (order_id, product_id, variant_id, name, sku, variant_label, quantity, unit_price, unit_cost)
  select v_order_id, x.product_id, x.variant_id, x.name, x.sku, x.variant_label, x.quantity, x.unit_price, x.unit_cost
    from jsonb_to_recordset(v_lines) as x(
      product_id uuid, variant_id uuid, name text, sku text, variant_label text,
      quantity int, unit_price numeric, unit_cost numeric);

  insert into inventory_movements (variant_id, delta, reason, order_id)
  select x.variant_id, -x.quantity, 'sale', v_order_id
    from jsonb_to_recordset(v_lines) as x(variant_id uuid, quantity int);

  if v_coupon.id is not null then
    insert into coupon_redemptions (coupon_id, order_id, email, discount)
    values (v_coupon.id, v_order_id, v_email, v_discount);
    update coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  insert into order_events (order_id, type, data)
  values (v_order_id, 'placed', jsonb_build_object('channel', p_channel, 'payment_method', p_payment_method));

  if v_email is not null then
    insert into outbox (channel, template, payload)
    values ('email', 'order_confirmation', jsonb_build_object('order_id', v_order_id));
  end if;
  insert into outbox (channel, template, payload)
  values ('whatsapp', 'order_confirmation', jsonb_build_object('order_id', v_order_id));

  return jsonb_build_object(
    'order_id', v_order_id, 'number', v_number, 'total', v_total,
    'payment_method', p_payment_method,
    'bank_details', case when p_payment_method = 'bank_transfer' then st.payments->>'bankDetails' end);
end $$;

revoke execute on function place_order(jsonb, jsonb, payment_method, text, text, text, jsonb, text) from public, anon, authenticated;
grant  execute on function place_order(jsonb, jsonb, payment_method, text, text, text, jsonb, text) to service_role;

-- ---------- Public write RPCs (service role only; called from Vercel route handlers) ----------
create or replace function subscribe_newsletter(p_email text, p_name text default null, p_source text default 'Footer')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into newsletter_subscribers (email, name, source)
  values (lower(trim(p_email)), nullif(trim(p_name), ''), coalesce(p_source, 'Footer'))
  on conflict (email) where deleted_at is null do update set is_active = true, updated_at = now();
end $$;

create or replace function submit_contact(p_name text, p_email text, p_phone text, p_subject text, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if length(coalesce(p_message, '')) < 5 or length(p_message) > 4000 then
    raise exception 'Invalid message' using errcode = 'P0001';
  end if;
  insert into contact_inquiries (name, email, phone, subject, message)
  values (trim(p_name), lower(trim(p_email)), normalize_pk_phone(p_phone), trim(p_subject), trim(p_message))
  returning id into v_id;
  return v_id;
end $$;

create or replace function join_waitlist(p_product uuid, p_variant uuid, p_email text, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into waitlist_subscribers (product_id, variant_id, email, phone)
  values (p_product, p_variant, nullif(lower(trim(p_email)), ''), normalize_pk_phone(p_phone))
  on conflict do nothing;
end $$;

create or replace function submit_review(
  p_product uuid, p_name text, p_email text, p_rating int, p_title text, p_body text, p_photos text[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into reviews (product_id, customer_name, email, rating, title, body, photo_paths)
  values (p_product, trim(p_name), nullif(lower(trim(p_email)), ''), p_rating, nullif(trim(p_title), ''), trim(p_body), coalesce(p_photos, '{}'))
  returning id into v_id;
  return v_id;
end $$;

-- Order tracking: needs order number + the email or phone used at checkout.
create or replace function track_order(p_number text, p_contact text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare o orders%rowtype;
begin
  select * into o from orders
   where number = upper(trim(p_number))
     and (customer_email = lower(trim(p_contact)) or customer_phone = normalize_pk_phone(p_contact));
  if not found then return null; end if;
  return jsonb_build_object(
    'number', o.number, 'placed_at', o.placed_at, 'payment_status', o.payment_status,
    'fulfillment_status', o.fulfillment_status, 'courier', o.courier, 'tracking_number', o.tracking_number,
    'total', o.total,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'variant', variant_label, 'qty', quantity)), '[]'::jsonb)
                from order_items where order_id = o.id));
end $$;

create or replace function increment_redirect_hit(p_from text)
returns void language sql security definer set search_path = public as $$
  update redirects set hits = hits + 1 where from_path = p_from and deleted_at is null;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'subscribe_newsletter(text,text,text)',
    'submit_contact(text,text,text,text,text)',
    'join_waitlist(uuid,uuid,text,text)',
    'submit_review(uuid,text,text,int,text,text,text[])',
    'track_order(text,text)',
    'increment_redirect_hit(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ---------- Smart collections ----------
create or replace function refresh_smart_collection(p_collection uuid)
returns int language plpgsql security definer set search_path = public as $$
declare c collections%rowtype; r jsonb; n int;
begin
  select * into c from collections where id = p_collection and type = 'smart' and deleted_at is null;
  if not found then return 0; end if;
  r := c.rule;

  delete from collection_products where collection_id = c.id;
  insert into collection_products (collection_id, product_id)
  select c.id, p.id
    from products p
   where p.deleted_at is null and p.status = 'active'
     and (
          (r->>'field' = 'price' and r->>'op' = 'lt' and p.price <  (r->>'value')::numeric)
       or (r->>'field' = 'price' and r->>'op' = 'gt' and p.price >  (r->>'value')::numeric)
       or (r->>'field' = 'color' and exists (
             select 1 from product_variants v
              where v.product_id = p.id and v.deleted_at is null
                and v.color ilike any (select '%' || x || '%' from jsonb_array_elements_text(r->'values') x)))
       or (r->>'field' = 'category' and exists (
             select 1 from product_categories pc join categories k on k.id = pc.category_id
              where pc.product_id = p.id and k.name = r->>'value'))
       or (r->>'field' = 'in_stock' and exists (
             select 1 from product_variants v
              where v.product_id = p.id and v.deleted_at is null and v.stock_qty > 0))
     );
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function refresh_smart_collection(uuid) to authenticated, service_role;

-- ---------- Archive helpers ----------
create or replace function restore_archived(p_table text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role('{owner,manager}'::staff_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_table not in ('products','product_variants','categories','collections','suppliers','coupons',
                     'blog_posts','cms_pages','faqs','redirects','newsletter_subscribers','media_assets') then
    raise exception 'Unsupported table %', p_table;
  end if;
  execute format('update %I set deleted_at = null where id = $1', p_table) using p_id;
end $$;

create or replace function purge_archived(p_table text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role('{owner}'::staff_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_table not in ('products','product_variants','categories','collections','suppliers','coupons',
                     'blog_posts','cms_pages','faqs','redirects','newsletter_subscribers','media_assets') then
    raise exception 'Unsupported table %', p_table;
  end if;
  execute format('delete from %I where id = $1 and deleted_at is not null', p_table) using p_id;
end $$;
grant execute on function restore_archived(text, uuid), purge_archived(text, uuid) to authenticated, service_role;

-- Keeps "last active" current without giving staff write access to staff_profiles.
create or replace function touch_last_active()
returns void language sql security definer set search_path = public as $$
  update staff_profiles set last_active_at = now() where id = auth.uid();
$$;
grant execute on function touch_last_active() to authenticated;

-- ---------- Reporting (security invoker → RLS applies, accountant/manager/owner only) ----------
create or replace function analytics_summary(p_from date, p_to date)
returns jsonb language sql stable security invoker set search_path = public as $$
  with o as (
    select * from orders
     where placed_at >= p_from and placed_at < (p_to + 1) and fulfillment_status <> 'cancelled'
  ),
  paid as (select * from o where payment_status = 'paid'),
  cogs as (
    select coalesce(sum(oi.quantity * oi.unit_cost), 0) as v
      from order_items oi join paid on paid.id = oi.order_id
  ),
  sess as (
    select count(distinct session_id) as v from analytics_events
     where created_at >= p_from and created_at < (p_to + 1) and event = 'page_view'
  )
  select jsonb_build_object(
    'orders',        (select count(*) from o),
    'paid_orders',   (select count(*) from paid),
    'revenue',       (select coalesce(sum(total), 0) from paid),
    'aov',           (select coalesce(round(avg(total), 2), 0) from paid),
    'repeat_rate',   (select coalesce(round(100.0 * count(*) filter (where is_repeat_customer) / nullif(count(*), 0), 1), 0) from paid),
    'conversion_rate', (select coalesce(round(100.0 * (select count(*) from o) / nullif((select v from sess), 0), 2), 0)),
    'cogs',          (select v from cogs),
    'gross_profit',  (select coalesce(sum(total), 0) from paid) - (select v from cogs)
  )
$$;

create or replace function analytics_daily(p_from date, p_to date)
returns table (day date, orders bigint, revenue numeric)
language sql stable security invoker set search_path = public as $$
  select d::date,
         count(o.id),
         coalesce(sum(o.total) filter (where o.payment_status = 'paid'), 0)
    from generate_series(p_from, p_to, interval '1 day') d
    left join orders o
           on o.placed_at >= d and o.placed_at < d + interval '1 day'
          and o.fulfillment_status <> 'cancelled'
   group by 1 order by 1
$$;

create or replace function accounting_pnl(p_from date, p_to date)
returns jsonb language sql stable security invoker set search_path = public as $$
  with paid as (
    select * from orders
     where placed_at >= p_from and placed_at < (p_to + 1)
       and payment_status = 'paid' and fulfillment_status <> 'cancelled'
  ),
  rev   as (select coalesce(sum(total), 0) as v from paid),
  cogs  as (select coalesce(sum(oi.quantity * oi.unit_cost), 0) as v from order_items oi join paid on paid.id = oi.order_id),
  exp   as (select coalesce(sum(amount), 0) as v from expenses where expense_date between p_from and p_to),
  mkt   as (select coalesce(sum(amount), 0) as v from marketing_spend where spend_date between p_from and p_to),
  cour  as (select coalesce(sum(fees), 0) as v from courier_settlements where due_date between p_from and p_to)
  select jsonb_build_object(
    'revenue',  (select v from rev),
    'cogs',     (select v from cogs),
    'gross_profit', (select v from rev) - (select v from cogs),
    'expenses_by_category', (
        select coalesce(jsonb_object_agg(category, total), '{}'::jsonb)
          from (select category, sum(amount) as total from expenses
                 where expense_date between p_from and p_to group by category) e),
    'expenses_total',  (select v from exp),
    'marketing_total', (select v from mkt),
    'courier_fees',    (select v from cour),
    'net_profit', (select v from rev) - (select v from cogs) - (select v from exp)
                  - (select v from mkt) - (select v from cour)
  )
$$;
grant execute on function analytics_summary(date, date), analytics_daily(date, date), accounting_pnl(date, date)
  to authenticated, service_role;
```

### 0007 — Views (public storefront + admin helpers)

```sql
-- 0007_views.sql
-- Public views are owned by postgres and intentionally NOT security_invoker:
-- they are the ONLY way anon can read catalogue data, and they omit cost/supplier columns.

create view storefront_products as
select
  p.id, p.name, p.slug, p.description, p.spec_size, p.spec_fabric, p.spec_included,
  p.price, p.compare_at_price, p.brand, p.featured, p.seo_title, p.seo_description, p.created_at,
  coalesce((select jsonb_agg(jsonb_build_object('path', i.path, 'alt', i.alt) order by i.position)
              from product_images i where i.product_id = p.id), '[]'::jsonb) as images,
  coalesce((select jsonb_agg(jsonb_build_object(
                'id', v.id, 'size', v.size, 'color', v.color, 'sku', v.sku, 'price', v.price,
                'in_stock', v.stock_qty > 0, 'stock', least(v.stock_qty, 10)) order by v.position, v.created_at)
              from product_variants v where v.product_id = p.id and v.deleted_at is null), '[]'::jsonb) as variants,
  exists (select 1 from product_variants v where v.product_id = p.id and v.deleted_at is null and v.stock_qty > 0) as in_stock,
  coalesce((select jsonb_agg(c.slug) from product_categories pc
              join categories c on c.id = pc.category_id and c.status = 'active' and c.deleted_at is null
             where pc.product_id = p.id), '[]'::jsonb) as category_slugs,
  coalesce((select jsonb_agg(c.slug) from collection_products cp
              join collections c on c.id = cp.collection_id and c.status = 'active' and c.deleted_at is null
             where cp.product_id = p.id), '[]'::jsonb) as collection_slugs,
  (select round(avg(r.rating), 2) from reviews r where r.product_id = p.id and r.status = 'approved') as rating_avg,
  (select count(*) from reviews r where r.product_id = p.id and r.status = 'approved') as review_count
from products p
where p.status = 'active' and p.deleted_at is null;

create view storefront_categories as
select id, name, slug, parent_id, description, card_image_path, banner_image_path, image_alt,
       seo_title, seo_description, sort_order, featured
  from categories where status = 'active' and deleted_at is null;

create view storefront_collections as
select id, name, slug, description, card_image_path, banner_image_path, image_alt,
       seo_title, seo_description, sort_order, featured,
       coalesce((select jsonb_agg(cp.product_id order by cp.position)
                   from collection_products cp where cp.collection_id = c.id), '[]'::jsonb) as product_ids
  from collections c where status = 'active' and deleted_at is null;

create view storefront_blog_posts as
select id, title, slug, category, author, published_at, excerpt, body, hero_image_path, tags, seo_title, seo_description
  from blog_posts where status = 'published' and deleted_at is null;

create view storefront_pages as
select id, title, slug, body, seo_title, seo_description
  from cms_pages where status = 'published' and deleted_at is null;

create view storefront_faqs as
select id, question, answer, category, sort_order
  from faqs where status = 'published' and deleted_at is null;

create view storefront_reviews as
select id, product_id, customer_name, rating, title, body, photo_paths, created_at
  from reviews where status = 'approved';

create view storefront_redirects as
select from_path, to_path, status_code from redirects where is_active and deleted_at is null;

grant select on storefront_products, storefront_categories, storefront_collections, storefront_blog_posts,
                storefront_pages, storefront_faqs, storefront_reviews, storefront_redirects
  to anon, authenticated;

-- ---------- Admin helper views (security_invoker → RLS enforced) ----------
create view inventory_overview with (security_invoker = true) as
select v.id as variant_id, p.id as product_id, p.name as product_name, p.status as product_status,
       v.sku, v.size, v.color, v.stock_qty,
       case when v.stock_qty = 0 then 'out' when v.stock_qty <= 5 then 'low' else 'in_stock' end as stock_status
  from product_variants v
  join products p on p.id = v.product_id
 where v.deleted_at is null and p.deleted_at is null;

create view product_stock with (security_invoker = true) as
select p.id as product_id, coalesce(sum(v.stock_qty), 0)::int as stock_qty, count(v.id)::int as variant_count
  from products p
  left join product_variants v on v.product_id = p.id and v.deleted_at is null
 group by p.id;

create view customer_stats with (security_invoker = true) as
select c.id, c.name, c.email, c.phone, c.city,
       count(o.id)::int                                       as orders_count,
       coalesce(sum(o.total) filter (where o.payment_status = 'paid'), 0) as total_spent,
       min(o.placed_at)                                       as first_order_at,
       max(o.placed_at)                                       as last_order_at,
       date_trunc('month', min(o.placed_at))::date            as cohort_month
  from customers c
  left join orders o on o.customer_id = c.id and o.fulfillment_status <> 'cancelled'
 group by c.id;

create view archive_items with (security_invoker = true) as
select 'products'::text as source_table, id, name as label, 'Product'::text as entity, deleted_at from products where deleted_at is not null
union all select 'product_variants', id, sku, 'Removed variant', deleted_at from product_variants where deleted_at is not null
union all select 'categories', id, name, 'Category', deleted_at from categories where deleted_at is not null
union all select 'collections', id, name, 'Collection', deleted_at from collections where deleted_at is not null
union all select 'suppliers', id, name, 'Supplier', deleted_at from suppliers where deleted_at is not null
union all select 'coupons', id, code::text, 'Coupon', deleted_at from coupons where deleted_at is not null
union all select 'blog_posts', id, title, 'Blog article', deleted_at from blog_posts where deleted_at is not null
union all select 'cms_pages', id, title, 'Page', deleted_at from cms_pages where deleted_at is not null
union all select 'faqs', id, question, 'FAQ', deleted_at from faqs where deleted_at is not null
union all select 'redirects', id, from_path, 'Redirect', deleted_at from redirects where deleted_at is not null
union all select 'newsletter_subscribers', id, email::text, 'Subscriber', deleted_at from newsletter_subscribers where deleted_at is not null
union all select 'media_assets', id, filename, 'Media', deleted_at from media_assets where deleted_at is not null;

grant select on inventory_overview, product_stock, customer_stats, archive_items to authenticated;
```

### 0008 — Row Level Security and grants

```sql
-- 0008_rls.sql
-- Staff policies are generated from one matrix so the role table in section 8 and the DB cannot drift.
-- Columns: table, read roles, write roles (insert/update), delete roles.  '{}' = nobody (service role only).

do $$
declare r record;
begin
  for r in
    select * from (values
      -- catalogue
      ('suppliers',             '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('categories',            '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('collections',           '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('collection_products',   '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('products',              '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('product_variants',      '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('product_images',        '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('product_categories',    '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('media_assets',          '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('inventory_movements',   '{owner,manager,support,accountant}', '{owner,manager}', '{}'),
      -- sales
      ('customers',             '{owner,manager,support,accountant}', '{owner,manager,support}', '{owner}'),
      ('orders',                '{owner,manager,support,accountant}', '{owner,manager,support}', '{}'),
      ('order_items',           '{owner,manager,support,accountant}', '{owner,manager,support}', '{}'),
      ('order_events',          '{owner,manager,support,accountant}', '{owner,manager,support}', '{}'),
      ('order_payments',        '{owner,manager,support,accountant}', '{owner,manager,support,accountant}', '{}'),
      ('coupons',               '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('coupon_redemptions',    '{owner,manager,support,accountant}', '{}', '{}'),
      -- engagement & content
      ('reviews',               '{owner,manager,support}', '{owner,manager,support}', '{owner,manager,support}'),
      ('waitlist_subscribers',  '{owner,manager,support}', '{owner,manager,support}', '{owner,manager,support}'),
      ('blog_posts',            '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('cms_pages',             '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('faqs',                  '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('redirects',             '{owner,manager,support,accountant}', '{owner,manager}', '{owner,manager}'),
      ('newsletter_subscribers','{owner,manager,support}', '{owner,manager}', '{owner,manager}'),
      ('contact_inquiries',     '{owner,manager,support}', '{owner,manager,support}', '{owner,manager,support}'),
      ('analytics_events',      '{owner,manager,accountant}', '{}', '{}'),
      ('abandoned_carts',       '{owner,manager,support}', '{}', '{}'),
      -- messaging
      ('whatsapp_threads',      '{owner,manager,support}', '{owner,manager,support}', '{owner,manager}'),
      ('whatsapp_messages',     '{owner,manager,support}', '{owner,manager,support}', '{owner,manager}'),
      ('email_log',             '{owner,manager,support}', '{}', '{}'),
      ('outbox',                '{owner}', '{}', '{}'),
      -- accounting
      ('expenses',              '{owner,manager,accountant}', '{owner,accountant}', '{owner,accountant}'),
      ('marketing_spend',       '{owner,manager,accountant}', '{owner,accountant}', '{owner,accountant}'),
      ('courier_settlements',   '{owner,manager,accountant}', '{owner,accountant}', '{owner,accountant}'),
      ('accounting_setup_steps','{owner,manager,accountant}', '{owner,accountant}', '{owner,accountant}'),
      -- system
      ('store_settings',        '{owner,manager}', '{owner}', '{}'),
      ('addons',                '{owner}', '{owner}', '{}'),
      ('ai_connections',        '{owner}', '{owner}', '{owner}'),
      ('staff_profiles',        '{owner,manager,support,accountant}', '{owner}', '{owner}'),
      ('audit_log',             '{owner}', '{}', '{}')
    ) as t(tbl, read_roles, write_roles, delete_roles)
  loop
    execute format('alter table public.%I enable row level security', r.tbl);

    execute format($f$create policy staff_select on public.%I for select to authenticated
                      using (public.has_role(%L::public.staff_role[]))$f$, r.tbl, r.read_roles);
    execute format($f$create policy staff_insert on public.%I for insert to authenticated
                      with check (public.has_role(%L::public.staff_role[]))$f$, r.tbl, r.write_roles);
    execute format($f$create policy staff_update on public.%I for update to authenticated
                      using (public.has_role(%L::public.staff_role[]))
                      with check (public.has_role(%L::public.staff_role[]))$f$, r.tbl, r.write_roles, r.write_roles);
    execute format($f$create policy staff_delete on public.%I for delete to authenticated
                      using (public.has_role(%L::public.staff_role[]))$f$, r.tbl, r.delete_roles);
  end loop;
end $$;

-- Own-device push subscriptions
alter table push_subscriptions enable row level security;
create policy own_push on push_subscriptions for all to authenticated
  using (staff_id = auth.uid()) with check (staff_id = auth.uid());

-- anon gets NOTHING on base tables; only the storefront_* views granted in 0007.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;

-- Realtime for live admin updates
alter publication supabase_realtime add table orders, whatsapp_messages, contact_inquiries;
```

### 0009 — Storage buckets and policies

```sql
-- 0009_storage.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media',          'media',          true,  5242880, array['image/jpeg','image/png','image/webp','image/avif']),
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('review-photos',  'review-photos',  false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- media: public read, staff (owner/manager) write
create policy media_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');
create policy media_staff_write on storage.objects for all to authenticated
  using      (bucket_id = 'media' and public.has_role('{owner,manager}'::public.staff_role[]))
  with check (bucket_id = 'media' and public.has_role('{owner,manager}'::public.staff_role[]));

-- payment proofs + review photos: staff read; uploads happen through signed upload URLs issued by the server
create policy private_buckets_staff_read on storage.objects for select to authenticated
  using (bucket_id in ('payment-proofs','review-photos') and public.is_staff());
create policy private_buckets_staff_delete on storage.objects for delete to authenticated
  using (bucket_id in ('payment-proofs','review-photos') and public.has_role('{owner,manager}'::public.staff_role[]));
-- Approved review photos are copied into "media" (or served via signed URLs) by the moderation action.
```

### 0010 — Seed and scheduled jobs

```sql
-- 0010_seed_and_cron.sql

insert into store_settings (id, identity, contact, seo) values (
  1,
  '{"storeName":"Baytak Noor","tagline":"Luxury bed linen, woven for everyday rest.","currency":"PKR","country":"Pakistan"}',
  '{"email":"","phone":"","whatsapp":"","address":""}',
  '{"title":"Baytak Noor — Luxury Bed Linen","description":"","domain":"","robots":true}'
) on conflict (id) do nothing;

insert into accounting_setup_steps (id, label) values
  ('s1','Set the store currency and country'),
  ('s2','Add courier accounts'),
  ('s3','Add cost prices for every product'),
  ('s4','Record monthly running costs'),
  ('s5','Connect ad accounts'),
  ('s6','Invite your accountant')
on conflict do nothing;

insert into addons (id, name, description, features, monthly_price, yearly_price, trial_days) values
  ('accounting','Accounting & Ledger','True profit after product costs, delivery, ads and running costs.',
     array['Profit & loss','Expenses & bills','Courier COD tracking','Tax reports'], 2499, 24990, 14),
  ('abandoned_cart','Abandoned Cart Recovery','Recover checkout drop-offs with timed WhatsApp and email reminders.',
     array['Recovery emails','WhatsApp reminders','Recovered revenue report'], 1499, 14990, 14),
  ('loyalty','Loyalty & Rewards','Points, referrals and early access for returning customers.',
     array['Points ledger','Referral codes','VIP tiers'], 1999, 19990, 14),
  ('advanced_reports','Advanced Reports','Cohorts, channel attribution, product profitability and exports.',
     array['Cohort analysis','Product margins','Scheduled exports'], 999, 9990, 0)
on conflict do nothing;

-- ---------- Cron (pg_cron runs in UTC; PKT = UTC+5) ----------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Smart collections stay fresh
select cron.schedule('refresh-smart-collections', '*/15 * * * *', $$
  select refresh_smart_collection(id) from collections where type = 'smart' and deleted_at is null
$$);

-- Housekeeping
select cron.schedule('outbox-cleanup', '0 22 * * 0', $$
  delete from outbox where status = 'sent' and processed_at < now() - interval '30 days'
$$);
select cron.schedule('analytics-trim', '30 22 * * 0', $$
  delete from analytics_events where created_at < now() - interval '180 days'
$$);

-- Daily low-stock digest at 09:00 PKT
select cron.schedule('low-stock-digest', '0 4 * * *', $$
  insert into outbox (channel, template, payload)
  select 'push', 'low_stock_digest',
         jsonb_build_object('count', count(*), 'skus', jsonb_agg(sku))
    from inventory_overview
   where stock_status <> 'in_stock' and product_status = 'active'
  having count(*) > 0
$$);

-- Wake the outbox worker every minute (safety net; a Database Webhook on outbox INSERT gives instant delivery).
-- Store the function URL + service key in Vault, then:
-- select cron.schedule('process-outbox', '* * * * *', $$
--   select net.http_post(
--     url     := (select decrypted_secret from vault.decrypted_secrets where name = 'outbox_fn_url'),
--     headers := jsonb_build_object('Authorization', 'Bearer ' ||
--                (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'))
--   )
-- $$);
```

> **Smart-rule JSON examples** (what the admin form should write to `collections.rule`):
> `{"field":"price","op":"lt","value":10000}` · `{"field":"color","values":["Ivory","Sand"]}` · `{"field":"category","value":"Bed Sheets"}` · `{"field":"in_stock"}`

---

## 7. API surface

**Admin (browser, `supabase-js`, JWT of the logged-in staff member)** — RLS decides everything.
- CRUD on tables from section 5 via PostgREST.
- RPCs: `adjust_stock`, `restore_archived`, `purge_archived`, `refresh_smart_collection`, `analytics_summary`, `analytics_daily`, `accounting_pnl`, `touch_last_active`.
- Storage: upload to `media` bucket; save `media_assets` row.
- Realtime: subscribe to `orders`, `whatsapp_messages`, `contact_inquiries`.

**Storefront (reads)** — `anon` key, only `storefront_*` views + `get_storefront_settings()`.

**Storefront (writes)** — Next.js route handlers on Vercel using the **service role key** (server only), after Cloudflare Turnstile + rate limiting:

| Route | Calls | Notes |
| --- | --- | --- |
| `POST /api/checkout` | `place_order()` | Generates the idempotency key client-side; maps `P0002`→409 (stock), `P0003`→422 (coupon) |
| `GET /api/track` | `track_order()` | Number + email/phone required |
| `POST /api/newsletter` | `subscribe_newsletter()` | |
| `POST /api/contact` | `submit_contact()` | Optional admin notification via outbox |
| `POST /api/waitlist` | `join_waitlist()` | |
| `POST /api/reviews` | `submit_review()` | Photos via signed upload URL into `review-photos` |
| `POST /api/events` | insert `analytics_events` / `abandoned_carts` | Batched, fire-and-forget |
| `POST /api/revalidate` | Next ISR revalidation | Called by Supabase Database Webhooks on content tables |
| Middleware | `storefront_redirects` + `increment_redirect_hit()` | Cache the redirect table in memory for 60 s |

**Edge Functions (Supabase)**: `process-outbox`, `whatsapp-webhook` (verify Meta signature), `postex-sync`, `invite-staff`, `save-secret`. A later `mcp` function serves the AI connector.

---

## 8. Roles and permissions

| Area | Owner | Manager | Support | Accountant |
| --- | --- | --- | --- | --- |
| Products, variants, inventory, categories, collections, suppliers, media | RW | RW | R | R |
| Orders, customers, order timeline | RW | RW | RW | R |
| Coupons | RW | RW | R | R |
| Reviews, waitlist, WhatsApp, inbound contact | RW | RW | RW | — |
| Email log | R | R | R | — |
| Blog, pages, FAQ, redirects | RW | RW | R | R |
| Newsletter | RW | RW | R | — |
| Accounting tables | RW | R | — | RW |
| Analytics events / reports | R | R | — | R |
| Store settings | RW | R | — | — |
| Staff, add-ons, AI connections, audit log, outbox | RW / R | — | — | — |

Manager = the demo's "Admin" role minus owner powers. If you want a separate "Admin" tier later, add an enum value with `alter type staff_role add value` and a new migration for policies.

---

## 9. Integrations

- **Email (Resend or SMTP):** templates `order_confirmation`, `shipping_update`, `back_in_stock`, `contact_reply`. Worker writes one `email_log` row per attempt; if no sender is configured, log `not_sent` with the reason (matches the admin's "Not sent (email not set up)" status).
- **WhatsApp Cloud API:** outbound template messages for order confirmation/shipping (template approval required by Meta), inbound webhook creates/updates `whatsapp_threads` + `whatsapp_messages`, sets `needs_reply`. Cloud token stored via `save-secret` (Vault), never in `store_settings`.
- **Couriers:** adapter interface `{ book(order), track(trackingNo) }`. PostEx first (per its merchant API docs), then TCS / Leopards. `postex-sync` runs on cron every 30–60 min for orders with a tracking number and not yet fulfilled/returned, updates `courier_status`, and flips fulfillment on delivery.
- **COD reconciliation:** when a courier remits cash, record a `courier_settlements` row; Accounting compares collected vs. fees.
- **Tracking/ads:** GA4/GTM/Meta/TikTok IDs come from `get_storefront_settings()`; server-side Meta CAPI optional later.
- **Payments:** bank transfer = customer uploads proof (`order_payments`), staff confirms → `payment_status = 'paid'`. Evaluate local card/wallet gateways in Phase 10.

---

## 10. Temporary storefront (parallel track)

**Rule:** `storefront_temp/` is disposable. No business logic lives in it — pricing, stock, coupons and shipping are all decided by `place_order()`. The real storefront needs only the data contract below.

**Stack:** Next.js (App Router) + `@supabase/supabase-js` + plain CSS. Deploy as its own Vercel project. Skip design polish, animations, i18n.

**Pages (minimum to exercise the backend):**
1. `/` — featured products + collections (`storefront_products`, `storefront_collections`).
2. `/collections/[slug]` — product grid, basic filters.
3. `/products/[slug]` — gallery, variant picker, stock state, reviews, waitlist form when out of stock.
4. `/cart` — `localStorage` cart `[{variant_id, qty}]` (prices re-fetched from DB for display).
5. `/checkout` — customer form, payment method from `get_storefront_settings()`, coupon field → `/api/checkout`.
6. `/order/[number]` — confirmation (bank details when bank transfer).
7. `/track` — `/api/track`.
8. `/pages/[slug]`, `/blog`, `/blog/[slug]`, `/faq`, `/contact`, newsletter form in footer.

**Data contract the future storefront must follow**
- Read: `storefront_products | _categories | _collections | _blog_posts | _pages | _faqs | _reviews | _redirects`, `get_storefront_settings()`.
- Images: build URL as `<SUPABASE_URL>/storage/v1/object/public/media/<path>`.
- Write: only the route handlers in section 7.
- Never read base tables from the browser.

---

## 11. Wiring the existing admin (`site_admin/`) to Supabase

The admin's pages call a **synchronous** `Admin.store` (`list/byId/add/update/remove/archiveItem…`). To avoid rewriting 28 screens at once:

1. Add `assets/config.js` with the Supabase URL + **anon key** (public by design; security comes from Auth + RLS).
2. Add a login screen; block the shell until `supabase.auth.getSession()` returns a staff session.
3. Write `assets/supabase-store.js`, a drop-in replacement for `store.js`:
   - On login, **hydrate a local cache** by fetching each collection once (fine for a small store: hundreds of rows).
   - Keep the same sync read API (`list`, `byId`, `productById`, `variants`) reading from the cache.
   - Make `add/update/remove` write-through: update the cache immediately, send the mutation to Supabase, roll back + toast on error.
   - Map shapes: demo `category` string → `product_categories`; demo `image` data URL → Storage upload + `product_images`; demo statuses (`"Active"`, `"PAID"`) ↔ DB enums (`active`, `paid`) in one mapping module.
   - `archiveItem/restoreArchive/purgeArchive` → `deleted_at`, `restore_archived()`, `purge_archived()`.
4. Subscribe to Realtime for orders/messages to refresh the cache.
5. Migrate one tab at a time (Products → Inventory → Orders → …) behind a `USE_SUPABASE` flag so the demo still runs.
6. Later, if the admin grows, move it into a Next.js app and drop the cache layer; the SQL does not change.

---

## 12. Deployment steps (Supabase + Vercel)

1. **Supabase:** create `dev` and `prod` projects → `supabase link` each → `supabase db push` (migrations 0001–0010).
2. **Auth settings:** disable public sign-ups (staff are invited only), set the site URL and redirect URLs for the admin domain, enforce strong passwords, enable email confirmations.
3. **Storage:** confirm the three buckets exist; set the CORS/allowed origins for admin and storefront domains.
4. **Edge Functions:** `supabase functions deploy <name>`; set secrets with `supabase secrets set`.
5. **Bootstrap the first owner:** create the user in Supabase Auth (dashboard), then in the SQL editor:
   ```sql
   insert into staff_profiles (id, name, email, role)
   select id, 'Your Name', email, 'owner' from auth.users where email = 'you@example.com';
   ```
6. **Vercel (admin):** import repo → Root Directory `site_admin` → Framework "Other" → no build command, output `.`. Add `X-Robots-Tag: noindex` and security headers in `vercel.json`. Attach `admin.<domain>`.
7. **Vercel (storefront):** Root Directory `storefront_temp`. Add the env vars below. Attach the main domain (or a preview URL while it's temporary).
8. **Webhooks:** Supabase Database Webhook (content tables → `/api/revalidate`), Meta webhook → `whatsapp-webhook`, optional DB webhook `outbox` INSERT → `process-outbox`.
9. **Cron:** confirm the `cron.job` rows exist; schedule `process-outbox` and `postex-sync` after the Vault secrets are set.

**Environment variables**

| Name | Where | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Storefront | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Storefront **server** only, Edge Functions | **never in browser** |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Storefront | secret / public |
| `RESEND_API_KEY` | Edge Function secret | no |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET` | Edge Function secrets | no |
| `POSTEX_API_KEY` (+ TCS/Leopards) | Edge Function secrets / Vault | no |
| Admin `config.js`: Supabase URL + anon key | Static file | yes (anon key only) |

**Plan caveats to check before launch (terms change):**
- Supabase free projects can be **paused after inactivity** and have small DB/storage limits and no daily backups — fine for dev, risky for a live store.
- Vercel's free "Hobby" tier is meant for **non-commercial** use; a live store should be on a paid plan. Check the current terms.

---

## 13. Security, testing, operations

**Security checklist**
- [ ] `anon` cannot `select` any base table (test: `select * from products` as anon → permission denied).
- [ ] `cost_price`, `extra_expenses`, supplier data appear in **no** storefront view.
- [ ] Service-role key exists only in Vercel server env + Edge Function secrets.
- [ ] All `SECURITY DEFINER` functions set `search_path` and have explicit grants (done above).
- [ ] Turnstile + rate limits on every public route; max body size; reject oversize carts.
- [ ] Webhooks verify signatures (Meta) / shared secrets.
- [ ] Admin: MFA for owner, short sessions, `noindex`, no secrets in `store_settings`.
- [ ] Uploads: MIME + size limits (bucket config), images re-encoded/resized server-side later.
- [ ] Order tracking requires number **and** email/phone; no order enumeration.

**Tests (`supabase/tests/*.sql` with pgTAP, run by `supabase test db`)**
1. RLS matrix: for each role, attempt select/insert/update/delete on every table; assert against section 8.
2. `anon` sees only `storefront_*` rows (draft/archived/deleted products excluded).
3. `place_order`: totals, free-shipping threshold, COD fee, percent vs. fixed coupon, expired/over-limit/min-order coupon, inactive product, duplicate lines merged.
4. Concurrency: parallel orders against limited stock — never negative stock, exactly N succeed.
5. Idempotency: same key twice → one order.
6. Cancel/return restocks exactly once; re-saving doesn't restock again.
7. Ledger invariant: `stock_qty = sum(inventory_movements.delta)` per variant (a nightly check query).
8. Back-in-stock enqueues outbox rows only on 0 → >0.

**Operations**
- Backups: use Supabase backups on a paid plan; otherwise a scheduled `pg_dump` (GitHub Action) to private storage, restore-tested once.
- Monitoring: Supabase logs, Vercel logs, an uptime ping on the storefront and `/api/health`, alert when `outbox` has `failed` rows or pending > 10 minutes.
- Migrations only through Git; never edit prod schema in the dashboard.
- Seed script is **dev only**; prod starts empty except `seed.sql`.

---

## 14. Open questions / risks

1. **Payments:** COD + bank transfer at launch — which card/wallet gateway later?
2. **Courier choice:** is PostEx the default for all orders, or rules by city/weight?
3. **Invoices:** simple printable page, or generated PDF stored per order?
4. **Roles:** is the four-role model enough (the demo shows Owner/Admin, Manager, Support, Accountant)?
5. **Add-ons:** real billing, or just feature flags for you as the single owner?
6. **Taxes:** `taxRate` is a single flat percentage; Pakistan sales-tax rules may need per-category rates later.
7. **Inventory across sales channels:** if you sell on Instagram/WhatsApp manually, add an admin "Create order" screen that reuses `place_order()` with a staff-only wrapper.
8. **Image pipeline:** start with direct uploads; add resizing (Supabase image transforms or `sharp` in an Edge Function) once pages feel heavy.

---

## 15. Next concrete steps

1. Create the dev Supabase project and run migrations 0001–0010.
2. Bootstrap the owner account and verify the RLS tests.
3. Write `seed-from-demo.mjs` and load the demo catalogue/orders into **dev**.
4. Build the Supabase adapter for **Products + Inventory** first and confirm admin ↔ DB round trip.
5. Stand up `storefront_temp` with `/products/[slug]` and `/checkout` to prove `place_order()` end to end.
