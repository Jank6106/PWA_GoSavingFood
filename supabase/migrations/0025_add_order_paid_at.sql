-- 0025_add_order_paid_at.sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Backfill paid_at cho các đơn đã thanh toán thành công
UPDATE public.orders
SET paid_at = updated_at
WHERE (payment_status = 'success' OR status IN ('paid', 'ready_for_pickup', 'completed', 'picked_up'))
  AND paid_at IS NULL;

-- Cập nhật confirm_payos_payment để tự động set paid_at = NOW()
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
    paid_at = NOW(),
    status = CASE WHEN status IN ('pending', 'pending_payment') THEN 'paid'::order_status ELSE status END,
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
      'Đơn hàng #' || v_order.id::text || ' đã được xác nhận thanh toán qua VietQR.',
      jsonb_build_object('orderId', v_order.id, 'status', 'paid'),
      false,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Bỏ qua lỗi notification nếu có
  END;

  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', 'paid');
END;
$function$;
