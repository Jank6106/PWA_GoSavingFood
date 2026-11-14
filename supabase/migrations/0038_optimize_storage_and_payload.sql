-- 0038_optimize_storage_and_payload.sql
-- Tối ưu hóa lưu trữ ảnh, giới hạn payload database và bổ sung covering index

-- 1. Giới hạn độ dài URL ảnh trong Database (< 500 ký tự), ngăn chặn rò rỉ Base64 hoặc chuỗi rác
ALTER TABLE public.surprise_bags DROP CONSTRAINT IF EXISTS check_surprise_bags_image_len;
ALTER TABLE public.surprise_bags ADD CONSTRAINT check_surprise_bags_image_len
  CHECK (image_url IS NULL OR length(image_url) <= 500);

ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS check_stores_logo_len;
ALTER TABLE public.stores ADD CONSTRAINT check_stores_logo_len
  CHECK (logo_url IS NULL OR length(logo_url) <= 500);

ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS check_stores_banner_len;
ALTER TABLE public.stores ADD CONSTRAINT check_stores_banner_len
  CHECK (banner_url IS NULL OR length(banner_url) <= 500);

-- 2. Tối ưu Storage Buckets: Giới hạn kích thước file và chỉ cho phép định dạng ảnh
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id IN ('bag-photos', 'bag-images', 'store-logos', 'avatars');

UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'store-assets';

-- 3. Tạo Covering Index (Index-Only Scan) cho danh mục túi hàng
-- Cho phép truy vấn quét túi mà không cần đọc bảng heap, tối ưu I/O đĩa
CREATE INDEX IF NOT EXISTS idx_bags_covering_catalog
  ON public.surprise_bags (store_id, is_available, quantity, discount_price)
  INCLUDE (id, name, category, image_url)
  WHERE (deleted_at IS NULL);
