-- ==============================================================================
-- MIGRATION 0038: THÊM CỘT is_hidden VÀ TẠO MÃ VOUCHER ẨN TMU2026 (0 ĐỒNG)
-- ==============================================================================
-- 1. Bổ sung cột is_hidden boolean DEFAULT false vào bảng vouchers
-- 2. Tạo mã voucher TMU2026:
--    - discount_value = 1000000 (giảm tối đa 1.000.000đ -> đưa đơn về 0đ)
--    - min_order_value = 0 (áp dụng cho mọi đơn hàng)
--    - is_hidden = true (ẩn khỏi danh sách hiển thị có sẵn, bắt buộc tự nhập mã)
--    - is_active = true
--    - Mỗi tài khoản chỉ dùng được 1 lần (đã được kiểm tra qua create_order_transaction)
-- ==============================================================================

ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

INSERT INTO public.vouchers (
  id, code, description, discount_type, discount_value, min_order_value, quantity, used_count, is_active, is_hidden, start_date, end_date, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'TMU2026',
  'Ưu đãi đặc biệt TMU 2026 - Giảm 100% đơn hàng',
  'fixed',
  1000000,
  0,
  99999,
  0,
  true,
  true,
  NOW() - INTERVAL '1 hour',
  NOW() + INTERVAL '10 years',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = 'fixed',
  discount_value = 1000000,
  min_order_value = 0,
  is_active = true,
  is_hidden = true,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  updated_at = NOW();
