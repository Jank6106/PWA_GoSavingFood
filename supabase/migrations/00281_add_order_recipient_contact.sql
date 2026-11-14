-- 0028_add_order_recipient_contact.sql
-- Thêm cột recipient_name và recipient_phone vào bảng orders để lưu chính xác thông tin người nhận nhập tại trang thanh toán.
-- Cập nhật create_order_transaction và place_order để hỗ trợ p_recipient_name và p_recipient_phone.

-- 1. Thêm cột recipient_name và recipient_phone vào public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT;

-- 2. Drop signature cũ để tránh xung đột PostgREST RPC overload
DROP FUNCTION IF EXISTS public.place_order(uuid, uuid, text, jsonb, text, timestamp with time zone, text, text, integer, integer, integer, integer, text);
DROP FUNCTION IF EXISTS public.create_order_transaction(uuid, uuid, uuid, text, jsonb, text, timestamp with time zone, text, text, integer, integer, integer, integer, text);

-- 3. Tạo hàm create_order_transaction có hỗ trợ p_recipient_name và p_recipient_phone
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
  p_qr_code text,
  p_recipient_name text DEFAULT NULL,
  p_recipient_phone text DEFAULT NULL
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
  v_bag_name TEXT;
  v_discount_price INTEGER;
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

  -- 2. Idempotency Check qua bảng public.idempotency_keys
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

  -- 3. LAZY CLEANUP: Hủy các đơn pending_payment quá hạn 33 phút của chính các túi được đặt
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
      UPDATE public.surprise_bags
      SET quantity = quantity + v_expired_order.expired_qty,
          updated_at = NOW()
      WHERE id = v_item."bagId";

      IF v_expired_order.voucher_code IS NOT NULL AND v_expired_order.voucher_code != '' THEN
        UPDATE public.vouchers
        SET used_count = GREATEST(0, used_count - 1),
            updated_at = NOW()
        WHERE code = v_expired_order.voucher_code AND deleted_at IS NULL;
      END IF;

      UPDATE public.orders
      SET status = 'expired'::order_status,
          cancelled_at = NOW(),
          cancel_reason = 'Quá hạn thanh toán 30 phút (Lazy Cleanup)',
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

    IF NOT v_is_available THEN
      RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
        'bagId', v_bag_id,
        'available', v_current_stock,
        'requested', v_quantity,
        'reason', 'INACTIVE'
      )::TEXT;
    END IF;

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

    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
        'bagId', v_bag_id,
        'available', v_current_stock,
        'requested', v_quantity,
        'reason', 'OUT_OF_STOCK'
      )::TEXT;
    END IF;

    UPDATE public.surprise_bags
    SET quantity = quantity - v_quantity,
        updated_at = NOW()
    WHERE id = v_bag_id;
  END LOOP;

  -- 5. Kiểm tra voucher
  IF p_voucher_code IS NOT NULL AND p_voucher_code != '' THEN
    SELECT id, used_count, quantity, is_active, valid_from, valid_until
    INTO v_voucher_id, v_voucher_used_count, v_voucher_quantity, v_voucher_is_active, v_voucher_start, v_voucher_end
    FROM public.vouchers
    WHERE code = p_voucher_code AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'VOUCHER_NOT_FOUND' USING DETAIL = p_voucher_code; END IF;
    IF NOT v_voucher_is_active THEN RAISE EXCEPTION 'VOUCHER_INACTIVE' USING DETAIL = p_voucher_code; END IF;
    IF v_voucher_start IS NOT NULL AND NOW() < v_voucher_start THEN RAISE EXCEPTION 'VOUCHER_NOT_STARTED' USING DETAIL = p_voucher_code; END IF;
    IF v_voucher_end IS NOT NULL AND NOW() > v_voucher_end THEN RAISE EXCEPTION 'VOUCHER_EXPIRED' USING DETAIL = p_voucher_code; END IF;
    IF v_voucher_quantity IS NOT NULL AND v_voucher_used_count >= v_voucher_quantity THEN RAISE EXCEPTION 'VOUCHER_USAGE_LIMIT' USING DETAIL = p_voucher_code; END IF;

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

  -- 6. Tạo đơn với status = pending_payment, TTL 33 phút (30m + 3m grace), pickup_token và thông tin người nhận
  INSERT INTO public.orders (
    id, customer_id, store_id, total_original_price, total_discount_price,
    discount_amount, final_amount, voucher_code, status,
    payment_method, payment_status, qr_code, pickup_time, note,
    payment_expires_at, pickup_token, recipient_name, recipient_phone, created_at, updated_at
  ) VALUES (
    p_id, p_customer_id, p_store_id, p_total_original_price, p_total_discount_price,
    p_discount_amount, p_final_amount, p_voucher_code, 'pending_payment'::order_status,
    v_normalized_method::payment_method, 'pending'::payment_status, p_qr_code, p_pickup_time, p_note,
    NOW() + INTERVAL '33 minutes', v_pickup_token, p_recipient_name, p_recipient_phone, NOW(), NOW()
  );

  -- 7. Đồng bộ SĐT người nhận vào hồ sơ public.users nếu hồ sơ chưa có số
  IF p_recipient_phone IS NOT NULL AND TRIM(p_recipient_phone) != '' THEN
    UPDATE public.users
    SET phone = TRIM(p_recipient_phone),
        updated_at = NOW()
    WHERE id = p_customer_id
      AND (phone IS NULL OR TRIM(phone) = '');
  END IF;

  -- 8. Chi tiết đơn hàng
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    SELECT name, discount_price INTO v_bag_name, v_discount_price
    FROM public.surprise_bags WHERE id = v_item."bagId";

    INSERT INTO public.order_items (id, order_id, bag_id, bag_name, quantity, unit_price, total_price, created_at)
    VALUES (gen_random_uuid(), p_id, v_item."bagId", v_bag_name, v_item.quantity, v_discount_price, v_discount_price * v_item.quantity, NOW());
  END LOOP;

  -- 9. Lưu idempotency key vào bảng idempotency_keys
  INSERT INTO public.idempotency_keys (id, user_id, key, request_hash, response, expires_at, created_at)
  VALUES (gen_random_uuid(), p_customer_id, p_idempotency_key, p_idempotency_key, json_build_object('orderId', p_id), NOW() + INTERVAL '7 days', NOW());

  RETURN json_build_object(
    'success', true,
    'is_duplicate', false,
    'order_id', p_id,
    'pickup_token', v_pickup_token,
    'expires_at', NOW() + INTERVAL '33 minutes',
    'status', 'pending_payment'
  );
