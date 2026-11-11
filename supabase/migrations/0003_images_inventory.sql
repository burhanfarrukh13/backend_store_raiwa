-- 0003_images_inventory.sql

-- ---------- Product Images ----------
create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url        text not null,
  alt_text   text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index product_images_product_idx on product_images (product_id) where deleted_at is null;

-- ---------- Media Assets (general file uploads) ----------
create table media_assets (
  id              uuid primary key default gen_random_uuid(),
  file_name       text not null,
  original_name   text not null,
  bucket          text not null,       -- storage bucket name
  path            text not null,       -- object path in storage
  mime_type       text not null,
  alt_text        text,
  sort_order      int not null default 0,
  product_id      uuid references product_images(id) on delete set null,
  status          text not null default 'active' check (status in ('active','deleted')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index media_assets_product_idx on media_assets (product_id) where deleted_at is null;
create index media_assets_bucket_idx on media_assets (bucket) where deleted_at is null;

-- ---------- Inventory Movements (ledger) ----------
create table inventory_movements (
  id         uuid primary key default gen_random_uuid(),
  variant_id uuid references product_variants(id) on delete cascade,
  delta      int not null,        -- positive = in, negative = out
  reason     text not null,       -- e.g. 'sale', 'return', 'adjustment', 'restock'
  notes      text,
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on inventory_movements (variant_id) where deleted_at is null;

-- ---------- Stock adjustment trigger: runs after insert, adjusts stock based on delta sign ----------
-- Positive delta = increment stock, Negative delta = decrement stock
create or replace function adjust_stock_from_movement()
returns trigger language plpgsql as $$
begin
  update product_variants
  set stock_qty = greatest(stock_qty + new.delta, 0),
      updated_at = now()
  where id = new.variant_id;
  return new;
end $$;

create trigger inventory_movement_trigger
after insert on inventory_movements
for each row
execute procedure adjust_stock_from_movement();

-- ---------- RLS policies ----------
-- Enable RLS on all relevant tables
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table categories enable row level security;
alter table collections enable row level security;
alter table suppliers enable row level security;
alter table store_settings enable row level security;
alter table staff_profiles enable row level security;
alter table inventory_movements enable row level security;

-- Staff RLS policies: read/write/delete based on role
create policy staff_crud on products for all to authenticated
  using (public.has_role(array('owner','manager','support','accountant')))
  with check (public.has_role(array('owner','manager','support','accountant')));

create policy staff_crud on product_variants for all to authenticated
  using (public.has_role(array('owner','manager','support','accountant')))
  with check (public.has_role(array('owner','manager','support','accountant')));

create policy staff_crud on product_images for all to authenticated
  using (public.has_role(array('owner','manager','support','accountant')))
  with check (public.has_role(array('owner','manager','support','accountant')));

create policy staff_crud on categories for all to authenticated
  using (public.has_role(array('owner','manager','support','accountant')))
  with check (public.has_role(array('owner','manager','support','accountant')));

create policy staff_crud on collections for all to authenticated
  using (public.has_role(array('owner','manager','support','accountant')))
  with check (public.has_role(array('owner','manager','support','accountant')));

create policy staff_crud on suppliers for all to authenticated
  using (public.has_role(array('owner','manager','support','accountant')))
  with check (public.has_role(array('owner','manager','support','accountant')));

create policy staff_crud on store_settings for all to authenticated
  using (public.has_role(array('owner','manager')))
  with check (public.has_role(array('owner','manager')));

create policy staff_crud on staff_profiles for all to authenticated
  using (public.has_role(array('owner','manager','support','accountant')))
  with check (public.has_role(array('owner','manager','support','accountant')));

create policy staff_crud on inventory_movements for all to authenticated
  using (public.has_role(array('owner','manager','support','accountant')))
  with check (public.has_role(array('owner','manager','support','accountant')));

-- anon receives no SQL table, view, sequence, or function privileges.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;