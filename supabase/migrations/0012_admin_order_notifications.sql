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
