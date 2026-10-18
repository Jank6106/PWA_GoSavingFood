-- 0028_add_payos_qr_cache_and_lifecycle_cleanup.sql
-- 1. Bổ sung các cột lưu tạm chuỗi mã QR, nội dung và STK PayOS trong 33 phút chờ thanh toán
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payos_qr_code TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payos_description TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payos_account_number TEXT DEFAULT NULL;

-- 2. Cập nhật confirm_payos_payment: Tự động dọn sạch (set NULL) chuỗi QR khi đơn đã thanh toán hoặc đã hoàn tiền
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

-- 3. Cập nhật cleanup_expired_pending_orders: Giải phóng payos_qr_code khi đơn hết hạn
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
        pickup_token = NULL,
        payos_qr_code = NULL,
        payos_description = NULL,
        payos_account_number = NULL
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
