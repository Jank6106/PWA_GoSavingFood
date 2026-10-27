-- ==============================================================================
-- 0035_production_security_hardening.sql
-- TĂNG CƯỜNG BẢO MẬT & PHÒNG CHỐNG LỖ CỔNG TRUY CẬP (PRODUCTION HARDENING)
--
-- 1. Khóa lỗ hổng leo thang đặc quyền trong transition_order_status_transaction:
--    - Xác thực chặt chẽ auth.uid() của phiên đăng nhập thực tế.
--    - Không cho phép người dùng giả mạo p_actor_role = 'admin' nếu không phải admin thật trong public.users.
--    - Khách hàng (customer) chỉ được thao tác đơn của chính mình (auth.uid() = customer_id).
--    - Đối tác (merchant) chỉ được thao tác đơn của cửa hàng do mình sở hữu.
--
-- 2. Khóa lỗ hổng xóa tài khoản trái phép trong delete_user_account & delete_user_by_identifier:
--    - Thu hồi quyền EXECUTE từ PUBLIC và anon trên cả 2 hàm.
--    - Kiểm tra auth.role() = 'anon' -> từ chối tuyệt đối.
--    - Khách hàng / Đối tác chỉ được tự xóa tài khoản của chính mình.
--    - Xóa tài khoản người khác hoặc xóa theo SĐT/Email bắt buộc phải là 'admin' hoặc 'service_role'.
--
-- 3. Sửa lỗi nghiêm trọng cột vouchers: start_date, end_date (thay vì valid_from, valid_until gây sập checkout khi nhập voucher).
--
-- 4. Đảm bảo SET search_path TO 'public' trên mọi hàm SECURITY DEFINER.
-- ==============================================================================

-- 1. Thu hồi toàn bộ quyền thực thi từ PUBLIC và anon cho các hàm nguy hiểm
REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM anon;

REVOKE ALL ON FUNCTION public.delete_user_by_identifier(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_by_identifier(text) FROM anon;

-- 2. Cập nhật delete_user_account an toàn tuyệt đối
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_jwt_role text;
  v_caller_uid uuid;
  v_target_user_id uuid;
  v_caller_role text;
BEGIN
  v_jwt_role := COALESCE(auth.role(), '');
  v_caller_uid := auth.uid();

  -- Tuyệt đối cấm người dùng ẩn danh (anon)
  IF v_jwt_role = 'anon' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Yêu cầu không được xác thực.'
    );
  END IF;

  IF v_caller_uid IS NOT NULL THEN
    -- Được gọi bởi người dùng đã đăng nhập (authenticated)
    IF p_user_id IS NOT NULL AND p_user_id != v_caller_uid THEN
      -- Muốn xóa tài khoản của người khác: Phải là Admin
      SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_uid;
      IF v_caller_role != 'admin' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'FORBIDDEN',
          'message', 'Bạn không có quyền xóa tài khoản của người khác.'
        );
      END IF;
      v_target_user_id := p_user_id;
    ELSE
      v_target_user_id := v_caller_uid;
    END IF;
  ELSE
    -- auth.uid() là NULL: Chỉ cho phép service_role
    IF v_jwt_role != 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'UNAUTHORIZED',
        'message', 'Yêu cầu không được xác thực.'
      );
    END IF;
    IF p_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'BAD_REQUEST',
        'message', 'Thiếu ID tài khoản cần xóa.'
      );
    END IF;
    v_target_user_id := p_user_id;
  END IF;

  -- 1. Xóa thông báo, đánh giá, khiếu nại, idempotency keys
  DELETE FROM public.notifications WHERE user_id = v_target_user_id;
  DELETE FROM public.reviews WHERE customer_id = v_target_user_id;
  DELETE FROM public.issues WHERE reporter_id = v_target_user_id;
  DELETE FROM public.idempotency_keys WHERE user_id = v_target_user_id;

  -- 2. Xóa đơn hàng của khách hàng (gồm cả order_items)
  DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE customer_id = v_target_user_id);
  DELETE FROM public.orders WHERE customer_id = v_target_user_id;

  -- 3. Nếu là tài khoản đối tác bán buôn: Xóa order_items, orders, túi hàng và store
  DELETE FROM public.order_items WHERE order_id IN (
    SELECT id FROM public.orders WHERE store_id IN (SELECT id FROM public.stores WHERE owner_user_id = v_target_user_id)
  );
  DELETE FROM public.orders WHERE store_id IN (
    SELECT id FROM public.stores WHERE owner_user_id = v_target_user_id
  );
  DELETE FROM public.surprise_bags WHERE store_id IN (
    SELECT id FROM public.stores WHERE owner_user_id = v_target_user_id
  );
  DELETE FROM public.stores WHERE owner_user_id = v_target_user_id;

  -- 4. Xóa hồ sơ trong public.users
  DELETE FROM public.users WHERE id = v_target_user_id;

  -- 5. Xóa tài khoản vĩnh viễn trong auth.users để giải phóng email & số điện thoại
  DELETE FROM auth.users WHERE id = v_target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Đã xóa tài khoản vĩnh viễn khỏi hệ thống.');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated, service_role;

