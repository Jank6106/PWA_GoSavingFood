-- ==============================================================================
-- MIGRATION 0037: HỖ TRỢ ĐƠN HÀNG 0 ĐỒNG (VOUCHER 100%) & CHỐNG GIAN LẬN
-- ==============================================================================
-- 1. create_order_transaction:
--    - Tự động kiểm tra tính toán lại số tiền (Anti-tamper / Anti-fraud).
--    - Nếu p_final_amount <= 0 (và hợp lệ qua voucher):
--      + status chuyển ngay thành 'paid'::order_status
--      + payment_status chuyển ngay thành 'success'::payment_status
--      + paid_at = NOW()
--      + Trigger notify_store_new_order tự động bắn thông báo cho chủ quán.
--    - Nếu p_final_amount > 0:
--      + Giữ nguyên 'pending_payment'::order_status và 'pending'::payment_status.
--
-- 2. transition_order_status_transaction:
--    - Khi hủy đơn đã thanh toán ('paid'):
--      + Nếu v_final_amount > 0: Tạo bản ghi hoàn tiền refund_requests như trước.
--      + Nếu v_final_amount <= 0 (đơn 0đ): KHÔNG tạo refund_requests (tránh rác hệ thống),
--        set payment_status = 'refunded', hoàn kho và hoàn voucher bình thường.
-- ==============================================================================

