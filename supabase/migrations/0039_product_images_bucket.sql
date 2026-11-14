-- 0038_product_images_bucket.sql
-- Create dedicated product-images bucket for authentic food surplus photography

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: Public read access for product images
DROP POLICY IF EXISTS "Public can view product-images" ON storage.objects;
CREATE POLICY "Public can view product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- RLS: Allow uploads and updates to product-images
DROP POLICY IF EXISTS "Allow upload to product-images" ON storage.objects;
CREATE POLICY "Allow upload to product-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow update to product-images" ON storage.objects;
CREATE POLICY "Allow update to product-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow delete from product-images" ON storage.objects;
CREATE POLICY "Allow delete from product-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');
