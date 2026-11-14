-- 0022_store_logos_and_banners.sql
-- Bổ sung và cập nhật dữ liệu ảnh đại diện (logo_url) và ảnh bìa (banner_url)
-- cho toàn bộ cửa hàng (stores) với các tham số nén WebP/CDN tối ưu

-- 1. Đảm bảo cấu trúc cột chuẩn trong bảng stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2. Cập nhật ảnh đại diện và ảnh bìa cho các quán cụ thể theo phong cách / loại món
-- Bánh mì Sài Gòn
UPDATE public.stores
SET
  logo_url = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=300&q=80',
  banner_url = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=1000&q=80'
WHERE name ILIKE '%Bánh Mì Sài Gòn%';

-- Tiệm Bánh Hướng Dương
UPDATE public.stores
SET
  logo_url = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80',
  banner_url = 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1000&q=80'
WHERE name ILIKE '%Hướng Dương%';

-- Quán Chay Quýt
UPDATE public.stores
SET
  logo_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
  banner_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80'
WHERE name ILIKE '%Chay Quýt%' OR name ILIKE '%chay%';

-- Cà Phê Sài Gòn Phố
UPDATE public.stores
SET
  logo_url = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80',
  banner_url = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80'
WHERE name ILIKE '%Cà Phê%' OR name ILIKE '%Coffee%';

-- GoGreen Bakery
UPDATE public.stores
SET
  logo_url = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80',
  banner_url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80'
WHERE name ILIKE '%GoGreen%';

-- 3. Gán fallback link nén chất lượng cao cho bất kỳ quán nào chưa có ảnh hoặc link cũ chưa nén
UPDATE public.stores
SET
  logo_url = COALESCE(
    NULLIF(logo_url, ''),
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80'
  ),
  banner_url = COALESCE(
    NULLIF(banner_url, ''),
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80'
  );

-- Đảm bảo tất cả link ảnh unsplash hiện tại được gắn tham số auto=format và kích thước chuẩn
UPDATE public.stores
SET
  logo_url = regexp_replace(logo_url, '\?.*$', '') || '?auto=format&fit=crop&w=300&q=80'
WHERE logo_url LIKE '%images.unsplash.com%' AND logo_url NOT LIKE '%w=300%';

UPDATE public.stores
SET
  banner_url = regexp_replace(banner_url, '\?.*$', '') || '?auto=format&fit=crop&w=1000&q=80'
WHERE banner_url LIKE '%images.unsplash.com%' AND banner_url NOT LIKE '%w=1000%';
