-- 0027_fix_cron_and_order_expiration.sql
-- Cập nhật hàm expire_unpaid_orders (được pg_cron gọi định kỳ mỗi 5 phút)
-- để tự động dọn dẹp các đơn pending_payment quá hạn và hoàn kho qua cleanup_expired_pending_orders
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_res JSONB;
BEGIN
  -- 1. Chạy dọn dẹp các đơn pending_payment quá hạn (33 phút TTL)
  v_res := public.cleanup_expired_pending_orders();

  -- 2. Dọn dẹp bổ sung cho các đơn pending cũ (nếu có)
  UPDATE public.orders
  SET status = 'expired'::order_status,
      updated_at = NOW(),
      cancelled_at = NOW(),
      cancel_reason = 'Hết thời hạn thanh toán (expire_unpaid_orders)',
      pickup_token = NULL
  WHERE status = 'pending'::order_status
    AND payment_status = 'pending'::payment_status
    AND created_at < NOW() - INTERVAL '33 minutes'
    AND deleted_at IS NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.expire_unpaid_orders() TO authenticated, service_role, anon;
