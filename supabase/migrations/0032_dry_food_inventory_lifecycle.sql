-- ============================================================
-- 0032_dry_food_inventory_lifecycle.sql
-- 1. Cập nhật trigger auto_deactivate_bag trên surprise_bags:
--    - Khi quantity <= 0: Tự động gỡ khỏi kệ (is_available = false) và chuyển status = 'sold_out'
--    - Khi quantity > 0: Nếu đang ở sold_out hoặc is_available = false (và chưa bị archived/soft-delete) thì tự động kích hoạt lại lên kệ (is_available = true, status = 'active')
-- 2. Cập nhật expire_noshow_orders:
--    - Đơn No-show quá 15 phút sau khung giờ nhận: Chuyển 'expired'
--    - Do là đồ khô (dry food), BẮT BUỘC HOÀN LẠI SỐ LƯỢNG TÚI VỀ KHO (quantity = quantity + v_item.quantity)
--    - Doanh thu đơn hàng vẫn giữ nguyên cho Quán (payment_status giữ nguyên 'success')
-- ============================================================

-- 1. Trigger auto_deactivate_bag
CREATE OR REPLACE FUNCTION public.auto_deactivate_bag()
RETURNS TRIGGER AS $$
BEGIN
  -- A. Khi kho về 0: Tự động gỡ khỏi kệ (is_available = false) và đánh dấu status = 'sold_out'
  IF NEW.quantity <= 0 THEN
    NEW.quantity := 0;
    NEW.is_available := false;
    IF NEW.status = 'active' OR NEW.status IS NULL THEN
      NEW.status := 'sold_out';
    END IF;
  -- B. Khi kho > 0 và trước đó đang ở trạng thái hết hàng (sold_out) hoặc không khả dụng: Tự động đưa lên kệ lại
  ELSIF NEW.quantity > 0 AND (OLD.quantity = 0 OR NEW.is_available = false OR NEW.status = 'sold_out') AND NEW.deleted_at IS NULL AND COALESCE(NEW.status, 'sold_out') != 'archived' THEN
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

-- 2. Hàm expire_noshow_orders (hoàn kho cho đồ khô khi khách no-show)
CREATE OR REPLACE FUNCTION public.expire_noshow_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_item RECORD;
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
    -- 1. Đóng đơn: Giữ nguyên thanh toán (quán giữ doanh thu), VÔ HIỆU HÓA TOKEN
    UPDATE public.orders
    SET status = 'expired'::order_status,
        updated_at = NOW(),
        cancelled_at = NOW(),
        cancel_reason = 'Khách không đến nhận món quá 15 phút sau giờ hẹn (No-show)',
        pickup_token = NULL,
        payos_qr_code = NULL
    WHERE id = v_order.id;

    -- 2. Hoàn tồn kho túi hàng vì là đồ khô
    FOR v_item IN SELECT bag_id, quantity FROM public.order_items WHERE order_id = v_order.id AND deleted_at IS NULL LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_item.quantity,
          updated_at = NOW()
      WHERE id = v_item.bag_id;
    END LOOP;

    v_order_label := 'GSF-' || UPPER(SUBSTRING(v_order.id::text, 1, 6));

    -- 3. Gửi thông báo cho Khách hàng: Không hoàn tiền
    BEGIN
      INSERT INTO public.notifications (id, user_id, icon, title, body, data)
      VALUES (
        gen_random_uuid(),
        v_order.customer_id,
        'order',
        'Đơn hàng đã hết hạn nhận món ⏰',
        'Đơn hàng #' || v_order_label || ' đã bị đóng do bạn không đến nhận quá 15 phút sau giờ hẹn. Theo chính sách của quán, đơn hàng này không được hoàn tiền.',
        jsonb_build_object('orderId', v_order.id, 'status', 'expired', 'noshow', true)
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 4. Gửi thông báo cho Chủ quán: Doanh thu vẫn được ghi nhận & sản phẩm đã hoàn kho
    IF v_order.owner_user_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.notifications (id, user_id, icon, title, body, data)
        VALUES (
          gen_random_uuid(),
          v_order.owner_user_id,
          'order',
          'Đơn hàng tự động đóng (Khách không đến nhận)',
          'Đơn ' || v_order_label || ' đã tự động đóng sau 15 phút quá giờ lấy. Doanh thu vẫn ghi nhận cho quán và số lượng túi hàng đã được hoàn lại vào kho.',
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
