-- 0010_order_notifications.sql
-- Sinh thông báo THẬT (bảng public.notifications) theo vòng đời đơn hàng:
--   - Đơn mới  → báo cho chủ quán
--   - ready_for_pickup / completed / cancelled → báo cho khách hàng
-- Lưu ý: chạy qua `node scripts/db-migrate.mjs` (tự bọc transaction).

CREATE OR REPLACE FUNCTION public.notify_store_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_store_name text;
BEGIN
  SELECT owner_user_id, name INTO v_owner, v_store_name
  FROM public.stores
  WHERE id = NEW.store_id AND deleted_at IS NULL;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (id, user_id, icon, title, body, data)
    VALUES (
      gen_random_uuid(),
      v_owner,
      'order',
      'Đơn hàng mới',
      'Bạn có đơn hàng mới từ khách hàng',
      jsonb_build_object('orderId', NEW.id, 'status', NEW.status, 'storeName', v_store_name)
    );
  END IF;

  RETURN NEW;
END;
$function$;

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

  v_order_label := COALESCE(NEW.qr_code, NEW.id::text);

  IF NEW.status = 'ready_for_pickup' THEN
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

DROP TRIGGER IF EXISTS notify_store_new_order ON public.orders;
CREATE TRIGGER notify_store_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_store_new_order();

DROP TRIGGER IF EXISTS notify_customer_order_status ON public.orders;
CREATE TRIGGER notify_customer_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_order_status();
