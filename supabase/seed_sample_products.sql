-- =====================================================================
-- Seed Sample Products, Categories, and Inventory for Baytak Noor
-- Optional: Run in Supabase SQL Editor to see live products on your storefront.
-- =====================================================================

-- 1. Categories
insert into categories (id, name, slug, description, status, sort_order, featured)
values
  ('11111111-0000-0000-0000-000000000001', 'Duvet Covers', 'duvet-covers', 'Luxury hotel-grade duvet sets', 'active', 1, true),
  ('11111111-0000-0000-0000-000000000002', 'Bed Sheets', 'bed-sheets', '100% Egyptian and sateen cotton sheets', 'active', 2, true),
  ('11111111-0000-0000-0000-000000000003', 'Pillowcases', 'pillowcases', 'Silky soft pillowcase pairs', 'active', 3, false),
  ('11111111-0000-0000-0000-000000000004', 'Comforters & Throws', 'comforters', 'All-season microfiber comforters', 'active', 4, false)
on conflict do nothing;

-- 2. Products
insert into products (id, name, slug, sku, description, price, compare_at_price, status, featured)
values
  (
    '22222222-0000-0000-0000-000000000001',
    'Royal Sateen Duvet Set — Pearl White',
    'royal-sateen-duvet-pearl-white',
    'BN-DUV-WHT-K',
    'Crafted from 400-thread-count long-staple cotton with a silky sateen finish for cooling night-long comfort.',
    7499.00,
    8999.00,
    'active',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    'Heritage Linen Fitted Bed Sheet — Natural Beige',
    'heritage-linen-fitted-sheet-beige',
    'BN-SHT-BGE-K',
    'Woven from premium Belgian flax linen with deep elasticated pockets that stay in place all night.',
    4999.00,
    5999.00,
    'active',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    'Cloud-Soft Down Alternative Pillowcases (Pair)',
    'cloud-soft-pillowcases-pair',
    'BN-PIL-WHT-2P',
    'Pair of hypoallergenic pillowcases with envelope closure, resisting wrinkles and overheating.',
    1999.00,
    2499.00,
    'active',
    false
  ),
  (
    '22222222-0000-0000-0000-000000000004',
    'All-Season Microfiber Comforter — Charcoal Grey',
    'all-season-microfiber-comforter-grey',
    'BN-COM-GRY-K',
    'Lightweight yet warm box-stitched quilt that will not clump or shift in the wash.',
    6499.00,
    7999.00,
    'active',
    true
  )
on conflict do nothing;

-- 3. Link Products to Categories
insert into product_categories (product_id, category_id)
values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004')
on conflict do nothing;

-- 4. Product Variants
insert into product_variants (id, product_id, sku, size, color, price, stock_qty)
values
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'BN-DUV-WHT-K', 'King', 'Pearl White', 7499.00, 0),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'BN-SHT-BGE-K', 'King', 'Natural Beige', 4999.00, 0),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', 'BN-PIL-WHT-2P', 'Standard', 'White', 1999.00, 0),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000004', 'BN-COM-GRY-K', 'King', 'Charcoal Grey', 6499.00, 0)
on conflict do nothing;

-- 5. Initial Inventory Movements (trigger updates variant stock_qty automatically)
insert into inventory_movements (variant_id, delta, reason, notes)
values
  ('33333333-0000-0000-0000-000000000001', 25, 'restock', 'Initial stock intake'),
  ('33333333-0000-0000-0000-000000000002', 30, 'restock', 'Initial stock intake'),
  ('33333333-0000-0000-0000-000000000003', 50, 'restock', 'Initial stock intake'),
  ('33333333-0000-0000-0000-000000000004', 20, 'restock', 'Initial stock intake');

-- 6. Product Images (Placeholder / UI assets)
insert into product_images (product_id, url, alt_text, sort_order)
values
  ('22222222-0000-0000-0000-000000000001', 'assets/logo.png', 'Royal Sateen Duvet Set Pearl White', 1),
  ('22222222-0000-0000-0000-000000000002', 'assets/logo.png', 'Heritage Linen Fitted Bed Sheet', 1),
  ('22222222-0000-0000-0000-000000000003', 'assets/logo.png', 'Cloud-Soft Down Alternative Pillowcases', 1),
  ('22222222-0000-0000-0000-000000000004', 'assets/logo.png', 'All-Season Microfiber Comforter', 1)
on conflict do nothing;
