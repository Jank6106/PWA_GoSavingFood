-- 0013_notify_order_confirmed.sql
-- Thêm thông báo cho Khách hàng khi Cửa hàng xác nhận đơn (pending -> confirmed / preparing)

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
