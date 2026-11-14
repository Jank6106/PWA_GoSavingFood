-- Migration: 0034_allow_user_profile_update.sql
-- Cấp quyền UPDATE và INSERT trên public.users cho authenticated users để cập nhật hồ sơ cá nhân
GRANT SELECT, UPDATE, INSERT ON public.users TO authenticated;

-- Đảm bảo RLS policy cho phép user cập nhật hồ sơ chính mình
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Đảm bảo RLS policy cho phép user tự thêm hồ sơ chính mình nếu chưa có
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Đảm bảo RLS policy cho phép user tự đọc hồ sơ chính mình
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
