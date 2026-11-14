-- 0023_fix_auth_trigger_and_bag_availability.sql
-- 1. Database trigger trên auth.users (AFTER INSERT) để tự động đồng bộ sang public.users (SECURITY DEFINER)
-- 2. Backfill đồng bộ toàn bộ tài khoản cũ đang bị thiếu trong public.users
-- 3. Chuẩn hóa create_order_transaction:
--    - Xóa bỏ hoàn toàn đoạn code chèn user chắp vá trong RPC
--    - Thêm Lazy Cleanup ở đầu hàm: tự động hủy các đơn pending_payment quá hạn 15 phút của túi đó & hoàn tồn kho
--    - Xử lý múi giờ Việt Nam (Asia/Ho_Chi_Minh) cho túi is_daily=true theo pickup_end hôm nay
--    - Báo lỗi BAG_UNAVAILABLE với lý do chi tiết (OUT_OF_STOCK, EXPIRED, INACTIVE) kèm số lượng tồn kho

-- ============================================================================
-- PHẦN 1: TRIGGER ĐỒNG BỘ AUTH USER -> PUBLIC.USERS & BACKFILL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name TEXT;
  v_phone TEXT;
  v_role public.user_role;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'Khách hàng'
  );
  v_phone := NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '');
  v_role := COALESCE(
    (NEW.raw_app_meta_data->>'role')::public.user_role,
    (NEW.raw_user_meta_data->>'role')::public.user_role,
    'customer'::public.user_role
  );

  INSERT INTO public.users (id, name, email, phone, role, created_at, updated_at)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_phone,
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
    updated_at = NOW();

  -- Đảm bảo auth app_metadata có role
  IF NEW.raw_app_meta_data IS NULL OR NOT (NEW.raw_app_meta_data ? 'role') THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role::text)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Gắn trigger tự động đồng bộ trên auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill đồng bộ ngay toàn bộ user cũ trong auth.users chưa có trong public.users
