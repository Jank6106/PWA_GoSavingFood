-- ============================================================
-- GSF Platform - Bag Management Redesign Migration (0029)
-- 1. Thêm các cột phân loại túi: bag_type ('daily' | 'shelf_life'), repeat_mode ('today_only' | 'recurring'), daily_quota, expiry_date, status ('active' | 'sold_out' | 'archived' | 'expired')
-- 2. Tinh chỉnh trigger auto_deactivate_bag để tự động kích hoạt lại khi có tồn kho (chống kẹt túi INACTIVE)
-- 3. Cập nhật create_order_transaction & place_order:
--    - Loại 1 (Dùng trong ngày): Kiểm tra 2 giai đoạn (chặn trước pickup_start và sau pickup_end), áp dụng thời hạn thanh toán ngầm 5 phút sau pickup_end.
--    - Loại 2 (Có HSD): Kiểm tra hạn sử dụng (hết ngày 23:59:59 của expiry_date).
-- 4. Tạo hàm cron_daily_bag_cycle phục vụ reset tồn kho daily hàng ngày và lưu trữ soft archive các túi hết hạn.
-- 5. Cập nhật list_bags_nearby: Ẩn các túi archived/expired khỏi mục Khám phá.
-- ============================================================

-- 1. Thêm các cột quản lý túi hàng mới
ALTER TABLE public.surprise_bags
  ADD COLUMN IF NOT EXISTS bag_type TEXT NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS repeat_mode TEXT NOT NULL DEFAULT 'today_only',
  ADD COLUMN IF NOT EXISTS daily_quota INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS expiry_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Ràng buộc giá trị hợp lệ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_bag_type'
  ) THEN
    ALTER TABLE public.surprise_bags
      ADD CONSTRAINT check_bag_type CHECK (bag_type IN ('daily', 'shelf_life'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_repeat_mode'
  ) THEN
    ALTER TABLE public.surprise_bags
      ADD CONSTRAINT check_repeat_mode CHECK (repeat_mode IN ('today_only', 'recurring'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_bag_status'
  ) THEN
    ALTER TABLE public.surprise_bags
      ADD CONSTRAINT check_bag_status CHECK (status IN ('active', 'sold_out', 'archived', 'expired'));
  END IF;
END $$;

-- Đồng bộ dữ liệu cũ
UPDATE public.surprise_bags
SET bag_type = 'daily',
    repeat_mode = CASE WHEN COALESCE(is_daily, true) THEN 'recurring' ELSE 'today_only' END,
    status = CASE WHEN is_available = false AND quantity = 0 THEN 'sold_out' ELSE 'active' END
WHERE bag_type IS NULL OR status IS NULL;

-- 2. Tinh chỉnh trigger auto_deactivate_bag
CREATE OR REPLACE FUNCTION public.auto_deactivate_bag()
RETURNS TRIGGER AS $$
BEGIN
  -- Khi kho về 0: Chuyển is_available = false và status = 'sold_out'
  IF NEW.quantity = 0 AND NEW.is_available = true THEN
    NEW.is_available := false;
    IF NEW.status = 'active' THEN
      NEW.status := 'sold_out';
    END IF;
  -- Khi kho được nạp/hồi lại (> 0) từ trạng thái sold_out: Khôi phục is_available và status 'active'
  ELSIF NEW.quantity > 0 AND (OLD.quantity = 0 OR NEW.is_available = false) AND NEW.deleted_at IS NULL AND NEW.status = 'sold_out' THEN
    NEW.is_available := true;
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_deactivate_surprise_bag ON public.surprise_bags;
CREATE TRIGGER auto_deactivate_surprise_bag
  BEFORE UPDATE ON public.surprise_bags
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_deactivate_bag();

-- 3. Tạo hàm cron_daily_bag_cycle phục vụ reset định kỳ đầu ngày mới (00h01)
CREATE OR REPLACE FUNCTION public.cron_daily_bag_cycle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  -- A. Với túi lặp lại hàng ngày ('daily' + 'recurring'): Nạp lại số lượng bán theo daily_quota
  UPDATE public.surprise_bags
  SET 
    quantity = COALESCE(daily_quota, quantity),
    is_available = true,
    status = 'active',
    updated_at = NOW()
  WHERE bag_type = 'daily'
    AND repeat_mode = 'recurring'
    AND deleted_at IS NULL
    AND status != 'archived';

  -- B. Với túi dùng trong ngày chỉ hôm nay ('daily' + 'today_only'): Tự chuyển sang 'archived' (Soft Archive)
  UPDATE public.surprise_bags
  SET 
    is_available = false,
    status = 'archived',
    updated_at = NOW()
  WHERE bag_type = 'daily'
    AND repeat_mode = 'today_only'
    AND status = 'active'
    AND deleted_at IS NULL;

  -- C. Với túi có hạn sử dụng ('shelf_life'): Quá ngày HSD thì chuyển 'expired' (Soft Archive)
  UPDATE public.surprise_bags
  SET 
    is_available = false,
    status = 'expired',
    updated_at = NOW()
  WHERE bag_type = 'shelf_life'
    AND expiry_date IS NOT NULL
    AND expiry_date < v_today
    AND status = 'active'
    AND deleted_at IS NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cron_daily_bag_cycle() TO authenticated, service_role, anon;

-- 4. Cập nhật hàm create_order_transaction và place_order
DROP FUNCTION IF EXISTS public.place_order(uuid, uuid, text, jsonb, text, timestamp with time zone, text, text, integer, integer, integer, integer, text, text, text);
DROP FUNCTION IF EXISTS public.create_order_transaction(uuid, uuid, uuid, text, jsonb, text, timestamp with time zone, text, text, integer, integer, integer, integer, text, text, text);

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
      -- Giai đoạn 1: Trước giờ mở bán
      IF v_pickup_start IS NOT NULL AND v_vn_time < v_pickup_start THEN
        RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
          'bagId', v_bag_id,
          'available', v_current_stock,
          'requested', v_quantity,
          'reason', 'NOT_YET_OPEN',
          'pickupStart', to_char(v_pickup_start, 'HH24:MI')
        )::TEXT;
      END IF;

      -- Giai đoạn 2: Quá khung giờ nhận đơn hôm nay
      IF v_pickup_end IS NOT NULL AND v_vn_time > v_pickup_end THEN
        RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
          'bagId', v_bag_id,
          'available', v_current_stock,
          'requested', v_quantity,
          'reason', 'ORDER_CLOSED',
          'pickupEnd', to_char(v_pickup_end, 'HH24:MI')
        )::TEXT;
      END IF;

      -- Cơ chế 5 phút đệm ngầm cho khách đang thanh toán dở:
      -- Giới hạn thời hạn thanh toán tối đa không quá pickup_end + 5 phút hôm nay
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

  -- 6. Tạo đơn hàng với payment_expires_at đã tích hợp 5 phút đệm ngầm
  INSERT INTO public.orders (
    id, customer_id, store_id, total_original_price, total_discount_price,
    discount_amount, final_amount, voucher_code, status,
    payment_method, payment_status, qr_code, pickup_time, note,
    payment_expires_at, pickup_token, recipient_name, recipient_phone, created_at, updated_at
  ) VALUES (
    p_id, p_customer_id, p_store_id, p_total_original_price, p_total_discount_price,
    p_discount_amount, p_final_amount, p_voucher_code, 'pending_payment'::order_status,
    v_normalized_method::payment_method, 'pending'::payment_status, p_qr_code, p_pickup_time, p_note,
    v_payment_expires_at, v_pickup_token, p_recipient_name, p_recipient_phone, NOW(), NOW()
  );

  -- 7. Đồng bộ SĐT người nhận nếu có
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

  -- 9. Lưu idempotency key
  INSERT INTO public.idempotency_keys (id, user_id, key, request_hash, response, expires_at, created_at)
  VALUES (gen_random_uuid(), p_customer_id, p_idempotency_key, p_idempotency_key, json_build_object('orderId', p_id), NOW() + INTERVAL '7 days', NOW());

  RETURN json_build_object(
    'success', true,
    'is_duplicate', false,
    'order_id', p_id,
    'pickup_token', v_pickup_token,
    'expires_at', v_payment_expires_at,
    'status', 'pending_payment'
  );