END;
$function$;

-- 4. Wrapper place_order gọi create_order_transaction và auto-heal user nếu cần
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
  p_qr_code text,
  p_recipient_name text DEFAULT NULL,
  p_recipient_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_email text;
  v_caller_name text;
  v_caller_phone text;
  v_customer_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_customer_id := auth.uid();

  -- Tự động đảm bảo user tồn tại trong public.users
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_customer_id) THEN
    SELECT email,
           COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
           COALESCE(raw_user_meta_data->>'phone', '')
    INTO v_caller_email, v_caller_name, v_caller_phone
    FROM auth.users
    WHERE id = v_customer_id;

    INSERT INTO public.users (id, role, name, email, phone, created_at, updated_at)
    VALUES (
      v_customer_id,
      'customer',
      COALESCE(p_recipient_name, v_caller_name, 'Khách hàng'),
      COALESCE(v_caller_email, v_customer_id::text || '@placeholder.gsf'),
      COALESCE(p_recipient_phone, v_caller_phone, ''),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
  END IF;

  RETURN public.create_order_transaction(
    p_id,
    v_customer_id,
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
    p_qr_code,
    p_recipient_name,
    p_recipient_phone
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.place_order(
  uuid, uuid, text, jsonb, text, timestamp with time zone, text, text,
  integer, integer, integer, integer, text, text, text
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_order_transaction(
  uuid, uuid, uuid, text, jsonb, text, timestamp with time zone, text, text,
  integer, integer, integer, integer, text, text, text
) TO authenticated, service_role;

-- 5. Backfill dữ liệu người nhận cho các đơn hàng cũ
UPDATE public.orders o
SET recipient_name = COALESCE(o.recipient_name, u.name, 'Khách hàng'),
    recipient_phone = COALESCE(o.recipient_phone, u.phone)
FROM public.users u
WHERE o.customer_id = u.id
  AND (o.recipient_name IS NULL OR o.recipient_phone IS NULL);

-- Đơn kiểm thử b546e97f-1282-4a4d-a2fd-1ee97dbc126a từ phản hồi người dùng
UPDATE public.orders
SET recipient_name = COALESCE(recipient_name, 'TEST TEST'),
    recipient_phone = '0987654321'
WHERE id = 'b546e97f-1282-4a4d-a2fd-1ee97dbc126a'
  AND (recipient_phone IS NULL OR recipient_phone = '');
