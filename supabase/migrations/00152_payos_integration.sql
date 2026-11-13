-- 0015_payos_integration.sql
-- Thêm các trường hỗ trợ lưu trữ thông tin cổng thanh toán PayOS và hàm xác nhận thanh toán tự động qua Webhook

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_order_code BIGINT UNIQUE,
ADD COLUMN IF NOT EXISTS payment_link_id TEXT,
ADD COLUMN IF NOT EXISTS checkout_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_payment_order_code ON public.orders(payment_order_code);

-- Hàm RPC cập nhật thanh toán thành công khi nhận Webhook từ PayOS (SECURITY DEFINER)
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
  SELECT * INTO v_order FROM public.orders WHERE payment_order_code = p_order_code;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  END IF;

  IF v_order.payment_status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'message', 'ALREADY_PAID', 'order_id', v_order.id);
  END IF;

  UPDATE public.orders
  SET 
    payment_status = 'success',
    status = CASE WHEN status = 'pending' THEN 'confirmed'::order_status ELSE status END,
    payment_link_id = COALESCE(p_payment_link_id, payment_link_id),
    updated_at = NOW()
  WHERE id = v_order.id;

  -- Tạo thông báo tự động cho khách hàng
  BEGIN
    INSERT INTO public.notifications (
      user_id,
      title,
      content,
      type,
      reference_id,
      created_at
    ) VALUES (
      v_order.customer_id,
      'Thanh toán thành công 🎉',
      'Đơn hàng #' || v_order.id::text || ' đã được xác nhận thanh toán qua PayOS.',
      'order_update',
      v_order.id,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Bỏ qua nếu bảng notifications không khớp schema
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'order_id', v_order.id);
END;
$function$;