END;
$function$;

-- Wrapper place_order gọi create_order_transaction
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

GRANT EXECUTE ON FUNCTION public.create_order_transaction(
  uuid, uuid, uuid, text, jsonb, text, timestamp with time zone, text, text,
  integer, integer, integer, integer, text, text, text
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.place_order(
  uuid, uuid, text, jsonb, text, timestamp with time zone, text, text,
  integer, integer, integer, integer, text, text, text
) TO authenticated, service_role;

-- 5. Cập nhật list_bags_nearby để ẩn các túi archived/expired khỏi mục Khám phá
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
  v_today  DATE;
  v_now_time TIME;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  v_point  := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  v_today  := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_now_time := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;

  -- Đếm tổng số lượng túi khả dụng (không tính túi archived/expired, loại trừ túi today_only đã qua giờ)
  SELECT COUNT(*) INTO v_total
  FROM surprise_bags b
  INNER JOIN stores s ON s.id = b.store_id
  WHERE b.deleted_at IS NULL
    AND b.is_available = true
    AND b.quantity > 0
    AND COALESCE(b.status, 'active') = 'active'
    -- Loại 2: Hạn sử dụng chưa qua ngày hôm nay
    AND (b.expiry_date IS NULL OR b.expiry_date >= v_today)
    -- Loại 1 today_only: Chưa qua giờ nhận hôm nay
    AND (COALESCE(b.bag_type, 'daily') != 'daily' OR COALESCE(b.repeat_mode, 'today_only') != 'today_only' OR b.pickup_end IS NULL OR v_now_time <= b.pickup_end)
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
    AND COALESCE(b.status, 'active') = 'active'
    AND (b.expiry_date IS NULL OR b.expiry_date >= v_today)
    AND (COALESCE(b.bag_type, 'daily') != 'daily' OR COALESCE(b.repeat_mode, 'today_only') != 'today_only' OR b.pickup_end IS NULL OR v_now_time <= b.pickup_end)
    AND s.deleted_at IS NULL
    AND s.status = 'active'
    AND ST_DWithin(s.location, v_point, p_radius)
    AND (p_category IS NULL OR b.category::TEXT = p_category)
  ORDER BY ST_Distance(s.location, v_point) ASC
  LIMIT p_limit
  OFFSET v_offset;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_bags_nearby(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT, INTEGER, INTEGER) TO authenticated, service_role, anon;
