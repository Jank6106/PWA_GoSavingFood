-- 0024_sync_customer_avatar_and_phone.sql
-- 1. Cập nhật avatar_url và phone từ auth.users sang public.users cho toàn bộ user hiện tại
UPDATE public.users u
SET
  avatar_url = COALESCE(
    u.avatar_url,
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture',
    au.raw_user_meta_data->>'avatar'
  ),
  phone = COALESCE(
    NULLIF(u.phone, ''),
    NULLIF(au.raw_user_meta_data->>'phone', ''),
    NULLIF(au.raw_user_meta_data->>'phone_e164', ''),
    au.phone
  ),
  name = CASE
    WHEN u.name IS NULL OR u.name IN ('Khách hàng', 'New User', '', 'Khách hàng GoSavingFood')
    THEN COALESCE(
      au.raw_user_meta_data->>'name',
      au.raw_user_meta_data->>'full_name',
      u.name
    )
    ELSE u.name
  END
FROM auth.users au
WHERE u.id = au.id;

-- 2. Cập nhật trigger handle_new_user để tự động đồng bộ avatar_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name TEXT;
  v_phone TEXT;
  v_avatar TEXT;
  v_role public.user_role;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'Khách hàng'
  );
  v_phone := NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '');
  v_avatar := NULLIF(COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'avatar',
    ''
  ), '');
  v_role := COALESCE(
    (NEW.raw_app_meta_data->>'role')::public.user_role,
    (NEW.raw_user_meta_data->>'role')::public.user_role,
    'customer'::public.user_role
  );

  INSERT INTO public.users (id, name, email, phone, avatar_url, role, created_at, updated_at)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_phone,
    v_avatar,
    v_role,
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE
      WHEN public.users.name IS NULL OR public.users.name IN ('Khách hàng', 'New User', '') THEN EXCLUDED.name
      ELSE public.users.name
    END,
    phone = COALESCE(public.users.phone, EXCLUDED.phone),
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$function$;

-- 3. Quyền truy cập: cho phép authenticated và anon SELECT public.users (với RLS)
GRANT SELECT ON public.users TO anon, authenticated;

-- 4. RLS Policy để Merchant xem được hồ sơ khách hàng của đơn hàng
DROP POLICY IF EXISTS "Store owners can view their customers" ON public.users;
CREATE POLICY "Store owners can view their customers"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.customer_id = public.users.id
        AND o.deleted_at IS NULL
    )
  );
