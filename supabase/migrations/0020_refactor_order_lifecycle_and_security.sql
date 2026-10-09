-- 0020_refactor_order_lifecycle_and_security.sql
-- 1. Cập nhật các giá trị Enum cho Máy trạng thái chuẩn hóa
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refund_pending';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'payos_vietqr';

-- 2. Bổ sung các cột bảo mật và TTL vào bảng orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
ADD COLUMN IF NOT EXISTS pickup_token UUID DEFAULT gen_random_uuid();

-- Điền pickup_token cho các đơn hiện có nếu chưa có
UPDATE public.orders
SET pickup_token = gen_random_uuid()
WHERE pickup_token IS NULL;

-- Cập nhật default status cho đơn mới
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending_payment'::order_status;

CREATE INDEX IF NOT EXISTS idx_orders_pickup_token ON public.orders(pickup_token);
CREATE INDEX IF NOT EXISTS idx_orders_payment_expires_at ON public.orders(payment_expires_at);

-- 3. Tạo bảng refund_requests theo dõi yêu cầu hoàn tiền tách biệt
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  bank_account_info JSONB DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
  reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id ON public.refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_customer_id ON public.refund_requests(customer_id);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers view own refund requests" ON public.refund_requests;
CREATE POLICY "Customers view own refund requests" ON public.refund_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Service role manages refund requests" ON public.refund_requests;
CREATE POLICY "Service role manages refund requests" ON public.refund_requests
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Cập nhật create_order_transaction: Cấm tiền mặt, set status = pending_payment, TTL 15 phút, sinh pickup_token
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

    SELECT name, quantity, is_available, discount_price, store_id, expires_at
    INTO v_bag_name, v_current_stock, v_is_available, v_discount_price, v_store_id, v_expires_at
    FROM public.surprise_bags
    WHERE id = v_bag_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'BAG_NOT_FOUND' USING DETAIL = v_bag_id::TEXT;
    END IF;
    IF v_store_id != p_store_id THEN
      RAISE EXCEPTION 'STORE_MISMATCH' USING DETAIL = v_bag_id::TEXT;
    END IF;
    IF NOT v_is_available OR v_current_stock < v_quantity OR (v_expires_at IS NOT NULL AND NOW() > v_expires_at) THEN
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

-- 5. Cập nhật hàm RPC place_order wrapper cho customer
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

-- 6. Cập nhật confirm_payos_payment: Khi webhook PayOS báo thành công -> status chuyển sang 'paid'
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
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE payment_order_code = p_order_code FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  END IF;

  IF v_order.payment_status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'message', 'ALREADY_PAID', 'order_id', v_order.id);
  END IF;

  UPDATE public.orders
  SET 
    payment_status = 'success',
    status = CASE WHEN status IN ('pending', 'pending_payment') THEN 'paid'::order_status ELSE status END,
    payment_link_id = COALESCE(p_payment_link_id, payment_link_id),
    updated_at = NOW()
  WHERE id = v_order.id;

  -- Tạo thông báo tự động cho khách hàng với đúng schema của bảng notifications
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
      'Đơn hàng #' || v_order.id::text || ' đã được xác nhận thanh toán qua VietQR.',
      jsonb_build_object('orderId', v_order.id, 'status', 'paid'),
      false,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', 'paid');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.confirm_payos_payment(BIGINT, TEXT) TO authenticated, service_role;

-- 7. Sửa trigger thông báo cho Chủ quán (notify_store_new_order):
--    CHỈ kích hoạt khi payment_status CHUYỂN SANG 'success' hoặc status CHUYỂN SANG 'paid'
--    Triệt tiêu hoàn toàn báo động giả khi đơn vừa tạo còn pending_payment!
CREATE OR REPLACE FUNCTION public.notify_store_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_store_name text;
  v_order_label text;
