-- 0012_backend_fixes.sql
-- Sửa 3 lỗi thật phát hiện qua smoke test:
--   1. update_store_location_and_fields: lỗi "column reference id is ambiguous" (42702)
--   2. transition_order_status_transaction: merchant không thể xác nhận đơn 'pending'
--   3. Thiếu GRANT SELECT bảng public.users cho authenticated
--      (RLS sẵn có: chủ quán xem khách của đơn mình / user xem chính mình / admin xem tất cả)
-- Lưu ý: chạy qua `node scripts/db-migrate.mjs`.

-- (1) Fix bug ambiguous "id" trong update_store_location_and_fields
CREATE OR REPLACE FUNCTION public.update_store_location_and_fields(
  p_owner_user_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_updates jsonb
)
RETURNS TABLE(
  id uuid, owner_user_id uuid, name text, description text, phone text, address text,
  logo_url text, banner_url text, rating real, total_ratings integer, status merchant_status,
  commission_rate real, food_categories text[], open_time time without time zone,
  close_time time without time zone, is_open boolean, created_at timestamp with time zone,
  updated_at timestamp with time zone, deleted_at timestamp with time zone,
  latitude double precision, longitude double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_store_id uuid;
BEGIN
  SELECT s.id INTO v_store_id
  FROM public.stores s
  WHERE s.owner_user_id = p_owner_user_id AND s.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.stores
  SET location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      updated_at = NOW()
  WHERE stores.id = v_store_id;

  IF p_updates ? 'name' THEN
    UPDATE public.stores SET name = (p_updates->>'name'), updated_at = NOW() WHERE stores.id = v_store_id;
  END IF;
  IF p_updates ? 'description' THEN
    UPDATE public.stores SET description = (p_updates->>'description'), updated_at = NOW() WHERE stores.id = v_store_id;
  END IF;
  IF p_updates ? 'phone' THEN
    UPDATE public.stores SET phone = (p_updates->>'phone'), updated_at = NOW() WHERE stores.id = v_store_id;
  END IF;
  IF p_updates ? 'address' THEN
    UPDATE public.stores SET address = (p_updates->>'address'), updated_at = NOW() WHERE stores.id = v_store_id;
  END IF;
  IF p_updates ? 'logo_url' THEN
    UPDATE public.stores SET logo_url = (p_updates->>'logo_url'), updated_at = NOW() WHERE stores.id = v_store_id;
  END IF;
  IF p_updates ? 'banner_url' THEN
    UPDATE public.stores SET banner_url = (p_updates->>'banner_url'), updated_at = NOW() WHERE stores.id = v_store_id;
  END IF;
  IF p_updates ? 'food_categories' THEN
    UPDATE public.stores SET food_categories = ARRAY(SELECT jsonb_array_elements_text(p_updates->'food_categories')), updated_at = NOW() WHERE stores.id = v_store_id;
  END IF;
  IF p_updates ? 'open_time' THEN
    UPDATE public.stores SET open_time = (p_updates->>'open_time')::TIME, updated_at = NOW() WHERE stores.id = v_store_id;
  END IF;
  IF p_updates ? 'close_time' THEN
    UPDATE public.stores SET close_time = (p_updates->>'close_time')::TIME, updated_at = NOW() WHERE stores.id = v_store_id;
  END IF;
  IF p_updates ? 'is_open' THEN
    UPDATE public.stores SET is_open = (p_updates->>'is_open')::BOOLEAN, updated_at = NOW() WHERE stores.id = v_store_id;
  END IF;

  RETURN QUERY
  SELECT s.id, s.owner_user_id, s.name, s.description, s.phone, s.address,
         s.logo_url, s.banner_url, s.rating, s.total_ratings, s.status, s.commission_rate,
         s.food_categories, s.open_time, s.close_time, s.is_open, s.created_at, s.updated_at,
         s.deleted_at, s.latitude, s.longitude
  FROM public.stores s
  WHERE s.id = v_store_id;
END;
$function$;

-- (3) Cho authenticated đọc bảng users (RLS giới hạn phạm vi)
GRANT SELECT ON public.users TO authenticated;
-- (2) Fix bug: merchant không thể 'confirmed' đơn pending (đơn tiền mặt bị kẹt)
CREATE OR REPLACE FUNCTION public.transition_order_status_transaction(
  p_order_id uuid,
  p_target_status text,
  p_actor_id uuid,
  p_actor_role text
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
BEGIN
  -- 1. Lock đơn và đọc thông tin
  SELECT status, customer_id, store_id, created_at, pickup_time, payment_method, payment_status, voucher_code, completed_at
  INTO v_current_status, v_customer_id, v_store_id, v_created_at, v_pickup_time, v_payment_method, v_payment_status, v_voucher_code, v_completed_at
  FROM public.orders
  WHERE id = p_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING DETAIL = p_order_id::TEXT;
  END IF;

  -- 2. Chặn chuyển trùng trạng thái
  IF v_current_status = p_target_status THEN
    RAISE EXCEPTION 'DUPLICATE_TRANSITION' USING DETAIL = p_target_status;
  END IF;

  -- 3. State machine
  IF v_current_status = 'pending' AND p_target_status NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'confirmed' AND p_target_status NOT IN ('preparing', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'preparing' AND p_target_status NOT IN ('ready_for_pickup', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'ready_for_pickup' AND p_target_status NOT IN ('picked_up', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'picked_up' AND p_target_status != 'completed' THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'completed' AND p_target_status != 'refund_requested' THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'refund_requested' AND p_target_status NOT IN ('refunded', 'completed') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status IN ('cancelled', 'refunded') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  END IF;

  -- 4. RBAC
  IF p_actor_role = 'admin' OR p_actor_role = 'system' THEN
    -- Admin & System được chuyển mọi trạng thái hợp lệ
  ELSIF p_actor_role = 'customer' THEN
    IF p_actor_id != v_customer_id THEN
      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Not order owner';
    END IF;

    IF p_target_status = 'cancelled' THEN
      IF v_current_status NOT IN ('pending', 'confirmed', 'preparing') THEN
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
      IF v_current_status NOT IN ('pending', 'confirmed', 'preparing') THEN
        RAISE EXCEPTION 'INVALID_CANCEL_STATE' USING DETAIL = v_current_status;
      END IF;
    ELSIF p_target_status IN ('confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'completed') THEN
      -- FIX 0012: bổ sung 'confirmed' để merchant xác nhận đơn pending (đơn tiền mặt)
      NULL;
    ELSE
      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Merchants cannot perform this transition';
    END IF;
  ELSE
    RAISE EXCEPTION 'UNAUTHORIZED' USING DETAIL = p_actor_role;
  END IF;

  -- 5. Additional Precondition Check for ready_for_pickup -> cancelled (Expiry System check)
  IF v_current_status = 'ready_for_pickup' AND p_target_status = 'cancelled' THEN
    -- Expiry cancel by system/merchant/admin
  END IF;

  -- 6. Apply side effects
  v_updated_status := p_target_status;
  v_updated_payment_status := v_payment_status;
  v_completed_at := v_completed_at;

  -- Picked up transitions completions
  IF p_target_status = 'completed' THEN
    v_completed_at := NOW();
  END IF;

  -- If status is cancelled, restore bag quantities
  IF p_target_status = 'cancelled' THEN
    FOR v_item IN SELECT bag_id, quantity FROM public.order_items WHERE order_id = p_order_id AND deleted_at IS NULL LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_item.quantity,
          updated_at = NOW()
      WHERE id = v_item.bag_id;
    END LOOP;

    -- Decrement voucher used count if code was applied
    IF v_voucher_code IS NOT NULL AND v_voucher_code != '' THEN
      UPDATE public.vouchers
      SET used_count = GREATEST(0, used_count - 1),
          updated_at = NOW()
      WHERE code = v_voucher_code AND deleted_at IS NULL;
    END IF;

    -- If online payment was successful, refund it
    IF v_payment_method != 'cash' AND v_payment_status = 'success' THEN
      v_updated_payment_status := 'refunded';
    END IF;
  END IF;

  -- If status transitions to refunded, update payment status
  IF p_target_status = 'refunded' THEN
    v_updated_payment_status := 'refunded';
  END IF;

  -- Update order row
  UPDATE public.orders
  SET status = v_updated_status::order_status,
      payment_status = v_updated_payment_status::payment_status,
      completed_at = v_completed_at,
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
