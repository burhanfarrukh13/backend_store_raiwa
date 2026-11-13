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
