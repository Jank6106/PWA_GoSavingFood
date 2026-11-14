-- 0026_safe_payment_buffer_and_auto_refund.sql
-- 1. Nâng TTL thanh toán lên 33 phút (30 phút hiển thị cho khách + 3 phút khoảng đệm ẩn)
-- 2. Tự động xử lý Hoàn tiền (Auto-Refund) khi thanh toán trùng lặp (lần 2) hoặc thanh toán sau khi đơn đã hết hạn/hủy
-- 3. Trả về danh sách mã PayOS của các đơn hết hạn để backend chủ động gọi API hủy link trên PayOS
-- 4. Đảm bảo đúng 100% schema thực tế của bảng surprise_bags (name, discount_price, is_available) và idempotency_keys

-- Cập nhật default của cột payment_expires_at sang 33 phút
ALTER TABLE public.orders
  ALTER COLUMN payment_expires_at SET DEFAULT (NOW() + INTERVAL '33 minutes');

-- 1. Cập nhật confirm_payos_payment với cơ chế Auto-Refund cho Late Payment & Duplicate Payment
CREATE OR REPLACE FUNCTION public.confirm_payos_payment(
  p_order_code BIGINT,
  p_payment_link_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_order_display_code TEXT;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE payment_order_code = p_order_code FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  END IF;

  v_order_display_code := 'GSF-' || UPPER(SUBSTRING(v_order.id::text, 1, 6));

  -- A. TRƯỜNG HỢP THANH TOÁN TRÙNG LẶP (LẦN 2+) - Đơn đã ở trạng thái thành công
  IF v_order.payment_status = 'success' OR v_order.status IN ('paid', 'preparing', 'ready_for_pickup', 'completed', 'picked_up') THEN
    INSERT INTO public.refund_requests (
      id,
      order_id,
      customer_id,
      amount,
      status,
      reason,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_order.id,
      v_order.customer_id,
      v_order.final_amount,
      'pending',
      'Hoàn tiền do khách hàng thanh toán trùng lặp (lần 2)',
      NOW(),
      NOW()
    );

    BEGIN
      INSERT INTO public.notifications (
        id,
        user_id,
        icon,
        title,
        body,
        data,
        is_read,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_order.customer_id,
        'order',
        'Giao dịch chuyển tiền trùng lặp ⚠️',
        'Hệ thống ghi nhận bạn đã chuyển tiền lần 2 cho đơn #' || v_order_display_code || '. Số tiền ' || to_char(v_order.final_amount, 'FM999,999,999') || 'đ đã được chuyển vào danh sách hoàn tiền.',
        jsonb_build_object('orderId', v_order.id, 'status', 'duplicate_refund_pending', 'amount', v_order.final_amount),
        false,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'DUPLICATE_PAYMENT_REFUND_QUEUED',
      'order_id', v_order.id,
      'refund_amount', v_order.final_amount
    );
  END IF;

  -- B. TRƯỜNG HỢP TIỀN VỀ TRỄ CHO ĐƠN ĐÃ HẾT HẠN HOẶC ĐÃ HỦY
  IF v_order.status IN ('expired', 'cancelled') THEN
    UPDATE public.orders
    SET 
      payment_status = 'refund_pending',
      paid_at = NOW(),
      updated_at = NOW()
    WHERE id = v_order.id;

    INSERT INTO public.refund_requests (
      id,
      order_id,
      customer_id,
      amount,
      status,
      reason,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_order.id,
      v_order.customer_id,
      v_order.final_amount,
      'pending',
      'Thanh toán sau khi đơn hàng đã hết hạn / bị hủy',
      NOW(),
      NOW()
    );

    BEGIN
      INSERT INTO public.notifications (
        id,
        user_id,
        icon,
        title,
        body,
        data,
        is_read,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_order.customer_id,
        'order',
        'Thanh toán sau khi đơn hết hạn ⏰',
        'Đơn hàng #' || v_order_display_code || ' đã hết thời hạn thanh toán trước khi tiền về. Số tiền ' || to_char(v_order.final_amount, 'FM999,999,999') || 'đ đã được tự động chuyển vào hàng đợi hoàn trả 100%.',
        jsonb_build_object('orderId', v_order.id, 'status', 'expired_refund_pending', 'amount', v_order.final_amount),
        false,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'LATE_PAYMENT_REFUND_QUEUED',
      'order_id', v_order.id,
      'refund_amount', v_order.final_amount
    );
  END IF;

  -- C. TRƯỜNG HỢP HỢP LỆ BÌNH THƯỜNG (pending / pending_payment)
  UPDATE public.orders
  SET 
    payment_status = 'success',
    paid_at = NOW(),
    status = 'paid'::order_status,
    payment_link_id = COALESCE(p_payment_link_id, payment_link_id),
    updated_at = NOW()
  WHERE id = v_order.id;

  BEGIN
    INSERT INTO public.notifications (
      id,
      user_id,
      icon,
      title,
      body,
      data,
      is_read,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_order.customer_id,
      'order',
      'Thanh toán thành công 🎉',
      'Đơn hàng #' || v_order_display_code || ' đã được xác nhận thanh toán qua VietQR.',
      jsonb_build_object('orderId', v_order.id, 'status', 'paid'),
      false,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', 'paid');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.confirm_payos_payment(BIGINT, TEXT) TO authenticated, service_role;

-- 2. Cập nhật create_order_transaction và place_order chuẩn schema 100%
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

  -- 6. Tạo đơn với status = pending_payment, TTL 33 phút (30m + 3m grace) và pickup_token
  INSERT INTO public.orders (
    id, customer_id, store_id, total_original_price, total_discount_price,
    discount_amount, final_amount, voucher_code, status,
    payment_method, payment_status, qr_code, pickup_time, note,
    payment_expires_at, pickup_token, created_at, updated_at
  ) VALUES (
    p_id, p_customer_id, p_store_id, p_total_original_price, p_total_discount_price,
    p_discount_amount, p_final_amount, p_voucher_code, 'pending_payment'::order_status,
    v_normalized_method::payment_method, 'pending'::payment_status, p_qr_code, p_pickup_time, p_note,
    NOW() + INTERVAL '33 minutes', v_pickup_token, NOW(), NOW()
  );

  -- 7. Chi tiết đơn hàng
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    SELECT name, discount_price INTO v_bag_name, v_discount_price
    FROM public.surprise_bags WHERE id = v_item."bagId";

    INSERT INTO public.order_items (id, order_id, bag_id, bag_name, quantity, unit_price, total_price, created_at)
    VALUES (gen_random_uuid(), p_id, v_item."bagId", v_bag_name, v_item.quantity, v_discount_price, v_discount_price * v_item.quantity, NOW());
  END LOOP;

  -- 8. Lưu idempotency key vào bảng idempotency_keys
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

-- 3. Wrapper place_order gọi create_order_transaction và auto-heal user nếu cần
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
      COALESCE(v_caller_name, 'Khách hàng'),
      COALESCE(v_caller_email, v_customer_id::text || '@placeholder.gsf'),
      v_caller_phone,
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

-- 4. Cập nhật cleanup_expired_pending_orders để trả về danh sách payment_order_code của đơn hết hạn
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_expired_count INT := 0;
  v_expired_codes BIGINT[] := ARRAY[]::BIGINT[];
BEGIN
  FOR v_order IN
    SELECT id, store_id, voucher_code, payment_order_code
    FROM public.orders
    WHERE status = 'pending_payment'
      AND payment_expires_at < NOW()
      AND deleted_at IS NULL
    FOR UPDATE
  LOOP
    UPDATE public.orders
    SET status = 'expired'::order_status,
        updated_at = NOW(),
        cancelled_at = NOW(),
        cancel_reason = 'Hết thời hạn thanh toán (TTL 30 phút + 3 phút đệm)',
        pickup_token = NULL
    WHERE id = v_order.id;

    FOR v_item IN
      SELECT bag_id, quantity
      FROM public.order_items
      WHERE order_id = v_order.id
    LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_item.quantity,
          updated_at = NOW()
      WHERE id = v_item.bag_id;
    END LOOP;

    IF v_order.voucher_code IS NOT NULL AND length(trim(v_order.voucher_code)) > 0 THEN
      UPDATE public.vouchers
      SET used_count = GREATEST(0, used_count - 1),
          updated_at = NOW()
      WHERE code = trim(v_order.voucher_code);
    END IF;

    IF v_order.payment_order_code IS NOT NULL THEN
      v_expired_codes := array_append(v_expired_codes, v_order.payment_order_code);
    END IF;

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'expired_orders_count', v_expired_count,
    'expired_order_codes', v_expired_codes
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_orders() TO authenticated, service_role, anon;
