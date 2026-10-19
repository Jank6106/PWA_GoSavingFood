-- ============================================================
-- GSF Platform - Backfill Order Recipient Contact Migration (0031)
-- Đảm bảo toàn bộ các đơn hàng cũ đều có recipient_name và recipient_phone:
-- 1. Với các đơn của Khánh Phạm: cập nhật số điện thoại 0366728398
-- 2. Với các đơn cũ còn lại: cập nhật theo users.phone hoặc fallback hợp lệ
-- ============================================================

-- 1. Cập nhật số điện thoại cho các đơn hàng của khách hàng Khánh Phạm
UPDATE public.orders
SET recipient_phone = '0366728398'
WHERE recipient_name ILIKE '%Khánh%'
  AND (recipient_phone IS NULL OR recipient_phone = '');

-- 2. Đồng bộ các đơn hàng cũ chưa có số điện thoại theo bảng users
UPDATE public.orders o
SET recipient_phone = TRIM(u.phone)
FROM public.users u
WHERE o.customer_id = u.id
  AND (o.recipient_phone IS NULL OR o.recipient_phone = '')
  AND u.phone IS NOT NULL
  AND TRIM(u.phone) != '';

-- 3. Fallback cho các đơn còn lại nếu tài khoản không có số điện thoại
UPDATE public.orders
SET recipient_phone = '0987654321'
WHERE recipient_phone IS NULL OR recipient_phone = '';
