-- 0029_cancel_order_policy_and_noshow.sql
-- 1. Cập nhật transition_order_status_transaction:
--    - Nhận thêm p_bank_info (JSONB) lưu thông tin tài khoản ngân hàng khách nhập khi hủy đơn đã thanh toán
--    - RBAC: Khách chỉ được hủy khi 'pending_payment' hoặc 'paid'. Khóa chặt khi 'preparing' hoặc 'ready_for_pickup'
--    - Tự động hoàn kho, hoàn voucher, set pickup_token = NULL, payos_qr_code = NULL
--    - Gửi thông báo cho quán khi khách hủy đơn đã thanh toán
-- 2. Thêm hàm expire_noshow_orders:
--    - Đơn 'ready_for_pickup' quá 15 phút sau khung giờ pickup_end của túi -> status = 'expired'
--    - KHÔNG HOÀN TIỀN (quán giữ doanh thu) & KHÔNG HOÀN KHO (món hủy cuối ngày)
--    - Gửi thông báo cho cả 2 bên
-- 3. Cập nhật expire_unpaid_orders gọi cả cleanup_expired_pending_orders và expire_noshow_orders

-- Drop chữ ký hàm 5 tham số cũ để tránh lỗi "cannot remove parameter defaults" khi overload
DROP FUNCTION IF EXISTS public.transition_order_status_transaction(uuid, text, uuid, text, text);

-- 1. Hàm chính transition_order_status_transaction với p_bank_info
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
  v_item RECORD;
  v_owns_store BOOLEAN;
  v_updated_status TEXT;
  v_updated_payment_status TEXT;
  v_completed_at TIMESTAMPTZ;
  v_cancelled_at TIMESTAMPTZ;
  v_cancel_reason TEXT;
  v_pickup_token UUID;
  v_store_owner UUID;
  v_order_label TEXT;
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

  v_order_label := 'GSF-' || UPPER(SUBSTRING(p_order_id::text, 1, 6));

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
      -- Khách CHỈ được hủy khi đơn ở pending_payment hoặc paid (quán chưa làm)
      IF v_current_status IN ('preparing', 'ready_for_pickup') THEN
        RAISE EXCEPTION 'CANNOT_CANCEL_PREPARING' USING DETAIL = 'Cửa hàng đang chuẩn bị món hoặc món đã sẵn sàng, không thể hủy đơn.';
      END IF;
      IF v_current_status NOT IN ('pending', 'pending_payment', 'paid') THEN
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

  -- 5. XỬ LÝ HỦY ĐƠN: Hoàn tồn kho, hoàn voucher, tạo yêu cầu hoàn tiền tách biệt, xóa token
  IF p_target_status = 'cancelled' THEN
    v_cancelled_at := NOW();
    v_cancel_reason := COALESCE(p_reason, 'Hủy đơn hàng');

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

    -- Hoàn tiền VietQR: Nếu đơn đã thanh toán (payment_status = 'success' hoặc status = 'paid')
    IF v_payment_status = 'success' OR v_current_status = 'paid' THEN
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

      -- Nếu khách hủy đơn đã trả tiền: Bắn thông báo cho Chủ quán biết
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
    END IF;

    -- Thu hồi mã nhận hàng & dọn dẹp mã thanh toán
    v_pickup_token := NULL;
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
      pickup_token = v_pickup_token,
      payos_qr_code = CASE WHEN p_target_status IN ('cancelled', 'completed', 'expired') THEN NULL ELSE payos_qr_code END,
      payos_description = CASE WHEN p_target_status IN ('cancelled', 'completed', 'expired') THEN NULL ELSE payos_description END,
      payos_account_number = CASE WHEN p_target_status IN ('cancelled', 'completed', 'expired') THEN NULL ELSE payos_account_number END,
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

GRANT EXECUTE ON FUNCTION public.transition_order_status_transaction(uuid, text, uuid, text, text, jsonb) TO authenticated, service_role;

-- 2. Hàm expire_noshow_orders: Quá 15 phút sau khung giờ pickup_end của túi -> Hủy no-show (KHÔNG hoàn tiền, KHÔNG hoàn kho)
CREATE OR REPLACE FUNCTION public.expire_noshow_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_noshow_count INT := 0;
  v_order_label TEXT;
BEGIN
  FOR v_order IN
    SELECT o.id, o.store_id, o.customer_id, s.owner_user_id
    FROM public.orders o
    JOIN public.stores s ON s.id = o.store_id
    WHERE o.status = 'ready_for_pickup'
      AND o.deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.order_items oi
        JOIN public.surprise_bags sb ON sb.id = oi.bag_id
        WHERE oi.order_id = o.id
          AND sb.pickup_end IS NOT NULL
          AND NOW() > (
            ((o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + sb.pickup_end + 
             (CASE WHEN sb.pickup_start IS NOT NULL AND sb.pickup_start > sb.pickup_end THEN INTERVAL '1 day 15 minutes' ELSE INTERVAL '15 minutes' END)
            ) AT TIME ZONE 'Asia/Ho_Chi_Minh'
          )
      )
    FOR UPDATE OF o
  LOOP
    -- 1. Đóng đơn: KHÔNG HOÀN TIỀN (payment_status giữ nguyên), KHÔNG HOÀN TỒN KHO, VÔ HIỆU HÓA TOKEN
    UPDATE public.orders
    SET status = 'expired'::order_status,
        updated_at = NOW(),
        cancelled_at = NOW(),
        cancel_reason = 'Khách không đến nhận món quá 15 phút sau giờ hẹn (No-show)',
        pickup_token = NULL,
        payos_qr_code = NULL
    WHERE id = v_order.id;

    v_order_label := 'GSF-' || UPPER(SUBSTRING(v_order.id::text, 1, 6));

    -- 2. Gửi thông báo cho Khách hàng: Không hoàn tiền
    BEGIN
      INSERT INTO public.notifications (id, user_id, icon, title, body, data)
      VALUES (
        gen_random_uuid(),
        v_order.customer_id,
        'order',
        'Đơn hàng đã hết hạn nhận món ⏰',
        'Đơn hàng #' || v_order_label || ' đã bị đóng do bạn không đến nhận quá 15 phút sau giờ hẹn. Theo chính sách bảo vệ thực phẩm, đơn hàng này không được hoàn tiền.',
        jsonb_build_object('orderId', v_order.id, 'status', 'expired', 'noshow', true)
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 3. Gửi thông báo cho Chủ quán: Doanh thu vẫn được ghi nhận
    IF v_order.owner_user_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.notifications (id, user_id, icon, title, body, data)
        VALUES (
          gen_random_uuid(),
          v_order.owner_user_id,
          'order',
          'Đơn hàng tự động đóng (Khách không đến nhận)',
          'Đơn ' || v_order_label || ' đã tự động đóng sau 15 phút quá giờ lấy. Doanh thu đơn hàng vẫn được ghi nhận cho quán.',
          jsonb_build_object('orderId', v_order.id, 'status', 'expired', 'noshow', true)
        );
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;

    v_noshow_count := v_noshow_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'noshow_orders_count', v_noshow_count);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.expire_noshow_orders() TO authenticated, service_role, anon;

-- 3. Cập nhật expire_unpaid_orders (pg_cron chạy mỗi 5 phút) để quét cả đơn chưa trả tiền và đơn no-show
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.cleanup_expired_pending_orders();
  PERFORM public.expire_noshow_orders();
END;
$function$;

GRANT EXECUTE ON FUNCTION public.expire_unpaid_orders() TO authenticated, service_role, anon;
