-- 0009_app_support.sql
-- Hỗ trợ PWA Customer + Merchant:
--   1. Cột orders.cancel_reason / orders.cancelled_at
--   2. Trigger tự stamp cancelled_at khi đơn chuyển sang 'cancelled'
--   3. RPC update_order_note        — khách cập nhật ghi chú đơn CỦA MÌNH
--   4. RPC set_order_cancel_reason  — khách/chủ quán lưu lý do hủy
--   5. RLS: chủ quán xem được hồ sơ khách hàng đã đặt đơn tại quán mình
-- Lưu ý: chạy qua `node scripts/db-migrate.mjs` (tự bọc transaction).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE OR REPLACE FUNCTION public.stamp_order_cancelled_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW());
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS stamp_order_cancelled_at ON public.orders;
CREATE TRIGGER stamp_order_cancelled_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_order_cancelled_at();

CREATE OR REPLACE FUNCTION public.update_order_note(p_order_id uuid, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT customer_id INTO v_customer_id
  FROM public.orders
  WHERE id = p_order_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING DETAIL = p_order_id::text;
  END IF;

  IF v_customer_id != auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Not order owner';
  END IF;

  UPDATE public.orders
  SET note = p_note, updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_order_cancel_reason(p_order_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
  v_store_id uuid;
  v_is_owner boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT customer_id, store_id INTO v_customer_id, v_store_id
  FROM public.orders
  WHERE id = p_order_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING DETAIL = p_order_id::text;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = v_store_id AND owner_user_id = auth.uid() AND deleted_at IS NULL
  ) INTO v_is_owner;

  IF v_customer_id != auth.uid() AND NOT v_is_owner THEN
    RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Not order owner or store owner';
  END IF;

  UPDATE public.orders
  SET cancel_reason = p_reason,
      cancelled_at = COALESCE(cancelled_at, NOW()),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_order_note(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_order_cancel_reason(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_order_note(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_order_cancel_reason(uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Store owners can view their customers" ON public.users;
CREATE POLICY "Store owners can view their customers"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE o.customer_id = public.users.id
        AND s.owner_user_id = auth.uid()
        AND o.deleted_at IS NULL
    )
  );
