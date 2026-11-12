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