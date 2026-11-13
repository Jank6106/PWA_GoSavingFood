-- 0034_enhance_auth_trigger_and_avatar.sql
-- Cải tiến trigger handle_new_user:
-- 1. Tự động đồng bộ ảnh đại diện từ Google OAuth (avatar_url / picture) sang public.users.avatar_url
-- 2. Chuẩn hóa số điện thoại (chuyển chuỗi rỗng thành NULL)
-- 3. Hỗ trợ đầy đủ phân định role (merchant, admin, customer)
-- 4. ON CONFLICT cập nhật lại avatar_url và name nếu người dùng đăng nhập lại

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_phone text;
  v_avatar text;
  v_role user_role;
  v_existing_id uuid;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'Khách hàng'
  );
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'avatar',
    NULL
  );
  
  -- Determine role
  IF NEW.raw_user_meta_data->>'role' = 'merchant' THEN
    v_role := 'merchant';
  ELSIF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    v_role := 'admin';
  ELSE
    v_role := 'customer';
  END IF;

  SELECT id INTO v_existing_id FROM public.users WHERE email = NEW.email LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    -- Nhờ ON UPDATE CASCADE, cập nhật users.id sẽ tự động cập nhật mọi bảng phụ thuộc
    UPDATE public.users 
    SET id = NEW.id,
        name = v_name,
        phone = COALESCE(v_phone, phone),
        avatar_url = COALESCE(v_avatar, avatar_url),
        role = COALESCE(v_role, role),
        updated_at = NOW() 
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.users (id, email, name, phone, avatar_url, role, created_at, updated_at)
    VALUES (NEW.id, NEW.email, v_name, v_phone, v_avatar, v_role, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name,
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
      phone = COALESCE(EXCLUDED.phone, public.users.phone),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$function$;
