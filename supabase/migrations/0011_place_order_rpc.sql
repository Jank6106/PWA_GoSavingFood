-- 0011_place_order_rpc.sql
-- PWA Customer cần tạo đơn bằng JWT người dùng, nhưng `create_order_transaction`
-- đã bị revoke khỏi role `authenticated` (migration 0007 hardening — hàm này
-- vốn dành cho backend dùng service_role).
--
-- Giải pháp: RPC wrapper `place_order` (SECURITY DEFINER) tự kiểm `auth.uid()`
-- và luôn dùng auth.uid() làm customer_id ⇒ khách chỉ tạo được đơn cho chính mình.
-- Hàm gốc giữ nguyên, backend cũ vẫn hoạt động.
-- Lưu ý: chạy qua `node scripts/db-migrate.mjs`.

CREATE OR REPLACE FUNCTION public.place_order(
  p_id uuid,
  p_store_id uuid,
  p_idempotency_key text,
  p_items jsonb,
  p_voucher_code text,
  p_pickup_time timestamp with time zone,
  p_payment_method text,
  p_note text,
  p_total_original_price integer,
  p_total_discount_price integer,
  p_discount_amount integer,
  p_final_amount integer,
  p_qr_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  RETURN public.create_order_transaction(
    p_id,
    auth.uid(),
    p_store_id,
    p_idempotency_key,
    p_items,
    p_voucher_code,
    p_pickup_time,
    p_payment_method,
    p_note,
    p_total_original_price,
    p_total_discount_price,
    p_discount_amount,
    p_final_amount,
    p_qr_code
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.place_order(
  uuid, uuid, text, jsonb, text, timestamp with time zone, text, text,
  integer, integer, integer, integer, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.place_order(
  uuid, uuid, text, jsonb, text, timestamp with time zone, text, text,
  integer, integer, integer, integer, text
) TO authenticated, service_role;