BEGIN
  IF (TG_OP = 'UPDATE' AND (
        (OLD.payment_status != 'success' AND NEW.payment_status = 'success')
        OR (OLD.status != 'paid' AND NEW.status = 'paid')
     ))
     OR (TG_OP = 'INSERT' AND NEW.payment_status = 'success') THEN
     
    SELECT owner_user_id, name INTO v_owner, v_store_name
    FROM public.stores
    WHERE id = NEW.store_id AND deleted_at IS NULL;

    v_order_label := COALESCE(NEW.qr_code, 'GSF-' || UPPER(SUBSTRING(NEW.id::text, 1, 6)));

    IF v_owner IS NOT NULL THEN
      INSERT INTO public.notifications (id, user_id, icon, title, body, data)
      VALUES (
        gen_random_uuid(),
        v_owner,
        'order',
        'Đơn hàng mới đã thanh toán! 🎉',
        'Đơn ' || v_order_label || ' đã thanh toán thành công qua VietQR. Vui lòng xác nhận và chuẩn bị món.',
        jsonb_build_object('orderId', NEW.id, 'status', NEW.status, 'storeName', v_store_name)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_store_new_order ON public.orders;
CREATE TRIGGER notify_store_new_order
  AFTER INSERT OR UPDATE OF payment_status, status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_store_new_order();

-- 8. Cập nhật trigger thông báo cho Khách hàng (notify_customer_order_status)
CREATE OR REPLACE FUNCTION public.notify_customer_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
  v_body text;
  v_order_label text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_order_label := COALESCE(NEW.qr_code, 'GSF-' || UPPER(SUBSTRING(NEW.id::text, 1, 6)));

  IF NEW.status = 'paid' THEN
    v_title := 'Thanh toán thành công 🎉';
    v_body := 'Đơn hàng ' || v_order_label || ' đã thanh toán thành công. Quán sẽ xác nhận trong ít phút.';
  ELSIF NEW.status = 'preparing' THEN
    v_title := 'Quán đang chuẩn bị món 🍳';
    v_body := 'Quán đã xác nhận đơn ' || v_order_label || ' và đang chuẩn bị món ăn cho bạn.';
  ELSIF NEW.status = 'ready_for_pickup' THEN
    v_title := 'Đơn hàng sẵn sàng nhận 🛍️';
    v_body := 'Đơn ' || v_order_label || ' đã sẵn sàng! Vui lòng đến quán xuất trình mã QR để nhận món.';
  ELSIF NEW.status = 'completed' THEN
    v_title := 'Đơn hàng đã hoàn thành ✨';
    v_body := 'Cảm ơn bạn đã giải cứu thực phẩm cùng GoSavingFood!';
  ELSIF NEW.status = 'cancelled' THEN
    v_title := 'Đơn hàng đã hủy';
    IF NEW.payment_status = 'refund_pending' THEN
      v_body := 'Đơn hàng ' || v_order_label || ' đã được hủy. Yêu cầu hoàn tiền của bạn đang được xử lý bởi GoSavingFood.';
    ELSE
      v_body := 'Đơn hàng ' || v_order_label || ' đã được hủy.';
    END IF;
  ELSIF NEW.status = 'expired' THEN
    v_title := 'Đơn hàng đã hết hạn ⏰';
    v_body := 'Đơn hàng ' || v_order_label || ' đã hết thời gian chờ thanh toán.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (id, user_id, icon, title, body, data)
  VALUES (
    gen_random_uuid(),
    NEW.customer_id,
    'order',
    v_title,
    v_body,
    jsonb_build_object('orderId', NEW.id, 'status', NEW.status)
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_customer_order_status ON public.orders;
CREATE TRIGGER notify_customer_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_order_status();

-- 9. Cập nhật transition_order_status_transaction:
--    - Máy trạng thái chuẩn hóa: pending_payment -> paid -> preparing -> ready_for_pickup -> completed
--    - RBAC siết chặt: Khách chỉ được hủy ở pending_payment / paid, KHÔNG ĐƯỢC hủy ở preparing
--    - Merchant bắt buộc có cancel_reason khi hủy
--    - Hoàn tiền tách biệt: payment_status = 'refund_pending' và ghi vào refund_requests, không tự set 'refunded'
CREATE OR REPLACE FUNCTION public.transition_order_status_transaction(
  p_order_id uuid,
  p_target_status text,
  p_actor_id uuid,
  p_actor_role text,
  p_reason text DEFAULT NULL
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
  v_item RECORD;
  v_owns_store BOOLEAN;
  v_updated_status TEXT;
  v_updated_payment_status TEXT;
  v_completed_at TIMESTAMPTZ;
  v_cancelled_at TIMESTAMPTZ;
  v_cancel_reason TEXT;
  v_pickup_token UUID;
BEGIN
  -- 1. Khóa đơn & đọc dữ liệu
  SELECT status, customer_id, store_id, final_amount, created_at, pickup_time, payment_method, payment_status, voucher_code, completed_at, cancelled_at, cancel_reason, pickup_token
  INTO v_current_status, v_customer_id, v_store_id, v_final_amount, v_created_at, v_pickup_time, v_payment_method, v_payment_status, v_voucher_code, v_completed_at, v_cancelled_at, v_cancel_reason, v_pickup_token
  FROM public.orders
  WHERE id = p_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING DETAIL = p_order_id::TEXT;
  END IF;

  IF v_current_status = p_target_status THEN
    RAISE EXCEPTION 'DUPLICATE_TRANSITION' USING DETAIL = p_target_status;
  END IF;

  -- 2. State Machine Transition Rules
  IF v_current_status IN ('pending', 'pending_payment') AND p_target_status NOT IN ('paid', 'confirmed', 'preparing', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status IN ('paid', 'confirmed') AND p_target_status NOT IN ('preparing', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'preparing' AND p_target_status NOT IN ('ready_for_pickup', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'ready_for_pickup' AND p_target_status NOT IN ('picked_up', 'completed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'picked_up' AND p_target_status != 'completed' THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'completed' AND p_target_status != 'refund_requested' THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'refund_requested' AND p_target_status NOT IN ('refunded', 'completed') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status IN ('cancelled', 'expired', 'refunded') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  END IF;

  -- 3. RBAC Kiểm tra quyền theo vai trò
  IF p_actor_role = 'admin' OR p_actor_role = 'system' THEN
    NULL;
  ELSIF p_actor_role = 'customer' THEN
    IF p_actor_id != v_customer_id THEN
      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Not order owner';
    END IF;

    IF p_target_status = 'cancelled' THEN
      -- Khách CHỈ được hủy khi đơn ở pending_payment, pending hoặc paid (chưa vào preparing)
      IF v_current_status IN ('preparing', 'ready_for_pickup') THEN
        RAISE EXCEPTION 'CANNOT_CANCEL_PREPARING' USING DETAIL = 'Cửa hàng đang chuẩn bị món, không thể tự hủy đơn. Vui lòng liên hệ cửa hàng hoặc hotline để được hỗ trợ.';
      END IF;
      IF v_current_status NOT IN ('pending', 'pending_payment', 'paid', 'confirmed') THEN
        RAISE EXCEPTION 'INVALID_CANCEL_STATE' USING DETAIL = v_current_status;
      END IF;
    ELSIF p_target_status = 'refund_requested' THEN
      IF v_current_status != 'completed' THEN
        RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = v_current_status;
      END IF;
      IF NOW() > v_created_at + INTERVAL '24 hours' THEN
        RAISE EXCEPTION 'REFUND_TIMEOUT' USING DETAIL = v_created_at::TEXT;
      END IF;
    ELSE
      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Customers cannot perform this transition';
    END IF;

  ELSIF p_actor_role = 'merchant' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = v_store_id AND owner_user_id = p_actor_id AND deleted_at IS NULL
    ) INTO v_owns_store;

    IF NOT v_owns_store THEN
      RAISE EXCEPTION 'FORBIDDEN_STORE' USING DETAIL = v_store_id::TEXT;
    END IF;

    IF p_target_status = 'cancelled' THEN
      -- Quán bắt buộc phải cung cấp cancel_reason
      IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'CANCEL_REASON_REQUIRED' USING DETAIL = 'Chủ quán bắt buộc phải cung cấp lý do hủy đơn.';
      END IF;

      IF v_current_status NOT IN ('pending', 'pending_payment', 'paid', 'confirmed', 'preparing', 'ready_for_pickup') THEN
        RAISE EXCEPTION 'INVALID_CANCEL_STATE' USING DETAIL = v_current_status;
      END IF;
    ELSIF p_target_status IN ('preparing', 'ready_for_pickup', 'picked_up', 'completed') THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Merchants cannot perform this transition';
    END IF;
  ELSE
    RAISE EXCEPTION 'UNAUTHORIZED' USING DETAIL = p_actor_role;
  END IF;

  -- 4. Cập nhật dữ liệu
  v_updated_status := p_target_status;
  v_updated_payment_status := v_payment_status;

  IF p_target_status = 'ready_for_pickup' AND v_pickup_token IS NULL THEN
    v_pickup_token := gen_random_uuid();
  END IF;

  IF p_target_status = 'completed' THEN
    v_completed_at := NOW();
  END IF;

  -- 5. Xử lý khi HỦY ĐƠN: Hoàn tồn kho, hoàn voucher, tạo yêu cầu hoàn tiền tách biệt
  IF p_target_status = 'cancelled' THEN
    v_cancelled_at := NOW();
    IF p_reason IS NOT NULL AND p_reason != '' THEN
      v_cancel_reason := p_reason;
    END IF;

    -- Hoàn tồn kho
    FOR v_item IN SELECT bag_id, quantity FROM public.order_items WHERE order_id = p_order_id AND deleted_at IS NULL LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_item.quantity,
          updated_at = NOW()
      WHERE id = v_item.bag_id;
    END LOOP;

    -- Hoàn voucher
    IF v_voucher_code IS NOT NULL AND v_voucher_code != '' THEN
      UPDATE public.vouchers
      SET used_count = GREATEST(0, used_count - 1),
          updated_at = NOW()
      WHERE code = v_voucher_code AND deleted_at IS NULL;
    END IF;

    -- Hoàn tiền VietQR: Chuyển sang refund_pending & lưu vào refund_requests (KHÔNG tự set refunded!)
    IF v_payment_status = 'success' THEN
      v_updated_payment_status := 'refund_pending';

      INSERT INTO public.refund_requests (
        order_id,
        customer_id,
        amount,
        reason,
        status,
        created_at,
        updated_at
      ) VALUES (
        p_order_id,
        v_customer_id,
        v_final_amount,
        v_cancel_reason,
        'pending',
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  IF p_target_status = 'refunded' THEN
    v_updated_payment_status := 'refunded';
  END IF;

  -- Cập nhật dòng orders
  UPDATE public.orders
  SET status = v_updated_status::order_status,
      payment_status = v_updated_payment_status::payment_status,
      completed_at = v_completed_at,
      cancelled_at = v_cancelled_at,
      cancel_reason = v_cancel_reason,
      pickup_token = COALESCE(v_pickup_token, pickup_token),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', v_updated_status,
    'payment_status', v_updated_payment_status,
    'pickup_token', v_pickup_token
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.transition_order_status_transaction(uuid, text, uuid, text, text) TO authenticated, service_role;

-- 10. RPC verify_pickup_qr: Đối soát bảo mật qua pickup_token ngẫu nhiên, không lộ orderCode
CREATE OR REPLACE FUNCTION public.verify_pickup_qr(
  p_token UUID,
  p_store_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE pickup_token = p_token
    AND store_id = p_store_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1 FROM public.orders
      WHERE pickup_token = p_token AND status = 'completed'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'ALREADY_COMPLETED', 'message', 'Đơn hàng này đã được bàn giao trước đó!');
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TOKEN', 'message', 'Mã QR không hợp lệ hoặc không thuộc cửa hàng này.');
  END IF;

  IF v_order.status != 'ready_for_pickup' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', 'Đơn hàng đang ở trạng thái "' || v_order.status::text || '", chưa sẵn sàng nhận.'
    );
  END IF;

  -- Hoàn thành đơn & vô hiệu hóa token
  UPDATE public.orders
  SET status = 'completed'::order_status,
      completed_at = NOW(),
      updated_at = NOW(),
      pickup_token = NULL
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_code', COALESCE(v_order.qr_code, 'GSF-' || UPPER(SUBSTRING(v_order.id::text, 1, 6))),
    'final_amount', v_order.final_amount,
    'status', 'completed'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verify_pickup_qr(UUID, UUID) TO authenticated, service_role;

-- 11. RPC cleanup_expired_pending_orders: Tự động nhả kho & voucher khi quá hạn TTL 15 phút
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_order IN
    SELECT id, voucher_code
    FROM public.orders
    WHERE status = 'pending_payment'
      AND payment_status = 'pending'
      AND payment_expires_at < NOW()
      AND deleted_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Hoàn trả tồn kho túi
    FOR v_item IN SELECT bag_id, quantity FROM public.order_items WHERE order_id = v_order.id AND deleted_at IS NULL LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_item.quantity,
          updated_at = NOW()
      WHERE id = v_item.bag_id;
    END LOOP;

    -- Hoàn trả lượt dùng voucher
    IF v_order.voucher_code IS NOT NULL AND v_order.voucher_code != '' THEN
      UPDATE public.vouchers
      SET used_count = GREATEST(0, used_count - 1),
          updated_at = NOW()
      WHERE code = v_order.voucher_code AND deleted_at IS NULL;
    END IF;

    -- Cập nhật đơn sang expired
    UPDATE public.orders
    SET status = 'expired'::order_status,
        cancel_reason = 'Hết thời hạn thanh toán (TTL 15 phút)',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = v_order.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired_orders_count', v_count);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_orders() TO anon, authenticated, service_role;
