-- 0037_storage_buckets_and_bag_images.sql
-- Chuyển toàn bộ lưu trữ ảnh sang Supabase Storage, database chỉ lưu public URL

-- 1. Tạo và cấu hình các Storage Buckets công khai (bag-photos, bag-images, store-logos, store-assets, avatars)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('bag-photos', 'bag-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('bag-images', 'bag-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('store-logos', 'store-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('store-assets', 'store-assets', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Thiết lập RLS Policies cho storage.objects
-- Cho phép bất kỳ ai (public) có thể xem/đọc ảnh từ các buckets này
DROP POLICY IF EXISTS "Public can view images in storage" ON storage.objects;
CREATE POLICY "Public can view images in storage"
ON storage.objects FOR SELECT
USING (bucket_id IN ('bag-photos', 'bag-images', 'store-logos', 'store-assets', 'avatars'));

-- Cho phép người dùng tải ảnh lên các buckets này
DROP POLICY IF EXISTS "Allow upload images to storage" ON storage.objects;
CREATE POLICY "Allow upload images to storage"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('bag-photos', 'bag-images', 'store-logos', 'store-assets', 'avatars'));

-- Cho phép cập nhật ảnh
DROP POLICY IF EXISTS "Allow update images in storage" ON storage.objects;
CREATE POLICY "Allow update images in storage"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('bag-photos', 'bag-images', 'store-logos', 'store-assets', 'avatars'));

-- Cho phép xóa ảnh
DROP POLICY IF EXISTS "Allow delete images in storage" ON storage.objects;
CREATE POLICY "Allow delete images in storage"
ON storage.objects FOR DELETE
USING (bucket_id IN ('bag-photos', 'bag-images', 'store-logos', 'store-assets', 'avatars'));

-- 3. Dọn dẹp dữ liệu Base64 trong Database (chỉ giữ URL CDN/Storage sạch sẽ)
-- Làm sạch bảng surprise_bags:
UPDATE public.surprise_bags
SET image_url = CASE
  WHEN category ILIKE '%chay%' OR category ILIKE '%vegan%' OR category ILIKE '%salad%'
    THEN 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80'
  WHEN category ILIKE '%uống%' OR category ILIKE '%beverage%' OR category ILIKE '%coffee%' OR category ILIKE '%cà phê%'
    THEN 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'
  WHEN category ILIKE '%trái cây%' OR category ILIKE '%fruit%'
    THEN 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80'
  WHEN category ILIKE '%cơm%' OR category ILIKE '%meal%'
    THEN 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  ELSE 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
END
WHERE image_url LIKE 'data:%' OR length(image_url) > 1000;

-- Làm sạch bảng stores:
UPDATE public.stores
SET logo_url = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80'
WHERE logo_url LIKE 'data:%' OR length(logo_url) > 1000;

UPDATE public.stores
SET banner_url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80'
WHERE banner_url LIKE 'data:%' OR length(banner_url) > 1000;

-- Làm sạch bảng users:
UPDATE public.users
SET avatar_url = NULL
WHERE avatar_url LIKE 'data:%' OR length(avatar_url) > 1000;

-- 4. Ràng buộc bảo vệ (Database Constraint) để không bao giờ cho phép lưu chuỗi Base64
ALTER TABLE public.surprise_bags DROP CONSTRAINT IF EXISTS check_surprise_bags_image_not_base64;
ALTER TABLE public.surprise_bags ADD CONSTRAINT check_surprise_bags_image_not_base64
  CHECK (image_url IS NULL OR NOT (image_url LIKE 'data:%'));

ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS check_stores_logo_not_base64;
ALTER TABLE public.stores ADD CONSTRAINT check_stores_logo_not_base64
  CHECK (logo_url IS NULL OR NOT (logo_url LIKE 'data:%'));

ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS check_stores_banner_not_base64;
ALTER TABLE public.stores ADD CONSTRAINT check_stores_banner_not_base64
  CHECK (banner_url IS NULL OR NOT (banner_url LIKE 'data:%'));
