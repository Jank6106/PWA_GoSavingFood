-- 0018_fix_order_cancellation.sql
-- 1. Sửa lỗi enum 'processing' trong trigger notify_customer_order_status
--    Enum order_status chỉ có ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'completed', 'cancelled', 'refund_requested', 'refunded').
--    Giá trị 'processing' không tồn tại gây lỗi 22P02 invalid input value khi cập nhật đơn hàng.

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

  IF (NEW.status IN ('confirmed', 'preparing') AND OLD.status = 'pending') THEN
    v_title := 'Đơn hàng đã được xác nhận';
    v_body := 'Cửa hàng đã xác nhận đơn hàng ' || v_order_label || ' và đang chuẩn bị món';
  ELSIF NEW.status = 'ready_for_pickup' THEN
    v_title := 'Đơn hàng sẵn sàng nhận';
    v_body := 'Đơn hàng ' || v_order_label || ' đã sẵn sàng để nhận';
  ELSIF NEW.status = 'completed' THEN
    v_title := 'Đơn hàng đã hoàn thành';
    v_body := 'Cảm ơn bạn đã giải cứu thực phẩm cùng GoSavingFood!';
  ELSIF NEW.status = 'cancelled' THEN
    v_title := 'Đơn hàng đã hủy';
    v_body := 'Đơn hàng ' || v_order_label || ' đã được hủy';
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

-- 2. Cập nhật transition_order_status_transaction:
--    - Cho phép Merchant hủy đơn khi đơn ở các trạng thái ('pending', 'confirmed', 'preparing', 'ready_for_pickup')
--      (Bổ sung 'ready_for_pickup' cho trường hợp quá giờ lấy hàng khách không đến nhận hoặc quán sự cố).
--    - Nhận thêm p_reason text DEFAULT NULL để lưu trực tiếp cancel_reason khi hủy đơn.

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
BEGIN
  -- 1. Lock đơn và đọc thông tin
  SELECT status, customer_id, store_id, created_at, pickup_time, payment_method, payment_status, voucher_code, completed_at, cancelled_at, cancel_reason
  INTO v_current_status, v_customer_id, v_store_id, v_created_at, v_pickup_time, v_payment_method, v_payment_status, v_voucher_code, v_completed_at, v_cancelled_at, v_cancel_reason
  FROM public.orders
  WHERE id = p_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING DETAIL = p_order_id::TEXT;
  END IF;

  -- 2. Chặn chuyển trùng trạng thái
  IF v_current_status = p_target_status THEN
    RAISE EXCEPTION 'DUPLICATE_TRANSITION' USING DETAIL = p_target_status;
  END IF;

  -- 3. State machine
  IF v_current_status = 'pending' AND p_target_status NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'confirmed' AND p_target_status NOT IN ('preparing', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'preparing' AND p_target_status NOT IN ('ready_for_pickup', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'ready_for_pickup' AND p_target_status NOT IN ('picked_up', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'picked_up' AND p_target_status != 'completed' THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'completed' AND p_target_status != 'refund_requested' THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'refund_requested' AND p_target_status NOT IN ('refunded', 'completed') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status IN ('cancelled', 'refunded') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  END IF;

  -- 4. RBAC
  IF p_actor_role = 'admin' OR p_actor_role = 'system' THEN
    -- Admin & System được chuyển mọi trạng thái hợp lệ
  ELSIF p_actor_role = 'customer' THEN
    IF p_actor_id != v_customer_id THEN
      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Not order owner';
    END IF;

    IF p_target_status = 'cancelled' THEN
      IF v_current_status NOT IN ('pending', 'confirmed', 'preparing') THEN
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
      -- Cho phép Merchant hủy đơn từ pending, confirmed, preparing, ready_for_pickup
      IF v_current_status NOT IN ('pending', 'confirmed', 'preparing', 'ready_for_pickup') THEN
        RAISE EXCEPTION 'INVALID_CANCEL_STATE' USING DETAIL = v_current_status;
      END IF;
    ELSIF p_target_status IN ('confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'completed') THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Merchants cannot perform this transition';
    END IF;
  ELSE
    RAISE EXCEPTION 'UNAUTHORIZED' USING DETAIL = p_actor_role;
  END IF;

  -- 5. Additional Precondition Check for ready_for_pickup -> cancelled (Expiry System check)
  IF v_current_status = 'ready_for_pickup' AND p_target_status = 'cancelled' THEN
    -- Expiry cancel by system/merchant/admin
  END IF;

  -- 6. Apply side effects
  v_updated_status := p_target_status;
  v_updated_payment_status := v_payment_status;

  -- Picked up transitions completions
  IF p_target_status = 'completed' THEN
    v_completed_at := NOW();
  END IF;

  -- If status is cancelled, restore bag quantities
  IF p_target_status = 'cancelled' THEN
    v_cancelled_at := NOW();
    IF p_reason IS NOT NULL AND p_reason != '' THEN
      v_cancel_reason := p_reason;
    END IF;

    FOR v_item IN SELECT bag_id, quantity FROM public.order_items WHERE order_id = p_order_id AND deleted_at IS NULL LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_item.quantity,
          updated_at = NOW()
      WHERE id = v_item.bag_id;
    END LOOP;

    -- Decrement voucher used count if code was applied
    IF v_voucher_code IS NOT NULL AND v_voucher_code != '' THEN
      UPDATE public.vouchers
      SET used_count = GREATEST(0, used_count - 1),
          updated_at = NOW()
      WHERE code = v_voucher_code AND deleted_at IS NULL;
    END IF;

    -- If online payment was successful, refund it
    IF v_payment_method != 'cash' AND v_payment_status = 'success' THEN
      v_updated_payment_status := 'refunded';
    END IF;
  END IF;

  -- If status transitions to refunded, update payment status
  IF p_target_status = 'refunded' THEN
    v_updated_payment_status := 'refunded';
  END IF;

  -- Update order row
  UPDATE public.orders
  SET status = v_updated_status::order_status,
      payment_status = v_updated_payment_status::payment_status,
      completed_at = v_completed_at,
      cancelled_at = v_cancelled_at,
      cancel_reason = v_cancel_reason,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', v_updated_status,
    'payment_status', v_updated_payment_status
  );
END;
$function$;

-- 3. Cập nhật các đơn đã có cancel_reason nhưng trước đó bị kẹt ở pending do lỗi trigger
UPDATE public.orders
SET status = 'cancelled'::order_status,
    updated_at = NOW()
WHERE cancel_reason IS NOT NULL
  AND status = 'pending';