-- 1. Cập nhật transition_order_status_transaction
CREATE OR REPLACE FUNCTION public.transition_order_status_transaction(
  p_order_id uuid,
  p_target_status text,
  p_actor_id uuid,
  p_actor_role text,
  p_reason text DEFAULT NULL,
  p_bank_info jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status TEXT;
  v_customer_id UUID;
  v_store_id UUID;
  v_final_amount INTEGER;
  v_created_at TIMESTAMPTZ;
  v_pickup_time TIMESTAMPTZ;
  v_payment_method TEXT;
  v_payment_status TEXT;
  v_voucher_code TEXT;
  v_completed_at TIMESTAMPTZ;
  v_cancelled_at TIMESTAMPTZ;
  v_cancel_reason TEXT;
  v_pickup_token UUID;
  v_updated_status TEXT;
  v_updated_payment_status TEXT;
  v_item RECORD;
  v_order_label TEXT;
  v_store_owner UUID;
  v_real_user_role TEXT;
BEGIN
  -- 0. Xác thực bảo mật: Ngăn chặn leo thang đặc quyền
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING DETAIL = 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';
  END IF;

  SELECT role INTO v_real_user_role FROM public.users WHERE id = auth.uid();
  IF v_real_user_role IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING DETAIL = 'Không tìm thấy hồ sơ người dùng trong hệ thống.';
  END IF;

  IF p_actor_role = 'admin' AND v_real_user_role != 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Bạn không có quyền quản trị viên để thực hiện thao tác này.';
  END IF;

  -- 1. Khóa đơn & đọc dữ liệu
  SELECT status, customer_id, store_id, final_amount, created_at, pickup_time, payment_method, payment_status, voucher_code, completed_at, cancelled_at, cancel_reason, pickup_token
  INTO v_current_status, v_customer_id, v_store_id, v_final_amount, v_created_at, v_pickup_time, v_payment_method, v_payment_status, v_voucher_code, v_completed_at, v_cancelled_at, v_cancel_reason, v_pickup_token
  FROM public.orders
  WHERE id = p_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING DETAIL = p_order_id::TEXT;
  END IF;

  v_order_label := 'GSF-' || UPPER(SUBSTRING(p_order_id::text, 1, 6));

  -- 2. Kiểm tra quyền sở hữu đối với Customer
  IF p_actor_role = 'customer' THEN
    IF auth.uid() != v_customer_id THEN
      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Bạn không có quyền thao tác trên đơn hàng của người khác.';
    END IF;
  END IF;

  -- 3. Xử lý logic chuyển trạng thái
  IF p_target_status = 'cancelled' THEN
    -- RBAC hủy đơn:
    IF p_actor_role = 'customer' THEN
      IF v_current_status NOT IN ('pending_payment', 'paid') THEN
        RAISE EXCEPTION 'CANCEL_NOT_ALLOWED'
          USING DETAIL = 'Khách hàng chỉ được hủy khi đơn ở trạng thái chờ thanh toán hoặc quán chưa chuẩn bị món.';
      END IF;
    ELSIF p_actor_role = 'merchant' THEN
      IF v_current_status IN ('completed', 'cancelled', 'expired') THEN
        RAISE EXCEPTION 'CANCEL_NOT_ALLOWED'
          USING DETAIL = 'Không thể hủy đơn hàng đã kết thúc.';
      END IF;
    END IF;

    v_updated_status := 'cancelled';
    v_cancelled_at := NOW();
    v_cancel_reason := COALESCE(p_reason, 'Người dùng hủy đơn');

    -- Tự động hoàn kho cho các túi trong đơn
    FOR v_item IN SELECT bag_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_item.quantity,
          is_available = true,
          status = 'active',
          updated_at = NOW()
      WHERE id = v_item.bag_id;
    END LOOP;

    -- Hoàn voucher nếu có
    IF v_voucher_code IS NOT NULL AND v_voucher_code != '' THEN
      UPDATE public.vouchers
      SET used_count = GREATEST(0, used_count - 1),
          updated_at = NOW()
      WHERE code = v_voucher_code AND deleted_at IS NULL;
    END IF;

    -- Hoàn tiền VietQR: Nếu đơn đã thanh toán (payment_status = 'success' hoặc status = 'paid')
    IF (v_payment_status = 'success' OR v_current_status = 'paid') THEN
      IF COALESCE(v_final_amount, 0) > 0 THEN
        v_updated_payment_status := 'refund_pending';

        INSERT INTO public.refund_requests (
          id,
          order_id,
          customer_id,
          amount,
          reason,
          bank_account_info,
          status,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          p_order_id,
          v_customer_id,
          v_final_amount,
          v_cancel_reason,
          p_bank_info,
          'pending',
          NOW(),
          NOW()
        );
      ELSE
        -- Đơn hàng 0đ: Không cần tạo refund_requests, set luôn refunded
        v_updated_payment_status := 'refunded';
      END IF;

      -- Nếu khách hủy đơn: Bắn thông báo cho Chủ quán biết
      IF p_actor_role = 'customer' THEN
        SELECT owner_user_id INTO v_store_owner FROM public.stores WHERE id = v_store_id;
        IF v_store_owner IS NOT NULL THEN
          BEGIN
            INSERT INTO public.notifications (id, user_id, icon, title, body, data)
            VALUES (
              gen_random_uuid(),
              v_store_owner,
              'order',
              'Khách hàng đã hủy đơn hàng',
              'Đơn ' || v_order_label || ' đã bị khách hủy trước khi làm món. Lý do: ' || v_cancel_reason,
              jsonb_build_object('orderId', p_order_id, 'status', 'cancelled', 'reason', v_cancel_reason)
            );
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
      END IF;
    ELSE
      v_updated_payment_status := v_payment_status;
    END IF;

    -- Thu hồi mã nhận hàng & thông tin PayOS
    v_pickup_token := NULL;

  ELSIF p_target_status = 'preparing' THEN
    IF v_current_status != 'paid' AND v_current_status != 'pending' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION' USING DETAIL = 'Chỉ có thể chuẩn bị món từ đơn đã thanh toán.';
    END IF;
    v_updated_status := 'preparing';
    v_updated_payment_status := v_payment_status;

  ELSIF p_target_status = 'ready_for_pickup' THEN
    IF v_current_status != 'preparing' AND v_current_status != 'paid' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION' USING DETAIL = 'Đơn hàng phải đang chuẩn bị trước khi sẵn sàng giao.';
    END IF;
    v_updated_status := 'ready_for_pickup';
    v_updated_payment_status := v_payment_status;

  ELSIF p_target_status = 'completed' THEN
    IF v_current_status != 'ready_for_pickup' AND v_current_status != 'preparing' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION' USING DETAIL = 'Đơn hàng chưa sẵn sàng để hoàn thành.';
    END IF;
    v_updated_status := 'completed';
    v_completed_at := NOW();
    v_updated_payment_status := v_payment_status;

  ELSE
    RAISE EXCEPTION 'UNKNOWN_TARGET_STATUS' USING DETAIL = p_target_status;
  END IF;

  -- 4. Cập nhật vào DB
  UPDATE public.orders
  SET status = v_updated_status::order_status,
      payment_status = v_updated_payment_status::payment_status,
      completed_at = v_completed_at,
      cancelled_at = v_cancelled_at,
      cancel_reason = v_cancel_reason,
      pickup_token = v_pickup_token,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', v_updated_status,
    'payment_status', v_updated_payment_status
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.transition_order_status_transaction(uuid, text, uuid, text, text, jsonb) TO authenticated, service_role;

-- 2. Cập nhật create_order_transaction: Tự động duyệt đơn 0đ sang paid/success và chống gian lận giá
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
  -- 1. Chặn phương thức tiền mặt
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

  -- 3. LAZY CLEANUP: Hoàn kho cho các đơn pending_payment quá hạn của các túi được đặt
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
        IF v_grace_deadline > NOW() AND v_grace_deadline < v_payment_expires_at THEN
          v_payment_expires_at := v_grace_deadline;
        END IF;
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
    payment_expires_at, pickup_token, recipient_name, recipient_phone, created_at, updated_at
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
    'payment_status', v_order_payment_status::text
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_order_transaction(
  uuid, uuid, uuid, text, jsonb, text, timestamp with time zone, text, text,
  integer, integer, integer, integer, text, text, text
) TO authenticated, service_role;
