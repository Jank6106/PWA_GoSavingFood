-- 0022_auto_heal_user_on_order.sql
-- Tự động đồng bộ tài khoản auth.users vào public.users khi đặt hàng
-- để triệt để loại bỏ lỗi Foreign Key constraint orders_customer_id_fkey

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
  v_bag_id UUID;
  v_quantity INTEGER;
  v_discount_price INTEGER;
  v_bag_name TEXT;
  v_current_stock INTEGER;
  v_is_available BOOLEAN;
  v_is_daily BOOLEAN;
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
BEGIN
  -- 1. Chặn phương thức tiền mặt (100% Online Payment)
  IF p_payment_method = 'cash' THEN
    RAISE EXCEPTION 'CASH_PAYMENT_NOT_SUPPORTED' USING DETAIL = 'GoSavingFood chỉ hỗ trợ thanh toán trực tuyến qua VietQR.';
  END IF;

  v_normalized_method := p_payment_method;
  IF v_normalized_method NOT IN ('banking', 'payos_vietqr', 'momo', 'zalopay') THEN
    v_normalized_method := 'banking';
  END IF;

  -- 2. Tự động đồng bộ khách hàng vào public.users nếu chưa có (Chống lỗi Foreign Key)
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_customer_id) THEN
    INSERT INTO public.users (id, name, email, role)
    SELECT
      p_customer_id,
      COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Khách hàng'),
      email,
      'customer'::public.user_role
    FROM auth.users
    WHERE id = p_customer_id
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 3. Idempotency Check
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

  -- 4. Khóa & Trừ kho túi thực phẩm
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    v_bag_id := v_item."bagId";
    v_quantity := v_item.quantity;

    SELECT name, quantity, is_available, discount_price, store_id, expires_at, is_daily
    INTO v_bag_name, v_current_stock, v_is_available, v_discount_price, v_store_id, v_expires_at, v_is_daily
    FROM public.surprise_bags
    WHERE id = v_bag_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'BAG_NOT_FOUND' USING DETAIL = v_bag_id::TEXT;
    END IF;
    IF v_store_id != p_store_id THEN
      RAISE EXCEPTION 'STORE_MISMATCH' USING DETAIL = v_bag_id::TEXT;
    END IF;
    IF NOT v_is_available OR v_current_stock < v_quantity OR (NOT COALESCE(v_is_daily, false) AND v_expires_at IS NOT NULL AND NOW() > v_expires_at) THEN
      RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object('bagId', v_bag_id, 'available', v_current_stock, 'requested', v_quantity)::TEXT;
    END IF;

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
