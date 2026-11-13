-- 0033_allow_shared_phone_across_accounts.sql
-- Cho phép nhiều tài khoản (ví dụ tài khoản cá nhân & công việc/trường học)
-- có thể dùng chung cùng một số điện thoại nhận hàng và hồ sơ người dùng.
-- Ràng buộc UNIQUE(phone) trên public.users được gỡ bỏ;
-- Index tìm kiếm idx_users_phone vẫn được giữ nguyên để tối ưu hiệu năng truy vấn.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_key;

-- Cập nhật SĐT nhận hàng cho tài khoản 24020175@vnu.edu.vn nếu đang trống
UPDATE public.users
SET phone = '0366666666', updated_at = NOW()
WHERE email = '24020175@vnu.edu.vn' AND (phone IS NULL OR TRIM(phone) = '');
