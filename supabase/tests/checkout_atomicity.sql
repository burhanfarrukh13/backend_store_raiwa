-- Run against an isolated development database after applying all migrations.
-- The transaction is rolled back, so it leaves no test products or customer data.
begin;

do $$
declare
  v_product uuid := gen_random_uuid();
  v_variant uuid := gen_random_uuid();
  v_first jsonb;
  v_retry jsonb;
  v_order_id uuid;
  v_job_id uuid;
  v_stock integer;
  v_count integer;
begin
  update store_settings
     set notifications = jsonb_set(notifications, '{adminEmail}', to_jsonb('admin@example.invalid'::text), true)
   where id = 1;

  insert into products (id, name, slug, sku, status, price)
  values (v_product, 'Migration test product', 'migration-test-' || v_product,
          'TEST-' || replace(v_product::text, '-', ''), 'active', 125);
  insert into product_variants (id, product_id, sku, price, stock_qty)
  values (v_variant, v_product, 'TESTV-' || replace(v_variant::text, '-', ''), 125, 3);

  v_first := place_order(
    null, 'Test Buyer', 'checkout-test@example.invalid', '03001234567',
    'cod', array[v_variant], array[2], null, null, 'migration-test-key-0001'
  );
  v_order_id := (v_first->>'order_id')::uuid;
  if coalesce((v_first->>'duplicate')::boolean, true) then
    raise exception 'first checkout was unexpectedly marked duplicate';
  end if;

  select stock_qty into v_stock from product_variants where id = v_variant;
  if v_stock <> 1 then raise exception 'expected stock 1 after sale, got %', v_stock; end if;
  select count(*) into v_count from orders where id = v_order_id;
  if v_count <> 1 then raise exception 'expected exactly one order'; end if;
  select count(*) into v_count from order_items where order_id = v_order_id;
  if v_count <> 1 then raise exception 'expected exactly one order item'; end if;
  select count(*) into v_count from inventory_movements
   where variant_id = v_variant and reason = 'sale' and delta = -2;
  if v_count <> 1 then raise exception 'expected exactly one sale movement'; end if;
  select count(*) into v_count from outbox where dedupe_key like 'migration-test-key-0001:%';
  if v_count <> 2 then raise exception 'expected one customer email and one WhatsApp outbox job'; end if;
  select count(*) into v_count from outbox
   where recipient = 'admin@example.invalid' and template = 'admin_new_order'
     and dedupe_key = 'order:' || v_order_id::text || ':admin';
  if v_count <> 1 then raise exception 'expected one admin order notification'; end if;

  v_retry := place_order(
    null, 'Test Buyer', 'checkout-test@example.invalid', '03001234567',
    'cod', array[v_variant], array[2], null, null, 'migration-test-key-0001'
  );
  if not coalesce((v_retry->>'duplicate')::boolean, false)
     or v_retry->>'order_id' <> v_first->>'order_id' then
    raise exception 'idempotent retry did not return the existing order';
  end if;
  select stock_qty into v_stock from product_variants where id = v_variant;
  if v_stock <> 1 then raise exception 'retry changed stock'; end if;
  select count(*) into v_count from inventory_movements
   where variant_id = v_variant and reason = 'sale';
  if v_count <> 1 then raise exception 'retry created another stock movement'; end if;

  begin
    perform place_order(
      null, 'Test Buyer', 'checkout-test@example.invalid', '03001234567',
      'cod', array[v_variant], array[2], null, null, 'migration-test-key-0002'
    );
    raise exception 'oversell unexpectedly succeeded';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'insufficient_stock' then raise; end if;
  end;
  select stock_qty into v_stock from product_variants where id = v_variant;
  if v_stock <> 1 then raise exception 'oversell changed stock'; end if;
  select count(*) into v_count from orders;
  if v_count <> 1 then raise exception 'oversell left a partial order'; end if;
  select count(*) into v_count from inventory_movements where variant_id = v_variant;
  if v_count <> 1 then raise exception 'oversell left a partial movement'; end if;

  select count(*) into v_count from claim_outbox_jobs(10);
  if v_count <> 3 then raise exception 'expected customer email, WhatsApp, and admin notification to be claimed'; end if;
  select id into v_job_id from outbox where status = 'processing' order by channel limit 1;
  perform finish_outbox_job(v_job_id, true, null);
  select count(*) into v_count from outbox where status = 'sent' and sent_at is not null;
  if v_count <> 1 then raise exception 'successful provider result was not recorded'; end if;
  select count(*) into v_count from outbox where status = 'processing';
  if v_count <> 1 then raise exception 'uncompleted notification was falsely marked sent'; end if;
end;
$$;

rollback;
