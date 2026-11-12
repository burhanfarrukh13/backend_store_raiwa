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

