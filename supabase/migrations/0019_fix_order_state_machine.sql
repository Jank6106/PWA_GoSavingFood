-- 0019_fix_order_state_machine.sql
-- 1. Xóa hàm cũ 4 tham số để tránh lỗi PostgreSQL Function Ambiguity (42725: is not unique)
DROP FUNCTION IF EXISTS public.transition_order_status_transaction(uuid, text, uuid, text);

-- 2. Cập nhật hoàn thiện transition_order_status_transaction:
--    - Cho phép pending -> preparing (Quán xác nhận đơn tiền mặt và bắt đầu chuẩn bị món)
--    - Cho phép ready_for_pickup -> completed (Quán quét QR hoặc bấm hoàn tất giao hàng tại quầy)
--    - Cho phép merchant hủy đơn khi ở ready_for_pickup (Quá giờ hẹn khách không đến hoặc quán sự cố)
--    - Tự động hoàn tồn kho túi surprise_bags khi hủy đơn
--    - Lưu lý do hủy p_reason và stamp cancelled_at

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

  -- 3. State machine hoàn chỉnh cho cả tiền mặt & online
  IF v_current_status = 'pending' AND p_target_status NOT IN ('confirmed', 'preparing', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'confirmed' AND p_target_status NOT IN ('preparing', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'preparing' AND p_target_status NOT IN ('ready_for_pickup', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'ready_for_pickup' AND p_target_status NOT IN ('picked_up', 'completed', 'cancelled') THEN
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

  -- 4. RBAC Kiểm tra quyền theo vai trò
  IF p_actor_role = 'admin' OR p_actor_role = 'system' THEN
    NULL;
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

  -- 5. Cập nhật trạng thái
  v_updated_status := p_target_status;
  v_updated_payment_status := v_payment_status;

  IF p_target_status = 'completed' THEN
    v_completed_at := NOW();
  END IF;

  -- Khi hủy đơn: hoàn tồn kho túi và xử lý refund nếu có
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

    IF v_voucher_code IS NOT NULL AND v_voucher_code != '' THEN
      UPDATE public.vouchers
      SET used_count = GREATEST(0, used_count - 1),
          updated_at = NOW()
      WHERE code = v_voucher_code AND deleted_at IS NULL;
    END IF;

    IF v_payment_method != 'cash' AND v_payment_status = 'success' THEN
      v_updated_payment_status := 'refunded';
    END IF;
  END IF;

  IF p_target_status = 'refunded' THEN
    v_updated_payment_status := 'refunded';
  END IF;

  -- Cập nhật dòng đơn hàng
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

-- 3. Cấp quyền thực thi
REVOKE EXECUTE ON FUNCTION public.transition_order_status_transaction(uuid, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_order_status_transaction(uuid, text, uuid, text, text) TO authenticated, service_role;
