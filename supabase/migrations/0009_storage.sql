-- 0009_storage.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media',          'media',          true,  5242880, array['image/jpeg','image/png','image/webp','image/avif']),
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('review-photos',  'review-photos',  false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- media: public read; uploads/deletes are authorized by the Vercel API
create policy media_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');

-- Private bucket reads/writes are performed by the Vercel API or signed URLs it issues.
-- Approved review photos are copied into "media" (or served via signed URLs) by the moderation action.
-- (No policies for payment-proofs or review-photos from anon; API-owned)