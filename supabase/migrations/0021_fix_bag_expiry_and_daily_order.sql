-- 0021_fix_bag_expiry_and_daily_order.sql
-- Khắc phục tình trạng túi hàng daily (is_daily=true) bị chặn đặt hàng do expires_at cũ
-- và đồng bộ lại list_bags_nearby để không lọc bỏ túi daily đang mở bán.

-- 1. Cập nhật create_order_transaction
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

  -- 3. Khóa & Trừ kho túi thực phẩm
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

  -- 4. Khóa & Áp dụng Voucher
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

  -- 5. Tạo đơn với status = pending_payment, TTL 15 phút và pickup_token
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

  -- 6. Chi tiết đơn hàng
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    SELECT name, discount_price INTO v_bag_name, v_discount_price
    FROM public.surprise_bags WHERE id = v_item."bagId";

    INSERT INTO public.order_items (id, order_id, bag_id, bag_name, quantity, unit_price, total_price, created_at)
    VALUES (gen_random_uuid(), p_id, v_item."bagId", v_bag_name, v_item.quantity, v_discount_price, v_discount_price * v_item.quantity, NOW());
  END LOOP;

  -- 7. Lưu idempotency key
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

-- 2. Cập nhật list_bags_nearby để túi daily không bị lọc bỏ do expires_at cũ
CREATE OR REPLACE FUNCTION public.list_bags_nearby(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius INTEGER DEFAULT 10000,
  p_category TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  store_id UUID,
  name TEXT,
  description TEXT,
  original_price INTEGER,
  discount_price INTEGER,
  category bag_category,
  image_url TEXT,
  quantity INTEGER,
  max_quantity INTEGER,
  pickup_start TIME WITHOUT TIME ZONE,
  pickup_end TIME WITHOUT TIME ZONE,
  is_daily BOOLEAN,
  is_available BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  store_name TEXT,
  store_logo_url TEXT,
  store_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_m DOUBLE PRECISION,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_point  GEOGRAPHY(Point, 4326);
  v_total  BIGINT;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  v_point  := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM surprise_bags b
  INNER JOIN stores s ON s.id = b.store_id
  WHERE b.deleted_at IS NULL
    AND b.is_available = true
    AND b.quantity > 0
    AND (COALESCE(b.is_daily, false) = true OR b.expires_at IS NULL OR b.expires_at > NOW())
    AND s.deleted_at IS NULL
    AND s.status = 'active'
    AND ST_DWithin(s.location, v_point, p_radius)
    AND (p_category IS NULL OR b.category::TEXT = p_category);

  RETURN QUERY
  SELECT
    b.id,
    b.store_id,
    b.name,
    b.description,
    b.original_price,
    b.discount_price,
    b.category,
    b.image_url,
    b.quantity,
    b.max_quantity,
    b.pickup_start,
    b.pickup_end,
    b.is_daily,
    b.is_available,
    b.created_at,
    b.updated_at,
    b.expires_at,
    b.deleted_at,
    s.name AS store_name,
    s.logo_url AS store_logo_url,
    s.address AS store_address,
    s.latitude,
    s.longitude,
    ST_Distance(s.location, v_point) AS distance_m,
    v_total AS total_count
  FROM surprise_bags b
  INNER JOIN stores s ON s.id = b.store_id
  WHERE b.deleted_at IS NULL
    AND b.is_available = true
    AND b.quantity > 0
    AND (COALESCE(b.is_daily, false) = true OR b.expires_at IS NULL OR b.expires_at > NOW())
    AND s.deleted_at IS NULL
    AND s.status = 'active'
    AND ST_DWithin(s.location, v_point, p_radius)
    AND (p_category IS NULL OR b.category::TEXT = p_category)
  ORDER BY ST_Distance(s.location, v_point) ASC
  LIMIT p_limit
  OFFSET v_offset;
END;
$function$;