INSERT INTO public.users (id, name, email, phone, role, created_at, updated_at)
SELECT
  id,
  COALESCE(
    raw_user_meta_data->>'name',
    raw_user_meta_data->>'full_name',
    split_part(email, '@', 1),
    'Khách hàng'
  ),
  email,
  NULLIF(COALESCE(raw_user_meta_data->>'phone', ''), ''),
  COALESCE(
    (raw_app_meta_data->>'role')::public.user_role,
    (raw_user_meta_data->>'role')::public.user_role,
    'customer'::public.user_role
  ),
  COALESCE(created_at, NOW()),
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PHẦN 2: CHUẨN HÓA CREATE_ORDER_TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_order_transaction(
  p_id uuid,
  p_customer_id uuid,
  p_store_id uuid,
  p_idempotency_key text,
  p_items jsonb,
  p_voucher_code text,
  p_pickup_time timestamp with time zone,
  p_payment_method text,
  p_note text,
  p_total_original_price integer,
  p_total_discount_price integer,
  p_discount_amount integer,
  p_final_amount integer,
  p_qr_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
  v_expired_order RECORD;
  v_bag_id UUID;
  v_quantity INTEGER;
  v_discount_price INTEGER;
  v_bag_name TEXT;
  v_current_stock INTEGER;
  v_is_available BOOLEAN;
  v_is_daily BOOLEAN;
  v_pickup_start TIME;
  v_pickup_end TIME;
  v_store_id UUID;
  v_voucher_id UUID;
  v_voucher_used_count INTEGER;
  v_voucher_quantity INTEGER;
  v_voucher_is_active BOOLEAN;
  v_voucher_start TIMESTAMPTZ;
  v_voucher_end TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
  v_pickup_token UUID;
  v_normalized_method TEXT;
  v_vn_time TIME;
  v_is_expired BOOLEAN;
BEGIN
  -- 1. Chặn phương thức tiền mặt (100% Online Payment)
  IF p_payment_method = 'cash' THEN
    RAISE EXCEPTION 'CASH_PAYMENT_NOT_SUPPORTED' USING DETAIL = 'GoSavingFood chỉ hỗ trợ thanh toán trực tuyến qua VietQR.';
  END IF;

  v_normalized_method := p_payment_method;
  IF v_normalized_method NOT IN ('banking', 'payos_vietqr', 'momo', 'zalopay') THEN
    v_normalized_method := 'banking';
  END IF;

  -- 2. Idempotency Check
  IF EXISTS (
    SELECT 1 FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = p_customer_id
  ) THEN
    RETURN json_build_object(
      'success', true,
      'is_duplicate', true,
      'order_id', (
        SELECT (response->>'orderId')::UUID
        FROM public.idempotency_keys
        WHERE key = p_idempotency_key AND user_id = p_customer_id
      )
    );
  END IF;

  -- 3. LAZY CLEANUP: Hủy các đơn pending_payment quá hạn 15 phút của chính các túi được đặt
  -- và hoàn trả tồn kho ngay trước khi kiểm tra số lượng
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    FOR v_expired_order IN
      SELECT o.id, o.voucher_code, oi.quantity AS expired_qty
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE oi.bag_id = v_item."bagId"
        AND o.status = 'pending_payment'
        AND o.payment_status = 'pending'
        AND o.payment_expires_at < NOW()
        AND o.deleted_at IS NULL
      FOR UPDATE OF o SKIP LOCKED
    LOOP
      -- Hoàn trả tồn kho cho túi
      UPDATE public.surprise_bags
      SET quantity = quantity + v_expired_order.expired_qty,
          updated_at = NOW()
      WHERE id = v_item."bagId";

      -- Hoàn lại lượt dùng voucher nếu có
      IF v_expired_order.voucher_code IS NOT NULL AND v_expired_order.voucher_code != '' THEN
        UPDATE public.vouchers
        SET used_count = GREATEST(0, used_count - 1),
            updated_at = NOW()
        WHERE code = v_expired_order.voucher_code AND deleted_at IS NULL;
      END IF;

      -- Đánh dấu đơn sang expired
      UPDATE public.orders
      SET status = 'expired'::order_status,
          cancelled_at = NOW(),
          cancel_reason = 'Quá hạn thanh toán 15 phút (Lazy Cleanup)',
          updated_at = NOW(),
          pickup_token = NULL
      WHERE id = v_expired_order.id;
    END LOOP;
  END LOOP;

  -- 4. Khóa & Kiểm tra tồn kho & Múi giờ Việt Nam
  v_vn_time := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    v_bag_id := v_item."bagId";
    v_quantity := v_item.quantity;

    SELECT name, quantity, is_available, discount_price, store_id, expires_at, is_daily, pickup_start, pickup_end
    INTO v_bag_name, v_current_stock, v_is_available, v_discount_price, v_store_id, v_expires_at, v_is_daily, v_pickup_start, v_pickup_end
    FROM public.surprise_bags
    WHERE id = v_bag_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'BAG_NOT_FOUND' USING DETAIL = v_bag_id::TEXT;
    END IF;

    IF v_store_id != p_store_id THEN
      RAISE EXCEPTION 'STORE_MISMATCH' USING DETAIL = v_bag_id::TEXT;
    END IF;

    -- Kiểm tra trạng thái mở bán
    IF NOT v_is_available THEN
      RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
        'bagId', v_bag_id,
        'available', v_current_stock,
        'requested', v_quantity,
        'reason', 'INACTIVE'
      )::TEXT;
    END IF;

    -- Kiểm tra hết hạn theo giờ Việt Nam
    IF COALESCE(v_is_daily, false) THEN
      IF v_pickup_end IS NOT NULL THEN
        IF v_pickup_start IS NOT NULL AND v_pickup_start > v_pickup_end THEN
          v_is_expired := (v_vn_time > v_pickup_end AND v_vn_time < v_pickup_start);
        ELSE
          v_is_expired := (v_vn_time > v_pickup_end);
        END IF;
      ELSE
        v_is_expired := false;
      END IF;
    ELSE
      v_is_expired := (v_expires_at IS NOT NULL AND NOW() > v_expires_at);
    END IF;

    IF v_is_expired THEN
      RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
        'bagId', v_bag_id,
        'available', v_current_stock,
        'requested', v_quantity,
        'reason', 'EXPIRED',
        'pickupEnd', to_char(v_pickup_end, 'HH24:MI')
      )::TEXT;
    END IF;

    -- Kiểm tra số lượng tồn kho
    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
        'bagId', v_bag_id,
        'available', v_current_stock,
        'requested', v_quantity,
        'reason', 'OUT_OF_STOCK'
      )::TEXT;
    END IF;

    -- Trừ kho
    UPDATE public.surprise_bags
    SET quantity = quantity - v_quantity, updated_at = NOW()
    WHERE id = v_bag_id;
  END LOOP;

  -- 5. Khóa & Áp dụng Voucher
  IF p_voucher_code IS NOT NULL AND p_voucher_code != '' THEN
    SELECT id, used_count, quantity, is_active, start_date, end_date
    INTO v_voucher_id, v_voucher_used_count, v_voucher_quantity, v_voucher_is_active, v_voucher_start, v_voucher_end
    FROM public.vouchers
    WHERE code = p_voucher_code AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'VOUCHER_NOT_FOUND' USING DETAIL = p_voucher_code; END IF;
    IF NOT v_voucher_is_active THEN RAISE EXCEPTION 'VOUCHER_INACTIVE' USING DETAIL = p_voucher_code; END IF;
    IF NOW() < v_voucher_start OR NOW() > v_voucher_end THEN RAISE EXCEPTION 'VOUCHER_EXPIRED' USING DETAIL = p_voucher_code; END IF;
    IF v_voucher_used_count >= v_voucher_quantity THEN RAISE EXCEPTION 'VOUCHER_USAGE_LIMIT' USING DETAIL = p_voucher_code; END IF;
    IF EXISTS (
      SELECT 1 FROM public.orders
      WHERE customer_id = p_customer_id AND voucher_code = p_voucher_code
        AND status NOT IN ('cancelled', 'expired') AND deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'VOUCHER_ALREADY_USED' USING DETAIL = p_voucher_code; END IF;

    UPDATE public.vouchers
    SET used_count = used_count + 1, updated_at = NOW()
    WHERE id = v_voucher_id;
  END IF;

  v_pickup_token := gen_random_uuid();

  -- 6. Tạo đơn với status = pending_payment, TTL 15 phút và pickup_token
  INSERT INTO public.orders (
    id, customer_id, store_id, total_original_price, total_discount_price,
    discount_amount, final_amount, voucher_code, status,
    payment_method, payment_status, qr_code, pickup_time, note,
    payment_expires_at, pickup_token, created_at, updated_at
  ) VALUES (
    p_id, p_customer_id, p_store_id, p_total_original_price, p_total_discount_price,
    p_discount_amount, p_final_amount, p_voucher_code, 'pending_payment'::order_status,
    v_normalized_method::payment_method, 'pending'::payment_status, p_qr_code, p_pickup_time, p_note,
    NOW() + INTERVAL '15 minutes', v_pickup_token, NOW(), NOW()
  );

  -- 7. Chi tiết đơn hàng
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    SELECT name, discount_price INTO v_bag_name, v_discount_price
    FROM public.surprise_bags WHERE id = v_item."bagId";

    INSERT INTO public.order_items (id, order_id, bag_id, bag_name, quantity, unit_price, total_price, created_at)
    VALUES (gen_random_uuid(), p_id, v_item."bagId", v_bag_name, v_item.quantity, v_discount_price, v_discount_price * v_item.quantity, NOW());
  END LOOP;

  -- 8. Lưu idempotency key
  INSERT INTO public.idempotency_keys (id, user_id, key, request_hash, response, expires_at, created_at)
  VALUES (gen_random_uuid(), p_customer_id, p_idempotency_key, p_idempotency_key, json_build_object('orderId', p_id), NOW() + INTERVAL '7 days', NOW());

  RETURN json_build_object(
    'success', true,
    'is_duplicate', false,
    'order_id', p_id,
    'pickup_token', v_pickup_token,
    'status', 'pending_payment'
  );
END;
$function$;

-- ============================================================================
-- PHẦN 3: WRAPPER RPC PLACE_ORDER (SẠCH SẼ, CHUẨN KIẾN TRÚC)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.place_order(
  p_id uuid,
  p_store_id uuid,
  p_idempotency_key text,
  p_items jsonb,
  p_voucher_code text,
  p_pickup_time timestamp with time zone,
  p_payment_method text,
  p_note text,
  p_total_original_price integer,
  p_total_discount_price integer,
  p_discount_amount integer,
  p_final_amount integer,
  p_qr_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  RETURN public.create_order_transaction(
    p_id,
    auth.uid(),
    p_store_id,
    p_idempotency_key,
    p_items,
    p_voucher_code,
    p_pickup_time,
    p_payment_method,
    p_note,
    p_total_original_price,
    p_total_discount_price,
    p_discount_amount,
    p_final_amount,
    p_qr_code
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.place_order(
  uuid, uuid, text, jsonb, text, timestamp with time zone, text, text,
  integer, integer, integer, integer, text
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_order_transaction(
  uuid, uuid, uuid, text, jsonb, text, timestamp with time zone, text, text,
  integer, integer, integer, integer, text
) TO authenticated, service_role;