-- 3. Cập nhật delete_user_by_identifier an toàn tuyệt đối
CREATE OR REPLACE FUNCTION public.delete_user_by_identifier(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_jwt_role text;
  v_caller_uid uuid;
  v_caller_role text;
  v_user_id uuid;
  v_clean text;
BEGIN
  v_jwt_role := COALESCE(auth.role(), '');
  v_caller_uid := auth.uid();

  IF v_jwt_role = 'anon' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Yêu cầu không được xác thực.'
    );
  END IF;

  IF v_caller_uid IS NOT NULL THEN
    SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_uid;
    IF v_caller_role != 'admin' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'FORBIDDEN',
        'message', 'Chỉ Quản trị viên (Admin) mới có quyền xóa tài khoản theo định danh.'
      );
    END IF;
  ELSE
    IF v_jwt_role != 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'UNAUTHORIZED',
        'message', 'Yêu cầu không được xác thực.'
      );
    END IF;
  END IF;

  IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Thiếu thông tin tài khoản.');
  END IF;

  v_clean := regexp_replace(trim(p_identifier), '[^0-9]', '', 'g');
  IF starts_with(v_clean, '84') AND length(v_clean) >= 11 THEN
    v_clean := '0' || substring(v_clean from 3);
  END IF;

  -- Tìm user theo email hoặc số điện thoại trong public.users
  SELECT id INTO v_user_id
  FROM public.users
  WHERE lower(trim(email)) = lower(trim(p_identifier))
     OR (v_clean <> '' AND (phone = v_clean OR regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_clean))
  ORDER BY created_at DESC
  LIMIT 1;

  -- Nếu không thấy trong public.users, tìm trong auth.users
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(trim(email)) = lower(trim(p_identifier))
       OR (v_clean <> '' AND (phone = v_clean OR phone = ('+84' || substring(v_clean from 2))))
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy tài khoản tương ứng.');
  END IF;

  RETURN public.delete_user_account(v_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_identifier(text) TO authenticated, service_role;

-- 4. Cập nhật transition_order_status_transaction với xác thực vai trò thực tế
CREATE OR REPLACE FUNCTION public.transition_order_status_transaction(
  p_order_id uuid,
  p_target_status text,
  p_actor_id uuid,
  p_actor_role text,
  p_reason text DEFAULT NULL,
  p_bank_info jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role TEXT;
  v_caller_uid UUID;
  v_actual_role TEXT;
  v_current_status TEXT;
  v_customer_id UUID;
  v_store_id UUID;
  v_final_amount INTEGER;
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
  v_cancelled_at TIMESTAMPTZ;
  v_cancel_reason TEXT;
  v_pickup_token UUID;
  v_store_owner UUID;
  v_order_label TEXT;
BEGIN
  v_jwt_role := COALESCE(auth.role(), '');
  v_caller_uid := auth.uid();

  -- 1. Khóa đơn & đọc dữ liệu
  SELECT status, customer_id, store_id, final_amount, created_at, pickup_time, payment_method, payment_status, voucher_code, completed_at, cancelled_at, cancel_reason, pickup_token
  INTO v_current_status, v_customer_id, v_store_id, v_final_amount, v_created_at, v_pickup_time, v_payment_method, v_payment_status, v_voucher_code, v_completed_at, v_cancelled_at, v_cancel_reason, v_pickup_token
  FROM public.orders
  WHERE id = p_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING DETAIL = p_order_id::TEXT;
  END IF;

  IF v_current_status = p_target_status THEN
    RAISE EXCEPTION 'DUPLICATE_TRANSITION' USING DETAIL = p_target_status;
  END IF;

  v_order_label := 'GSF-' || UPPER(SUBSTRING(p_order_id::text, 1, 6));

  -- 2. State Machine Transition Rules
  IF v_current_status IN ('pending', 'pending_payment') AND p_target_status NOT IN ('paid', 'confirmed', 'preparing', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status IN ('paid', 'confirmed') AND p_target_status NOT IN ('preparing', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'preparing' AND p_target_status NOT IN ('ready_for_pickup', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'ready_for_pickup' AND p_target_status NOT IN ('picked_up', 'completed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'picked_up' AND p_target_status != 'completed' THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'completed' AND p_target_status != 'refund_requested' THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status = 'refund_requested' AND p_target_status NOT IN ('refunded', 'completed') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  ELSIF v_current_status IN ('cancelled', 'expired', 'refunded') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING DETAIL = jsonb_build_object('current', v_current_status, 'target', p_target_status)::TEXT;
  END IF;

  -- 3. BẢO MẬT: Kiểm tra vai trò và quyền hạn thực tế dựa trên auth.uid()
  IF v_caller_uid IS NOT NULL THEN
    SELECT role INTO v_actual_role FROM public.users WHERE id = v_caller_uid;

    IF p_actor_role IN ('admin', 'system') THEN
      IF v_actual_role != 'admin' THEN
        RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Cannot spoof admin role';
      END IF;
    ELSIF p_actor_role = 'customer' THEN
      -- Phải chính là khách hàng sở hữu đơn hàng
      IF v_caller_uid != v_customer_id OR p_actor_id != v_customer_id THEN
        RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Not order owner';
      END IF;

      IF p_target_status = 'cancelled' THEN
        -- Khách CHỈ được hủy khi đơn ở pending_payment hoặc paid (quán chưa làm)
        IF v_current_status IN ('preparing', 'ready_for_pickup') THEN
          RAISE EXCEPTION 'CANNOT_CANCEL_PREPARING' USING DETAIL = 'Cửa hàng đang chuẩn bị món hoặc món đã sẵn sàng, không thể hủy đơn.';
        END IF;
        IF v_current_status NOT IN ('pending', 'pending_payment', 'paid') THEN
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
      -- Phải chính là chủ quán sở hữu cửa hàng chứa đơn hàng này
      SELECT EXISTS (
        SELECT 1 FROM public.stores
        WHERE id = v_store_id AND owner_user_id = v_caller_uid AND deleted_at IS NULL
      ) INTO v_owns_store;

      IF NOT v_owns_store THEN
        RAISE EXCEPTION 'FORBIDDEN_STORE' USING DETAIL = v_store_id::TEXT;
      END IF;

      IF p_target_status = 'cancelled' THEN
        IF p_reason IS NULL OR trim(p_reason) = '' THEN
          RAISE EXCEPTION 'CANCEL_REASON_REQUIRED' USING DETAIL = 'Chủ quán bắt buộc phải cung cấp lý do hủy đơn.';
        END IF;

        IF v_current_status NOT IN ('pending', 'pending_payment', 'paid', 'confirmed', 'preparing', 'ready_for_pickup') THEN
          RAISE EXCEPTION 'INVALID_CANCEL_STATE' USING DETAIL = v_current_status;
        END IF;
      ELSIF p_target_status IN ('preparing', 'ready_for_pickup', 'picked_up', 'completed') THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Merchants cannot perform this transition';
      END IF;
    ELSE
      RAISE EXCEPTION 'UNAUTHORIZED' USING DETAIL = p_actor_role;
    END IF;
  ELSE
    -- auth.uid() là NULL: Chỉ cho phép service_role
    IF v_jwt_role != 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
      RAISE EXCEPTION 'UNAUTHORIZED' USING DETAIL = 'No auth session present';
    END IF;
  END IF;

  -- 4. Cập nhật dữ liệu
  v_updated_status := p_target_status;
  v_updated_payment_status := v_payment_status;

  IF p_target_status = 'ready_for_pickup' AND v_pickup_token IS NULL THEN
    v_pickup_token := gen_random_uuid();
  END IF;

  IF p_target_status = 'completed' THEN
    v_completed_at := NOW();
  END IF;

  -- 5. XỬ LÝ HỦY ĐƠN: Hoàn tồn kho, hoàn voucher, tạo yêu cầu hoàn tiền tách biệt, xóa token
  IF p_target_status = 'cancelled' THEN
    v_cancelled_at := NOW();
    v_cancel_reason := COALESCE(p_reason, 'Hủy đơn hàng');

    -- Hoàn tồn kho
    FOR v_item IN SELECT bag_id, quantity FROM public.order_items WHERE order_id = p_order_id AND deleted_at IS NULL LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_item.quantity,
          updated_at = NOW()
      WHERE id = v_item.bag_id;
    END LOOP;

    -- Hoàn voucher
    IF v_voucher_code IS NOT NULL AND v_voucher_code != '' THEN
      UPDATE public.vouchers
      SET used_count = GREATEST(0, used_count - 1),
          updated_at = NOW()
      WHERE code = v_voucher_code AND deleted_at IS NULL;
    END IF;

    -- Hoàn tiền VietQR: Nếu đơn đã thanh toán (payment_status = 'success' hoặc status = 'paid')
    IF v_payment_status = 'success' OR v_current_status = 'paid' THEN
      v_updated_payment_status := 'refund_pending';

      INSERT INTO public.refund_requests (
        id,
        order_id,
        customer_id,
        amount,
        reason,
        bank_account_info,
        status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        p_order_id,
        v_customer_id,
        v_final_amount,
        v_cancel_reason,
        p_bank_info,
        'pending',
        NOW(),
        NOW()
      );

      -- Nếu khách hủy đơn đã trả tiền: Bắn thông báo cho Chủ quán biết
      IF p_actor_role = 'customer' THEN
        SELECT owner_user_id INTO v_store_owner FROM public.stores WHERE id = v_store_id;
        IF v_store_owner IS NOT NULL THEN
          BEGIN
            INSERT INTO public.notifications (id, user_id, icon, title, body, data)
            VALUES (
              gen_random_uuid(),
              v_store_owner,
              'order',
              'Khách hàng đã hủy đơn hàng',
              'Đơn ' || v_order_label || ' đã bị khách hủy trước khi làm món. Lý do: ' || v_cancel_reason,
              jsonb_build_object('orderId', p_order_id, 'status', 'cancelled', 'reason', v_cancel_reason)
            );
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
      END IF;
    END IF;

    -- Thu hồi mã nhận hàng
    v_pickup_token := NULL;
  END IF;

  IF p_target_status = 'refunded' THEN
    v_updated_payment_status := 'refunded';
  END IF;

  -- Cập nhật dòng orders
  UPDATE public.orders
  SET status = v_updated_status::order_status,
      payment_status = v_updated_payment_status::payment_status,
      completed_at = v_completed_at,
      cancelled_at = v_cancelled_at,
      cancel_reason = v_cancel_reason,
      pickup_token = v_pickup_token,
      payos_qr_code = CASE WHEN p_target_status IN ('cancelled', 'completed', 'expired') THEN NULL ELSE payos_qr_code END,
      payos_description = CASE WHEN p_target_status IN ('cancelled', 'completed', 'expired') THEN NULL ELSE payos_description END,
      payos_account_number = CASE WHEN p_target_status IN ('cancelled', 'completed', 'expired') THEN NULL ELSE payos_account_number END,
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

GRANT EXECUTE ON FUNCTION public.transition_order_status_transaction(uuid, text, uuid, text, text, jsonb) TO authenticated, service_role;

-- 5. Cập nhật create_order_transaction: Khắc phục triệt để lỗi cột start_date/end_date của bảng vouchers
CREATE OR REPLACE FUNCTION public.create_order_transaction(
  p_id uuid,
  p_customer_id uuid,
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
  p_qr_code text,
  p_recipient_name text DEFAULT NULL,
  p_recipient_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
  v_expired_order RECORD;
  v_bag_id UUID;
  v_quantity INTEGER;
  v_bag_name TEXT;
  v_discount_price INTEGER;
  v_current_stock INTEGER;
  v_is_available BOOLEAN;
  v_pickup_start TIME;
  v_pickup_end TIME;
  v_bag_type TEXT;
  v_repeat_mode TEXT;
  v_expiry_date DATE;
  v_store_id UUID;
  v_voucher_id UUID;
  v_voucher_used_count INTEGER;
  v_voucher_quantity INTEGER;
  v_voucher_is_active BOOLEAN;
  v_voucher_start TIMESTAMPTZ;
  v_voucher_end TIMESTAMPTZ;
  v_pickup_token UUID;
  v_normalized_method TEXT;
  v_vn_time TIME;
  v_vn_date DATE;
  v_payment_expires_at TIMESTAMPTZ;
  v_grace_deadline TIMESTAMPTZ;
BEGIN
  -- 1. Chặn phương thức tiền mặt
  IF p_payment_method = 'cash' THEN
    RAISE EXCEPTION 'CASH_PAYMENT_NOT_SUPPORTED' USING DETAIL = 'GoSavingFood chỉ hỗ trợ thanh toán trực tuyến qua VietQR.';
  END IF;

  v_normalized_method := p_payment_method;
  IF v_normalized_method NOT IN ('banking', 'payos_vietqr', 'momo', 'zalopay') THEN
    v_normalized_method := 'banking';
  END IF;

  -- 2. Idempotency Check
  IF EXISTS (
    SELECT 1 FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = p_customer_id
  ) THEN
    RETURN json_build_object(
      'success', true,
      'is_duplicate', true,
      'order_id', (
        SELECT (response->>'orderId')::UUID
        FROM public.idempotency_keys
        WHERE key = p_idempotency_key AND user_id = p_customer_id
      )
    );
  END IF;

  -- 3. LAZY CLEANUP: Hoàn kho cho các đơn pending_payment quá hạn của các túi được đặt
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    FOR v_expired_order IN
      SELECT o.id, o.voucher_code, oi.quantity AS expired_qty
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE oi.bag_id = v_item."bagId"
        AND o.status = 'pending_payment'
        AND o.payment_status = 'pending'
        AND o.payment_expires_at < NOW()
        AND o.deleted_at IS NULL
      FOR UPDATE OF o SKIP LOCKED
    LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_expired_order.expired_qty,
          is_available = true,
          status = 'active',
          updated_at = NOW()
      WHERE id = v_item."bagId";

      IF v_expired_order.voucher_code IS NOT NULL AND v_expired_order.voucher_code != '' THEN
        UPDATE public.vouchers
        SET used_count = GREATEST(0, used_count - 1),
            updated_at = NOW()
        WHERE code = v_expired_order.voucher_code AND deleted_at IS NULL;
      END IF;

      UPDATE public.orders
      SET status = 'expired'::order_status,
          cancelled_at = NOW(),
          cancel_reason = 'Quá hạn thanh toán (Lazy Cleanup)',
          updated_at = NOW(),
          pickup_token = NULL,
          payos_qr_code = NULL,
          payos_description = NULL,
          payos_account_number = NULL
      WHERE id = v_expired_order.id;
    END LOOP;
  END LOOP;

  -- 4. Khóa & Kiểm tra quy tắc nghiệp vụ thời gian & Tồn kho
  v_vn_time := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;
  v_vn_date := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_payment_expires_at := NOW() + INTERVAL '33 minutes';

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    v_bag_id := v_item."bagId";
    v_quantity := v_item.quantity;

    SELECT name, quantity, is_available, discount_price, store_id, pickup_start, pickup_end,
           COALESCE(bag_type, 'daily'), COALESCE(repeat_mode, 'today_only'), expiry_date
    INTO v_bag_name, v_current_stock, v_is_available, v_discount_price, v_store_id, v_pickup_start, v_pickup_end,
         v_bag_type, v_repeat_mode, v_expiry_date
    FROM public.surprise_bags
    WHERE id = v_bag_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'BAG_NOT_FOUND' USING DETAIL = v_bag_id::TEXT;
    END IF;

    IF v_store_id != p_store_id THEN
      RAISE EXCEPTION 'STORE_MISMATCH' USING DETAIL = v_bag_id::TEXT;
    END IF;

    IF NOT v_is_available THEN
      RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
        'bagId', v_bag_id,
        'available', v_current_stock,
        'requested', v_quantity,
        'reason', 'INACTIVE'
      )::TEXT;
    END IF;

    -- Kiểm tra Loại 2: Mặt hàng có hạn sử dụng (shelf_life)
    IF v_bag_type = 'shelf_life' OR v_expiry_date IS NOT NULL THEN
      IF v_expiry_date IS NOT NULL AND v_vn_date > v_expiry_date THEN
        RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
          'bagId', v_bag_id,
          'available', v_current_stock,
          'requested', v_quantity,
          'reason', 'EXPIRED',
          'expiryDate', v_expiry_date
        )::TEXT;
      END IF;
    ELSE
      -- Kiểm tra Loại 1: Mặt hàng dùng trong ngày (daily)
      IF v_pickup_start IS NOT NULL AND v_vn_time < v_pickup_start THEN
        RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
          'bagId', v_bag_id,
          'available', v_current_stock,
          'requested', v_quantity,
          'reason', 'NOT_YET_OPEN',
          'pickupStart', to_char(v_pickup_start, 'HH24:MI')
        )::TEXT;
      END IF;

      IF v_pickup_end IS NOT NULL AND v_vn_time > v_pickup_end THEN
        RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
          'bagId', v_bag_id,
          'available', v_current_stock,
          'requested', v_quantity,
          'reason', 'ORDER_CLOSED',
          'pickupEnd', to_char(v_pickup_end, 'HH24:MI')
        )::TEXT;
      END IF;

      IF v_pickup_end IS NOT NULL THEN
        v_grace_deadline := (v_vn_date + v_pickup_end + INTERVAL '5 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh';
        IF v_grace_deadline > NOW() AND v_grace_deadline < v_payment_expires_at THEN
          v_payment_expires_at := v_grace_deadline;
        END IF;
      END IF;
    END IF;

    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'BAG_UNAVAILABLE' USING DETAIL = jsonb_build_object(
        'bagId', v_bag_id,
        'available', v_current_stock,
        'requested', v_quantity,
        'reason', 'OUT_OF_STOCK'
      )::TEXT;
    END IF;

    -- Trừ kho
    UPDATE public.surprise_bags
    SET quantity = quantity - v_quantity,
        updated_at = NOW()
    WHERE id = v_bag_id;
  END LOOP;

  -- 5. Kiểm tra voucher (ĐÃ SỬA CỘT THÀNH start_date và end_date)
  IF p_voucher_code IS NOT NULL AND p_voucher_code != '' THEN
    SELECT id, used_count, quantity, is_active, start_date, end_date
    INTO v_voucher_id, v_voucher_used_count, v_voucher_quantity, v_voucher_is_active, v_voucher_start, v_voucher_end
    FROM public.vouchers
    WHERE code = p_voucher_code AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'VOUCHER_NOT_FOUND' USING DETAIL = p_voucher_code; END IF;
    IF NOT v_voucher_is_active THEN RAISE EXCEPTION 'VOUCHER_INACTIVE' USING DETAIL = p_voucher_code; END IF;
    IF v_voucher_start IS NOT NULL AND NOW() < v_voucher_start THEN RAISE EXCEPTION 'VOUCHER_NOT_STARTED' USING DETAIL = p_voucher_code; END IF;
    IF v_voucher_end IS NOT NULL AND NOW() > v_voucher_end THEN RAISE EXCEPTION 'VOUCHER_EXPIRED' USING DETAIL = p_voucher_code; END IF;
    IF v_voucher_quantity IS NOT NULL AND v_voucher_used_count >= v_voucher_quantity THEN RAISE EXCEPTION 'VOUCHER_USAGE_LIMIT' USING DETAIL = p_voucher_code; END IF;

    IF EXISTS (
      SELECT 1 FROM public.orders
      WHERE customer_id = p_customer_id AND voucher_code = p_voucher_code
        AND status NOT IN ('cancelled', 'expired') AND deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'VOUCHER_ALREADY_USED' USING DETAIL = p_voucher_code; END IF;

    UPDATE public.vouchers
    SET used_count = used_count + 1, updated_at = NOW()
    WHERE id = v_voucher_id;
  END IF;

  v_pickup_token := gen_random_uuid();

  -- 6. Tạo đơn hàng
  INSERT INTO public.orders (
    id, customer_id, store_id, total_original_price, total_discount_price,
    discount_amount, final_amount, voucher_code, status,
    payment_method, payment_status, qr_code, pickup_time, note,
    payment_expires_at, pickup_token, recipient_name, recipient_phone, created_at, updated_at
  ) VALUES (
    p_id, p_customer_id, p_store_id, p_total_original_price, p_total_discount_price,
    p_discount_amount, p_final_amount, p_voucher_code, 'pending_payment'::order_status,
    v_normalized_method::payment_method, 'pending'::payment_status, p_qr_code, p_pickup_time, p_note,
    v_payment_expires_at, v_pickup_token, p_recipient_name, p_recipient_phone, NOW(), NOW()
  );

  -- 7. Đồng bộ SĐT người nhận nếu có
  IF p_recipient_phone IS NOT NULL AND TRIM(p_recipient_phone) != '' THEN
    BEGIN
      UPDATE public.users
      SET phone = TRIM(p_recipient_phone),
          updated_at = NOW()
      WHERE id = p_customer_id
        AND (phone IS NULL OR TRIM(phone) = '')
        AND NOT EXISTS (
          SELECT 1 FROM public.users 
          WHERE phone = TRIM(p_recipient_phone) AND id != p_customer_id
        );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  -- 8. Chi tiết đơn hàng
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    SELECT name, discount_price INTO v_bag_name, v_discount_price
    FROM public.surprise_bags WHERE id = v_item."bagId";

    INSERT INTO public.order_items (id, order_id, bag_id, bag_name, quantity, unit_price, total_price, created_at)
    VALUES (gen_random_uuid(), p_id, v_item."bagId", v_bag_name, v_item.quantity, v_discount_price, v_discount_price * v_item.quantity, NOW());
  END LOOP;

  -- 9. Lưu idempotency key
  INSERT INTO public.idempotency_keys (id, user_id, key, request_hash, response, expires_at, created_at)
  VALUES (gen_random_uuid(), p_customer_id, p_idempotency_key, p_idempotency_key, json_build_object('orderId', p_id), NOW() + INTERVAL '7 days', NOW());

  RETURN json_build_object(
    'success', true,
    'is_duplicate', false,
    'order_id', p_id,
    'pickup_token', v_pickup_token,
    'expires_at', v_payment_expires_at,
    'status', 'pending_payment'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_order_transaction(
  uuid, uuid, uuid, text, jsonb, text, timestamp with time zone, text, text,
  integer, integer, integer, integer, text, text, text
) TO authenticated, service_role;
