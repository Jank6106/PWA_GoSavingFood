-- Migration 0016: Hỗ trợ xóa tài khoản người dùng vĩnh viễn (User Account Deletion)
-- Xóa toàn bộ dữ liệu liên quan trong public schema và auth.users để giải phóng Email & SĐT

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Lấy user_id từ tham số hoặc từ context phiên đăng nhập hiện tại
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Không xác định được danh tính tài khoản cần xóa.');
  END IF;

  -- 1. Xóa thông báo, đánh giá, khiếu nại, idempotency keys
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.reviews WHERE customer_id = v_user_id;
  DELETE FROM public.issues WHERE reporter_id = v_user_id;
  DELETE FROM public.idempotency_keys WHERE user_id = v_user_id;

  -- 2. Xóa đơn hàng của khách hàng (gồm cả order_items)
  DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE customer_id = v_user_id);
  DELETE FROM public.orders WHERE customer_id = v_user_id;

  -- 3. Nếu là tài khoản đối tác bán buôn: Xóa order_items, orders, túi hàng và store
  DELETE FROM public.order_items WHERE order_id IN (
    SELECT id FROM public.orders WHERE store_id IN (SELECT id FROM public.stores WHERE owner_user_id = v_user_id)
  );
  DELETE FROM public.orders WHERE store_id IN (
    SELECT id FROM public.stores WHERE owner_user_id = v_user_id
  );
  DELETE FROM public.surprise_bags WHERE store_id IN (
    SELECT id FROM public.stores WHERE owner_user_id = v_user_id
  );
  DELETE FROM public.stores WHERE owner_user_id = v_user_id;

  -- 4. Xóa hồ sơ trong public.users
  DELETE FROM public.users WHERE id = v_user_id;

  -- 5. Xóa tài khoản vĩnh viễn trong auth.users để giải phóng email & số điện thoại
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Đã xóa tài khoản vĩnh viễn khỏi hệ thống.');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_user_by_identifier(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_clean text;
BEGIN
  IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Thiếu thông tin tài khoản.');
  END IF;

  v_clean := regexp_replace(trim(p_identifier), '[^0-9]', '', 'g');
  IF starts_with(v_clean, '84') AND length(v_clean) >= 11 THEN
    v_clean := '0' || substring(v_clean from 3);
  END IF;

  -- Tìm user theo email hoặc số điện thoại trong public.users
  SELECT id INTO v_user_id
  FROM public.users
  WHERE lower(trim(email)) = lower(trim(p_identifier))
     OR (v_clean <> '' AND (phone = v_clean OR regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_clean))
  ORDER BY created_at DESC
  LIMIT 1;

  -- Nếu không thấy trong public.users, tìm trong auth.users
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(trim(email)) = lower(trim(p_identifier))
       OR (v_clean <> '' AND (phone = v_clean OR phone = ('+84' || substring(v_clean from 2))))
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy tài khoản tương ứng.');
  END IF;

  RETURN public.delete_user_account(v_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_identifier(text) TO anon, authenticated, service_role;
