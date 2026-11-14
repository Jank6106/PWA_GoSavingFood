ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payos_account_name text, ADD COLUMN IF NOT EXISTS payos_bin text;
-- One stable PayOS code per order, full payment window, idempotent confirmation.
CREATE SEQUENCE IF NOT EXISTS public.payos_order_code_seq START WITH 1000000000000 MAXVALUE 9007199254740991;
REVOKE ALL ON SEQUENCE public.payos_order_code_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_payos_payment(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE o public.orders;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF o.status='pending_payment' AND o.payment_status='pending' AND o.payment_expires_at > now()
     AND o.final_amount > 0 AND o.payment_order_code IS NULL THEN
    UPDATE public.orders SET payment_order_code=nextval('public.payos_order_code_seq'), updated_at=now()
      WHERE id=o.id RETURNING * INTO o;
  END IF;
  RETURN to_jsonb(o);
END; $$;
REVOKE ALL ON FUNCTION public.reserve_payos_payment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_payos_payment(uuid) TO service_role;

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
  v_pickup_start TIME;
  v_pickup_end TIME;
  v_bag_type TEXT;
  v_repeat_mode TEXT;
  v_expiry_date DATE;
  v_store_id UUID;
  v_voucher_id UUID;
  v_voucher_used_count INTEGER;
  v_voucher_quantity INTEGER;
  v_voucher_is_active BOOLEAN;
  v_voucher_start TIMESTAMPTZ;
  v_voucher_end TIMESTAMPTZ;
  v_pickup_token UUID;
  v_normalized_method TEXT;
  v_vn_time TIME;
  v_vn_date DATE;
  v_payment_expires_at TIMESTAMPTZ;
  v_grace_deadline TIMESTAMPTZ;
  v_calculated_final INTEGER;
  v_order_status order_status;
  v_order_payment_status payment_status;
  v_paid_at TIMESTAMPTZ;
BEGIN
  -- 1. Chặn phương thức tiền mặ
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

  -- 3. LAZY CLEANUP: Hoàn kho cho các đơn pending_payment quá hạn của các túi được đặ
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
          is_available = true,
          status = 'active',
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
          cancel_reason = 'Quá hạn thanh toán (Lazy Cleanup)',
          updated_at = NOW(),
          pickup_token = NULL,
          payos_qr_code = NULL,
          payos_description = NULL,
          payos_account_number = NULL
      WHERE id = v_expired_order.id;
    END LOOP;
  END LOOP;

  -- 4. Khóa & Kiểm tra quy tắc nghiệp vụ thời gian & Tồn kho
  v_vn_time := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;
  v_vn_date := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_payment_expires_at := NOW() + INTERVAL '33 minutes';

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    v_bag_id := v_item."bagId";
    v_quantity := v_item.quantity;

    SELECT name, quantity, is_available, discount_price, store_id, pickup_start, pickup_end,
           COALESCE(bag_type, 'daily'), COALESCE(repeat_mode, 'today_only'), expiry_date
    INTO v_bag_name, v_current_stock, v_is_available, v_discount_price, v_store_id, v_pickup_start, v_pickup_end,
         v_bag_type, v_repeat_mode, v_expiry_date
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

    -- Kiểm tra Loại 2: Mặt hàng có hạn sử dụng (shelf_life)
    IF v_bag_type = 'shelf_life' OR v_expiry_date IS NOT NULL THEN
      IF v_expiry_date IS NOT NULL AND v_vn_date > v_expiry_date THEN
        RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
          'bagId', v_bag_id,
          'available', v_current_stock,
          'requested', v_quantity,
          'reason', 'EXPIRED',
          'expiryDate', v_expiry_date
        )::TEXT;
      END IF;
    ELSE
      -- Kiểm tra Loại 1: Mặt hàng dùng trong ngày (daily)
      IF v_pickup_start IS NOT NULL AND v_vn_time < v_pickup_start THEN
        RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
          'bagId', v_bag_id,
          'available', v_current_stock,
          'requested', v_quantity,
          'reason', 'NOT_YET_OPEN',
          'pickupStart', to_char(v_pickup_start, 'HH24:MI')
        )::TEXT;
      END IF;

      IF v_pickup_end IS NOT NULL AND v_vn_time > v_pickup_end THEN
        RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
          'bagId', v_bag_id,
          'available', v_current_stock,
          'requested', v_quantity,
          'reason', 'ORDER_CLOSED',
          'pickupEnd', to_char(v_pickup_end, 'HH24:MI')
        )::TEXT;
      END IF;

      IF v_pickup_end IS NOT NULL THEN
        v_grace_deadline := (v_vn_date + v_pickup_end + INTERVAL '5 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh';
        -- Payment reservations retain their full 33-minute deadline, including near closing.
      END IF;
    END IF;

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
    SET quantity = quantity - v_quantity,
        updated_at = NOW()
    WHERE id = v_bag_id;
  END LOOP;

  -- 5. Kiểm tra voucher
  IF p_voucher_code IS NOT NULL AND p_voucher_code != '' THEN
    SELECT id, used_count, quantity, is_active, start_date, end_date
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

  -- 6. KIỂM TRA CHỐNG GIAN LẬN SỐ TIỀN & XÁC ĐỊNH TRẠNG THÁI (0đ -> paid / success)
  v_calculated_final := GREATEST(0, p_total_discount_price - COALESCE(p_discount_amount, 0));
  IF p_final_amount < v_calculated_final THEN
    RAISE EXCEPTION 'INVALID_FINAL_AMOUNT' USING DETAIL = 'Số tiền thanh toán không hợp lệ với mức giảm giá.';
  END IF;

  IF p_final_amount <= 0 THEN
    v_order_status := 'paid'::order_status;
    v_order_payment_status := 'success'::payment_status;
    v_paid_at := NOW();
  ELSE
    v_order_status := 'pending_payment'::order_status;
    v_order_payment_status := 'pending'::payment_status;
    v_paid_at := NULL;
  END IF;

  v_pickup_token := gen_random_uuid();

  -- 7. Tạo đơn hàng
  INSERT INTO public.orders (
    id, customer_id, store_id, total_original_price, total_discount_price,
    discount_amount, final_amount, voucher_code, status,
    payment_method, payment_status, paid_at, qr_code, pickup_time, note,
    payment_expires_at, pickup_token, recipient_name, recipient_phone, created_at, updated_a
  ) VALUES (
    p_id, p_customer_id, p_store_id, p_total_original_price, p_total_discount_price,
    p_discount_amount, p_final_amount, p_voucher_code, v_order_status,
    v_normalized_method::payment_method, v_order_payment_status, v_paid_at, p_qr_code, p_pickup_time, p_note,
    v_payment_expires_at, v_pickup_token, p_recipient_name, p_recipient_phone, NOW(), NOW()
  );

  -- 8. Đồng bộ SĐT người nhận nếu có
  IF p_recipient_phone IS NOT NULL AND TRIM(p_recipient_phone) != '' THEN
    BEGIN
      UPDATE public.users
      SET phone = TRIM(p_recipient_phone),
          updated_at = NOW()
      WHERE id = p_customer_id
        AND (phone IS NULL OR TRIM(phone) = '')
        AND NOT EXISTS (
          SELECT 1 FROM public.users
          WHERE phone = TRIM(p_recipient_phone) AND id != p_customer_id
        );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  -- 9. Chi tiết đơn hàng
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    SELECT name, discount_price INTO v_bag_name, v_discount_price
    FROM public.surprise_bags WHERE id = v_item."bagId";

    INSERT INTO public.order_items (id, order_id, bag_id, bag_name, quantity, unit_price, total_price, created_at)
    VALUES (gen_random_uuid(), p_id, v_item."bagId", v_bag_name, v_item.quantity, v_discount_price, v_discount_price * v_item.quantity, NOW());
  END LOOP;

  -- 10. Lưu idempotency key
  INSERT INTO public.idempotency_keys (id, user_id, key, request_hash, response, expires_at, created_at)
  VALUES (gen_random_uuid(), p_customer_id, p_idempotency_key, p_idempotency_key, json_build_object('orderId', p_id), NOW() + INTERVAL '7 days', NOW());

  RETURN json_build_object(
    'success', true,
    'is_duplicate', false,
    'order_id', p_id,
    'pickup_token', v_pickup_token,
    'expires_at', v_payment_expires_at,
    'status', v_order_status::text,
    'payment_status', v_order_payment_status::tex
  );
END;
$function$;

-- Repair only still-pending, young reservations; never revive terminal orders.
UPDATE public.orders SET payment_expires_at=created_at+interval '33 minutes'
WHERE status='pending_payment' AND payment_status='pending' AND deleted_at IS NULL
  AND created_at > now()-interval '33 minutes'
  AND payment_expires_at < created_at+interval '33 minutes';

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
    RETURN jsonb_build_object('success', true, 'message', 'ALREADY_PAID', 'order_id', v_order.id);
  END IF;
  IF v_order.payment_status IN ('refund_pending', 'refunded') THEN
    RETURN jsonb_build_object('success', true, 'message', 'REFUND_ALREADY_RECORDED', 'order_id', v_order.id);
  END IF;
  -- B. TRƯỜNG HỢP TIỀN VỀ TRỄ CHO ĐƠN ĐÃ HẾT HẠN HOẶC ĐÃ HỦY
  IF v_order.status IN ('expired', 'cancelled') THEN
    UPDATE public.orders
    SET
      payment_status = 'refund_pending',
      paid_at = NOW(),
      updated_at = NOW(),
      payos_qr_code = NULL,
      payos_description = NULL,
      payos_account_number = NULL
    WHERE id = v_order.id;

    INSERT INTO public.refund_requests (
      id,
      order_id,
      customer_id,
      amount,
      status,
      reason,
      created_at,
      updated_a
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
        created_a
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
      'refund_amount', v_order.final_amoun
    );
  END IF;

  -- C. TRƯỜNG HỢP HỢP LỆ BÌNH THƯỜNG (pending / pending_payment)
  -- Khi thanh toán thành công: Gán status = 'paid' và giải phóng payos_qr_code để tiết kiệm dung lượng
  UPDATE public.orders
  SET
    payment_status = 'success',
    paid_at = NOW(),
    status = 'paid'::order_status,
    payment_link_id = COALESCE(p_payment_link_id, payment_link_id),
    updated_at = NOW(),
    payos_qr_code = NULL,
    payos_description = NULL,
    payos_account_number = NULL
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
      created_a
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

GRANT EXECUTE ON FUNCTION public.confirm_payos_payment(BIGINT, TEXT) TO service_role;


REVOKE ALL ON FUNCTION public.confirm_payos_payment(bigint,text) FROM PUBLIC, anon, authenticated;
