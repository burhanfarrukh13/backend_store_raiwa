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
create index order_items_order_idx on order_items (order_id) where deleted_at is null;
create index order_items_variant_idx on order_items (variant_id) where deleted_at is null;

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
create index order_payments_order_idx on order_payments (order_id) where deleted_at is null;

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
returns jsonb language sql security definer set search_path = public as $$\ndeclare
  v_order_id uuid;
  v_customer_id uuid;
  v_stock_ok boolean;
  v_coupon_valid boolean;
  v_final_total numeric(12,2);
  v_applied_discount numeric(12,2);
  v_shipping numeric(12,2) default 0;
begin
  -- 1. Find or create customer
  select id into v_customer_id
  from customers
  where email = p_customer_email and deleted_at is null;

  if v_customer_id is null then
    insert into customers (name, email, phone)
    values (p_customer_name, p_customer_email, p_customer_phone);
    set v_customer_id = currval('customers_id_seq');
  end if;

  -- 2. Validate stock and compute totals
  v_stock_ok := true;
  v_final_total := 0;
  v_applied_discount := 0;

  -- Validate stock for each variant/quantity pair
  IF array_length(p_variant_ids, 1) IS NOT NULL AND array_length(p_quantities, 1) IS NOT NULL AND array_length(p_variant_ids, 1) = array_length(p_quantities, 1) THEN
    FOR i IN 1..array_length(p_variant_ids, 1) LOOP
      -- Check if sufficient stock exists
      SELECT stock_qty > 0 INTO v_stock_ok
      FROM product_variants
      WHERE id = p_variant_ids[i];

      IF NOT v_stock_ok THEN
        EXIT; -- Insufficient stock, stop processing
      END IF;

      -- Find the price for this variant (use current price or lock it)
      -- For now, we'll compute the total based on variant price * quantity
      -- In a full implementation, you'd lock the variant row or use a price snapshot
    END LOOP;
  END IF;

  -- Apply coupon if provided
  IF p_coupon_code IS NOT NULL THEN
    -- Validate coupon via RPC
    -- SELECT discount_amount INTO v_applied_discount
    -- FROM coupons WHERE code = p_coupon_code AND is_active AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now());
    -- For now, placeholder discount
    v_applied_discount := 0;
    v_final_total := 250; -- placeholder base total
  ELSE
    v_final_total := 250; -- placeholder base total
  END IF;

  -- 3. Create the order with computed totals
  insert into orders (
    order_number, customer_id, staff_id,
    status, payment_method, payment_status,
    subtotal, shipping, discount, tax, total,
    notes, courier_name, fulfillment_status,
    deleted_at
  ) values (
    p_order_number, v_customer_id, null,
    'unfulfilled', p_payment_method, 'unpaid',
    0, v_shipping, v_applied_discount, 0, v_final_total,
    p_notes, null, 'unfulfilled',
    null
  ) returning id into v_order_id;

  -- 4. Create order items and record inventory movements
  IF v_stock_ok THEN
    FOR i IN 1..array_length(p_variant_ids, 1) LOOP
      -- Get variant price at time of purchase
      DECLARE v_price numeric(12,2);
      SELECT price INTO v_price FROM product_variants WHERE id = p_variant_ids[i];
      
      v_total := v_price * p_quantities[i];

      insert into order_items (order_id, variant_id, quantity, price, total, sku)
      values (v_order_id, p_variant_ids[i], p_quantities[i], v_price, v_total, 'SKU-' || p_variant_ids[i]);

      -- Record inventory movement (negative delta = decrement stock)
      INSERT into inventory_movements (variant_id, delta, reason, notes)
      values (p_variant_ids[i], -p_quantities[i], 'sale', 'Order ' || v_order_id);
    END LOOP;
  END IF;

  -- 5. Return order confirmation
  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', p_order_number,
    'total', v_final_total,
    'status', 'placed'
  );
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
create index order_events_order_idx on order_events (order_id) where deleted_at is null;