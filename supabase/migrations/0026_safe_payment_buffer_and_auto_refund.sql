-- 0026_safe_payment_buffer_and_auto_refund.sql
-- 1. Nâng TTL thanh toán lên 33 phút (30 phút hiển thị cho khách + 3 phút khoảng đệm ẩn)
-- 2. Tự động xử lý Hoàn tiền (Auto-Refund) khi thanh toán trùng lặp (lần 2) hoặc thanh toán sau khi đơn đã hết hạn/hủy
-- 3. Trả về danh sách mã PayOS của các đơn hết hạn để backend chủ động gọi API hủy link trên PayOS

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

-- 2. Cập nhật place_order với TTL 33 phút (30 phút hiển thị + 3 phút buffer ẩn)
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
  v_existing_order_id uuid;
  v_item jsonb;
  v_bag_id uuid;
  v_qty integer;
  v_current_stock integer;
  v_bag_name text;
  v_unit_price integer;
  v_store_active boolean;
  v_voucher RECORD;
  v_user_role text;
  v_auth_uid uuid;
  v_actual_customer_id uuid;
  v_caller_email text;
  v_caller_name text;
  v_caller_phone text;
  v_normalized_method text;
  v_pickup_token UUID;
  v_expired_order RECORD;
  v_bag_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Ban can dang nhap de dat hang.';
  END IF;

  SELECT id INTO v_actual_customer_id FROM public.users WHERE id = v_auth_uid;

  IF v_actual_customer_id IS NULL THEN
    SELECT email,
           COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
           COALESCE(raw_user_meta_data->>'phone', '')
    INTO v_caller_email, v_caller_name, v_caller_phone
    FROM auth.users
    WHERE id = v_auth_uid;

    INSERT INTO public.users (id, role, name, email, phone, created_at, updated_at)
    VALUES (
      v_auth_uid,
      'customer',
      COALESCE(v_caller_name, 'Khach hang'),
      COALESCE(v_caller_email, v_auth_uid::text || '@placeholder.gsf'),
      v_caller_phone,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
      SET updated_at = NOW()
    RETURNING id INTO v_actual_customer_id;
  END IF;

  SELECT role INTO v_user_role FROM public.users WHERE id = v_actual_customer_id;
  IF v_user_role IS DISTINCT FROM 'customer' THEN
    RAISE EXCEPTION 'FORBIDDEN: Chi khach hang moi duoc phep dat don.';
  END IF;

  SELECT is_open INTO v_store_active FROM public.stores WHERE id = p_store_id;
  IF v_store_active IS NOT TRUE THEN
    RAISE EXCEPTION 'STORE_CLOSED: Cua hang hien dang dong cua, khong the nhan don.';
  END IF;

  v_normalized_method := lower(trim(p_payment_method));
  IF v_normalized_method IN ('cash', 'cash_on_pickup', 'cod') THEN
    RAISE EXCEPTION 'CASH_PAYMENT_NOT_SUPPORTED: GoSavingFood chi ho tro thanh toan online qua VietQR (PayOS) de bao ve quyen loi quan va chong huy don ao.';
  END IF;

  IF v_normalized_method NOT IN ('banking', 'payos_vietqr', 'momo', 'zalopay') THEN
    v_normalized_method := 'payos_vietqr';
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT id INTO v_existing_order_id
    FROM public.orders
    WHERE idempotency_key = p_idempotency_key
      AND customer_id = v_actual_customer_id
    LIMIT 1;

    IF v_existing_order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'order_id', v_existing_order_id,
        'message', 'IDEMPOTENT_REPLAY'
      );
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_ITEMS: Don hang phai co it nhat mot san pham.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_bag_ids := array_append(v_bag_ids, (v_item->>'bagId')::UUID);
  END LOOP;

  -- 3. LAZY CLEANUP: Hủy các đơn pending_payment quá hạn 33 phút của chính các túi được đặt
  FOR v_expired_order IN
    SELECT DISTINCT o.id, o.store_id, o.payment_order_code
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE oi.bag_id = ANY(v_bag_ids)
      AND o.status = 'pending_payment'
      AND o.payment_expires_at < NOW()
      AND o.deleted_at IS NULL
    FOR UPDATE OF o
  LOOP
    UPDATE public.orders
    SET status = 'expired'::order_status,
        updated_at = NOW(),
        cancelled_at = NOW(),
        cancel_reason = 'Quá hạn thanh toán 30 phút (Lazy Cleanup)',
        pickup_token = NULL
    WHERE id = v_expired_order.id;

    UPDATE public.surprise_bags sb
    SET quantity = sb.quantity + oi.quantity,
        updated_at = NOW()
    FROM public.order_items oi
    WHERE oi.order_id = v_expired_order.id
      AND sb.id = oi.bag_id;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_bag_id := (v_item->>'bagId')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::integer, 1);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: So luong mon phai lon hon 0.';
    END IF;

    SELECT quantity, title, price INTO v_current_stock, v_bag_name, v_unit_price
    FROM public.surprise_bags
    WHERE id = v_bag_id
      AND store_id = p_store_id
      AND deleted_at IS NULL
      AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'BAG_NOT_FOUND: Mon an khong ton tai hoac da ngung kinh doanh.';
    END IF;

    IF v_current_stock < v_qty THEN
      RAISE EXCEPTION 'BAG_OUT_OF_STOCK: Mon "%" khong du so luong (con %, can %).',
        v_bag_name, v_current_stock, v_qty;
    END IF;

    UPDATE public.surprise_bags
    SET quantity = quantity - v_qty,
        updated_at = NOW()
    WHERE id = v_bag_id;
  END LOOP;

  IF p_voucher_code IS NOT NULL AND length(trim(p_voucher_code)) > 0 THEN
    SELECT * INTO v_voucher
    FROM public.vouchers
    WHERE code = trim(p_voucher_code)
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until >= NOW())
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'VOUCHER_INVALID: Ma giam gia khong hop le hoac da het han.';
    END IF;

    IF v_voucher.usage_limit IS NOT NULL AND v_voucher.used_count >= v_voucher.usage_limit THEN
      RAISE EXCEPTION 'VOUCHER_EXHAUSTED: Ma giam gia da het luot su dung.';
    END IF;

    IF p_total_discount_price < v_voucher.min_order_value THEN
      RAISE EXCEPTION 'VOUCHER_MIN_VALUE: Don hang chua dat gia tri toi thieu de dung voucher.';
    END IF;

    UPDATE public.vouchers
    SET used_count = used_count + 1,
        updated_at = NOW()
    WHERE id = v_voucher.id;
  END IF;

  v_pickup_token := gen_random_uuid();

  -- 6. Tạo đơn với status = pending_payment, TTL 33 phút và pickup_token
  INSERT INTO public.orders (
    id, customer_id, store_id, idempotency_key, voucher_code,
    pickup_time, payment_method, note, total_original_price, total_discount_price,
    discount_amount, final_amount, status, payment_status, qr_code,
    payment_expires_at, pickup_token, created_at, updated_at
  ) VALUES (
    p_id, v_actual_customer_id, p_store_id, p_idempotency_key, p_voucher_code,
    p_pickup_time, v_normalized_method::payment_method, p_note, p_total_original_price, p_total_discount_price,
    p_discount_amount, p_final_amount, 'pending_payment'::order_status, 'pending'::payment_status, p_qr_code,
    NOW() + INTERVAL '33 minutes', v_pickup_token, NOW(), NOW()
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_bag_id := (v_item->>'bagId')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::integer, 1);

    SELECT title, price INTO v_bag_name, v_unit_price
    FROM public.surprise_bags
    WHERE id = v_bag_id;

    INSERT INTO public.order_items (
      id, order_id, bag_id, bag_name, quantity, unit_price, total_price, created_at
    ) VALUES (
      gen_random_uuid(), p_id, v_bag_id, v_bag_name, v_qty, v_unit_price, v_unit_price * v_qty, NOW()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_id,
    'pickup_token', v_pickup_token,
    'expires_at', NOW() + INTERVAL '33 minutes',
    'status', 'pending_payment'
  );
END;
$function$;

-- 3. Cập nhật cleanup_expired_pending_orders để trả về danh sách payment_order_code của đơn hết hạn
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
