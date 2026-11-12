-- 0005_coupons.sql

-- ---------- Coupons ----------
create table coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
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