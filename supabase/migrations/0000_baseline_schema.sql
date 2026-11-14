-- Cloud schema-only snapshot, 2026-11-13. PostGIS is placed in public
-- for compatibility with immutable historical RPC search paths.
DO $$ BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    RAISE EXCEPTION 'Baseline only supports an empty application schema; do not replay on Cloud';
  END IF;
END $$;



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."bag_category" AS ENUM (
    'bakery',
    'beverage',
    'vegetarian',
    'meat',
    'seafood',
    'raw_food',
    'other'
);


ALTER TYPE "public"."bag_category" OWNER TO "postgres";


CREATE TYPE "public"."issue_status" AS ENUM (
    'pending',
    'resolved',
    'rejected'
);


ALTER TYPE "public"."issue_status" OWNER TO "postgres";


CREATE TYPE "public"."merchant_status" AS ENUM (
    'active',
    'suspended',
    'deleted'
);


ALTER TYPE "public"."merchant_status" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'picked_up',
    'completed',
    'cancelled',
    'refund_requested',
    'refunded',
    'pending_payment',
    'paid',
    'expired'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'zalopay',
    'momo',
    'banking',
    'cash',
    'payos_vietqr'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'success',
    'failed',
    'refunded',
    'refund_pending'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."reporter_role" AS ENUM (
    'customer',
    'merchant'
);


ALTER TYPE "public"."reporter_role" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'customer',
    'merchant',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."voucher_discount_type" AS ENUM (
    'percentage',
    'fixed'
);


ALTER TYPE "public"."voucher_discount_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_deactivate_bag"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- A. Khi kho về 0: Tự động gỡ khỏi kệ (is_available = false) và đánh dấu status = 'sold_out'
  IF NEW.quantity <= 0 THEN
    NEW.quantity := 0;
    NEW.is_available := false;
    IF NEW.status = 'active' OR NEW.status IS NULL THEN
      NEW.status := 'sold_out';
    END IF;

  -- B. Khi kho được nạp lại từ 0 lên > 0 (do hoàn đơn hoặc do Quán nạp thêm hàng từ trạng thái sold_out):
  -- Tự động mở bán lại lên kệ
  ELSIF (OLD.quantity <= 0 OR OLD.status = 'sold_out')
    AND NEW.quantity > 0
    AND NEW.deleted_at IS NULL
    AND COALESCE(NEW.status, 'sold_out') != 'archived'
    -- Đảm bảo không ép is_available = true nếu update đang chủ động gỡ kệ (is_available = false)
    AND NEW.is_available = true
  THEN
    NEW.is_available := true;
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_deactivate_bag"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_idempotency_keys"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at <= NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_idempotency_keys"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_pending_orders"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_expired_count INT := 0;
  v_expired_codes BIGINT[] := ARRAY[]::BIGINT[];
BEGIN
  FOR v_order IN
    SELECT id, store_id, voucher_code, payment_order_code
    FROM public.orders
    WHERE status = 'pending_payment'
      AND payment_expires_at < NOW()
      AND deleted_at IS NULL
    FOR UPDATE
  LOOP
    UPDATE public.orders
    SET status = 'expired'::order_status,
        updated_at = NOW(),
        cancelled_at = NOW(),
        cancel_reason = 'Hết thời hạn thanh toán (TTL 30 phút + 3 phút đệm)',
        pickup_token = NULL,
        payos_qr_code = NULL,
        payos_description = NULL,
        payos_account_number = NULL
    WHERE id = v_order.id;

    FOR v_item IN
      SELECT bag_id, quantity
      FROM public.order_items
      WHERE order_id = v_order.id
    LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_item.quantity,
          updated_at = NOW()
      WHERE id = v_item.bag_id;
    END LOOP;

    IF v_order.voucher_code IS NOT NULL AND length(trim(v_order.voucher_code)) > 0 THEN
      UPDATE public.vouchers
      SET used_count = GREATEST(0, used_count - 1),
          updated_at = NOW()
      WHERE code = trim(v_order.voucher_code);
    END IF;

    IF v_order.payment_order_code IS NOT NULL THEN
      v_expired_codes := array_append(v_expired_codes, v_order.payment_order_code);
    END IF;

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'expired_orders_count', v_expired_count,
    'expired_order_codes', v_expired_codes
  );
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_pending_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_order_payment"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  END IF;

  IF v_order.payment_status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'message', 'ALREADY_PAID', 'order_id', v_order.id);
  END IF;

  UPDATE public.orders
  SET 
    payment_status = 'success',
    status = 'pending'::order_status,
    updated_at = NOW()
  WHERE id = v_order.id;

  RETURN jsonb_build_object('success', true, 'order_id', v_order.id);
END;
$$;


ALTER FUNCTION "public"."confirm_order_payment"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_payos_payment"("p_order_code" bigint, "p_payment_link_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_order RECORD;
  v_order_display_code TEXT;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE payment_order_code = p_order_code FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  END IF;

  v_order_display_code := 'GSF-' || UPPER(SUBSTRING(v_order.id::text, 1, 6));

  -- A. TRƯỜNG HỢP THANH TOÁN TRÙNG LẶP (LẦN 2+) - Đơn đã ở trạng thái thành công
  IF v_order.payment_status = 'success' OR v_order.status IN ('paid', 'preparing', 'ready_for_pickup', 'completed', 'picked_up') THEN
    INSERT INTO public.refund_requests (
      id,
      order_id,
      customer_id,
      amount,
      status,
      reason,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_order.id,
      v_order.customer_id,
      v_order.final_amount,
      'pending',
      'Hoàn tiền do khách hàng thanh toán trùng lặp (lần 2)',
      NOW(),
      NOW()
    );

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
        'Giao dịch chuyển tiền trùng lặp ⚠️',
        'Hệ thống ghi nhận bạn đã chuyển tiền lần 2 cho đơn #' || v_order_display_code || '. Số tiền ' || to_char(v_order.final_amount, 'FM999,999,999') || 'đ đã được chuyển vào danh sách hoàn tiền.',
        jsonb_build_object('orderId', v_order.id, 'status', 'duplicate_refund_pending', 'amount', v_order.final_amount),
        false,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'DUPLICATE_PAYMENT_REFUND_QUEUED',
      'order_id', v_order.id,
      'refund_amount', v_order.final_amount
    );
  END IF;

  -- B. TRƯỜNG HỢP TIỀN VỀ TRỄ CHO ĐƠN ĐÃ HẾT HẠN HOẶC ĐÃ HỦY
  IF v_order.status IN ('expired', 'cancelled') THEN
    UPDATE public.orders
    SET 
      payment_status = 'refund_pending',
      paid_at = NOW(),
      updated_at = NOW(),
      payos_qr_code = NULL,
      payos_description = NULL,
      payos_account_number = NULL
    WHERE id = v_order.id;

    INSERT INTO public.refund_requests (
      id,
      order_id,
      customer_id,
      amount,
      status,
      reason,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_order.id,
      v_order.customer_id,
      v_order.final_amount,
      'pending',
      'Thanh toán sau khi đơn hàng đã hết hạn / bị hủy',
      NOW(),
      NOW()
    );

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
        'Thanh toán sau khi đơn hết hạn ⏰',
        'Đơn hàng #' || v_order_display_code || ' đã hết thời hạn thanh toán trước khi tiền về. Số tiền ' || to_char(v_order.final_amount, 'FM999,999,999') || 'đ đã được tự động chuyển vào hàng đợi hoàn trả 100%.',
        jsonb_build_object('orderId', v_order.id, 'status', 'expired_refund_pending', 'amount', v_order.final_amount),
        false,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'LATE_PAYMENT_REFUND_QUEUED',
      'order_id', v_order.id,
      'refund_amount', v_order.final_amount
    );
  END IF;

  -- C. TRƯỜNG HỢP HỢP LỆ BÌNH THƯỜNG (pending / pending_payment)
  -- Khi thanh toán thành công: Gán status = 'paid' và giải phóng payos_qr_code để tiết kiệm dung lượng
  UPDATE public.orders
  SET 
    payment_status = 'success',
    paid_at = NOW(),
    status = 'paid'::order_status,
    payment_link_id = COALESCE(p_payment_link_id, payment_link_id),
    updated_at = NOW(),
    payos_qr_code = NULL,
    payos_description = NULL,
    payos_account_number = NULL
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
      'Đơn hàng #' || v_order_display_code || ' đã được xác nhận thanh toán qua VietQR.',
      jsonb_build_object('orderId', v_order.id, 'status', 'paid'),
      false,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', 'paid');
END;
$$;


ALTER FUNCTION "public"."confirm_payos_payment"("p_order_code" bigint, "p_payment_link_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order_transaction"("p_id" "uuid", "p_customer_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text" DEFAULT NULL::"text", "p_recipient_phone" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
  v_calculated_final INTEGER;
  v_order_status order_status;
  v_order_payment_status payment_status;
  v_paid_at TIMESTAMPTZ;
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

  -- 5. Kiểm tra voucher
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

  -- 6. KIỂM TRA CHỐNG GIAN LẬN SỐ TIỀN & XÁC ĐỊNH TRẠNG THÁI (0đ -> paid / success)
  v_calculated_final := GREATEST(0, p_total_discount_price - COALESCE(p_discount_amount, 0));
  IF p_final_amount < v_calculated_final THEN
    RAISE EXCEPTION 'INVALID_FINAL_AMOUNT' USING DETAIL = 'Số tiền thanh toán không hợp lệ với mức giảm giá.';
  END IF;

  IF p_final_amount <= 0 THEN
    v_order_status := 'paid'::order_status;
    v_order_payment_status := 'success'::payment_status;
    v_paid_at := NOW();
  ELSE
    v_order_status := 'pending_payment'::order_status;
    v_order_payment_status := 'pending'::payment_status;
    v_paid_at := NULL;
  END IF;

  v_pickup_token := gen_random_uuid();

  -- 7. Tạo đơn hàng
  INSERT INTO public.orders (
    id, customer_id, store_id, total_original_price, total_discount_price,
    discount_amount, final_amount, voucher_code, status,
    payment_method, payment_status, paid_at, qr_code, pickup_time, note,
    payment_expires_at, pickup_token, recipient_name, recipient_phone, created_at, updated_at
  ) VALUES (
    p_id, p_customer_id, p_store_id, p_total_original_price, p_total_discount_price,
    p_discount_amount, p_final_amount, p_voucher_code, v_order_status,
    v_normalized_method::payment_method, v_order_payment_status, v_paid_at, p_qr_code, p_pickup_time, p_note,
    v_payment_expires_at, v_pickup_token, p_recipient_name, p_recipient_phone, NOW(), NOW()
  );

  -- 8. Đồng bộ SĐT người nhận nếu có
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

  -- 9. Chi tiết đơn hàng
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x("bagId" UUID, quantity INTEGER) LOOP
    SELECT name, discount_price INTO v_bag_name, v_discount_price
    FROM public.surprise_bags WHERE id = v_item."bagId";

    INSERT INTO public.order_items (id, order_id, bag_id, bag_name, quantity, unit_price, total_price, created_at)
    VALUES (gen_random_uuid(), p_id, v_item."bagId", v_bag_name, v_item.quantity, v_discount_price, v_discount_price * v_item.quantity, NOW());
  END LOOP;

  -- 10. Lưu idempotency key
  INSERT INTO public.idempotency_keys (id, user_id, key, request_hash, response, expires_at, created_at)
  VALUES (gen_random_uuid(), p_customer_id, p_idempotency_key, p_idempotency_key, json_build_object('orderId', p_id), NOW() + INTERVAL '7 days', NOW());

  RETURN json_build_object(
    'success', true,
    'is_duplicate', false,
    'order_id', p_id,
    'pickup_token', v_pickup_token,
    'expires_at', v_payment_expires_at,
    'status', v_order_status::text,
    'payment_status', v_order_payment_status::text
  );
END;
$$;


ALTER FUNCTION "public"."create_order_transaction"("p_id" "uuid", "p_customer_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text", "p_recipient_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_store"("p_owner_user_id" "uuid", "p_name" "text", "p_description" "text", "p_phone" "text", "p_address" "text", "p_latitude" double precision, "p_longitude" double precision, "p_logo_url" "text", "p_banner_url" "text", "p_food_categories" "text"[], "p_open_time" time without time zone, "p_close_time" time without time zone, "p_is_open" boolean) RETURNS TABLE("id" "uuid", "owner_user_id" "uuid", "name" "text", "description" "text", "phone" "text", "address" "text", "logo_url" "text", "banner_url" "text", "rating" real, "total_ratings" integer, "status" "public"."merchant_status", "commission_rate" real, "food_categories" "text"[], "open_time" time without time zone, "close_time" time without time zone, "is_open" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "deleted_at" timestamp with time zone, "latitude" double precision, "longitude" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_new_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO stores (
    id, owner_user_id, name, description, phone, address,
    location, logo_url, banner_url, food_categories,
    open_time, close_time, is_open
  ) VALUES (
    v_new_id, p_owner_user_id, p_name, p_description, p_phone, p_address,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
    p_logo_url, p_banner_url, p_food_categories,
    p_open_time, p_close_time, p_is_open
  );

  RETURN QUERY
  SELECT
    s.id, s.owner_user_id, s.name, s.description, s.phone, s.address,
    s.logo_url, s.banner_url, s.rating, s.total_ratings,
    s.status, s.commission_rate, s.food_categories, s.open_time,
    s.close_time, s.is_open, s.created_at, s.updated_at, s.deleted_at,
    s.latitude, s.longitude
  FROM stores s
  WHERE s.id = v_new_id;
END;
$$;


ALTER FUNCTION "public"."create_store"("p_owner_user_id" "uuid", "p_name" "text", "p_description" "text", "p_phone" "text", "p_address" "text", "p_latitude" double precision, "p_longitude" double precision, "p_logo_url" "text", "p_banner_url" "text", "p_food_categories" "text"[], "p_open_time" time without time zone, "p_close_time" time without time zone, "p_is_open" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cron_daily_bag_cycle"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  -- A. Với túi lặp lại hàng ngày ('daily' + 'recurring'): Nạp lại số lượng bán theo daily_quota
  UPDATE public.surprise_bags
  SET 
    quantity = COALESCE(daily_quota, quantity),
    is_available = true,
    status = 'active',
    updated_at = NOW()
  WHERE bag_type = 'daily'
    AND repeat_mode = 'recurring'
    AND deleted_at IS NULL
    AND status != 'archived';

  -- B. Với túi dùng trong ngày chỉ hôm nay ('daily' + 'today_only'): Tự chuyển sang 'archived' (Soft Archive)
  UPDATE public.surprise_bags
  SET 
    is_available = false,
    status = 'archived',
    updated_at = NOW()
  WHERE bag_type = 'daily'
    AND repeat_mode = 'today_only'
    AND status = 'active'
    AND deleted_at IS NULL;

  -- C. Với túi có hạn sử dụng ('shelf_life'): Quá ngày HSD thì chuyển 'expired' (Soft Archive)
  UPDATE public.surprise_bags
  SET 
    is_available = false,
    status = 'expired',
    updated_at = NOW()
  WHERE bag_type = 'shelf_life'
    AND expiry_date IS NOT NULL
    AND expiry_date < v_today
    AND status = 'active'
    AND deleted_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."cron_daily_bag_cycle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_account"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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


ALTER FUNCTION "public"."delete_user_account"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_by_identifier"("p_identifier" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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


ALTER FUNCTION "public"."delete_user_by_identifier"("p_identifier" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_noshow_orders"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
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
$$;


ALTER FUNCTION "public"."expire_noshow_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_stale_surprise_bags"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.surprise_bags
  SET is_available = false,
      updated_at = NOW()
  WHERE is_available = true
    AND expires_at <= NOW()
    AND deleted_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."expire_stale_surprise_bags"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_unpaid_orders"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  PERFORM public.cleanup_expired_pending_orders();
  PERFORM public.expire_noshow_orders();
END;
$$;


ALTER FUNCTION "public"."expire_unpaid_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
      v_total_users BIGINT;
      v_total_stores BIGINT;
      v_pending_stores BIGINT;
      v_total_orders BIGINT;
      v_completed_orders BIGINT;
      v_total_gmv NUMERIC(14, 2);
      v_total_food_saved_kg NUMERIC(10, 2);
      v_total_co2_prevented_kg NUMERIC(10, 2);
      v_open_issues BIGINT;
  BEGIN
      -- Kiểm tra quyền Admin (role = 'admin')
      IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND lower(role::text) = 'admin') THEN
          RAISE EXCEPTION 'Unauthorized: Only admins can view system stats.';
      END IF;

      -- Đếm người dùng & cửa hàng
      SELECT count(*) INTO v_total_users FROM public.users;
      SELECT count(*) INTO v_total_stores FROM public.stores;
      -- merchant_status chỉ có 'active', 'suspended', 'deleted'
      SELECT count(*) INTO v_pending_stores FROM public.stores WHERE status = 'suspended';

      -- Đơn hàng & Doanh thu: chỉ tính đơn 'completed'
      SELECT count(*) INTO v_total_orders FROM public.orders;
      SELECT count(*), coalesce(sum(final_amount), 0)
      INTO v_completed_orders, v_total_gmv
      FROM public.orders
      WHERE status = 'completed';

      -- Tính toán ESG: Trung bình 1 túi đồ ăn giải cứu = 1.0 kg đồ ăn, giảm 2.5 kg khí thải CO2e
      v_total_food_saved_kg := v_completed_orders * 1.0;
      v_total_co2_prevented_kg := v_completed_orders * 2.5;

      -- Khiếu nại đang chờ giải quyết (status = 'pending')
      SELECT count(*) INTO v_open_issues FROM public.issues WHERE status = 'pending';

      RETURN jsonb_build_object(
          'total_users', v_total_users,
          'total_stores', v_total_stores,
          'pending_stores', v_pending_stores,
          'total_orders', v_total_orders,
          'completed_orders', v_completed_orders,
          'total_gmv', v_total_gmv,
          'total_food_saved_kg', v_total_food_saved_kg,
          'total_co2_prevented_kg', v_total_co2_prevented_kg,
          'open_issues', v_open_issues
      );
  END;
  $$;


ALTER FUNCTION "public"."get_admin_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_by_phone"("p_phone" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_email text;
    v_clean text;
BEGIN
    IF p_phone IS NULL OR trim(p_phone) = '' THEN
        RETURN NULL;
    END IF;

    -- Chuẩn hóa số điện thoại: chỉ giữ lại chữ số
    v_clean := regexp_replace(trim(p_phone), '[^0-9]', '', 'g');
    IF starts_with(v_clean, '84') AND length(v_clean) >= 11 THEN
        v_clean := '0' || substring(v_clean from 3);
    END IF;

    -- Tìm email trong bảng users theo các biến thể của số điện thoại
    SELECT email INTO v_email
    FROM public.users
    WHERE (
        regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_clean
        OR phone = p_phone
        OR phone = v_clean
        OR phone = ('+84' || substring(v_clean from 2))
    )
    AND email IS NOT NULL
    AND email NOT LIKE '%@gosavingfood.vn'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Nếu không tìm thấy email thật, thử tìm email synthetic
    IF v_email IS NULL THEN
        SELECT email INTO v_email
        FROM public.users
        WHERE (
            regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = v_clean
            OR phone = p_phone
            OR phone = v_clean
        )
        AND email IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    RETURN v_email;
END;
$$;


ALTER FUNCTION "public"."get_email_by_phone"("p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_store_by_owner"("p_owner_user_id" "uuid") RETURNS TABLE("id" "uuid", "owner_user_id" "uuid", "name" "text", "description" "text", "phone" "text", "address" "text", "logo_url" "text", "banner_url" "text", "rating" real, "total_ratings" integer, "status" "public"."merchant_status", "commission_rate" real, "food_categories" "text"[], "open_time" time without time zone, "close_time" time without time zone, "is_open" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "deleted_at" timestamp with time zone, "latitude" double precision, "longitude" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.owner_user_id,
    s.name,
    s.description,
    s.phone,
    s.address,
    s.logo_url,
    s.banner_url,
    s.rating,
    s.total_ratings,
    s.status,
    s.commission_rate,
    s.food_categories,
    s.open_time,
    s.close_time,
    s.is_open,
    s.created_at,
    s.updated_at,
    s.deleted_at,
    s.latitude,
    s.longitude
  FROM stores s
  WHERE s.owner_user_id = p_owner_user_id
    AND s.deleted_at IS NULL
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_store_by_owner"("p_owner_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_name text;
  v_phone text;
  v_avatar text;
  v_role user_role;
  v_existing_id uuid;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'Khách hàng'
  );
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'avatar',
    NULL
  );
  
  -- Determine role
  IF NEW.raw_user_meta_data->>'role' = 'merchant' THEN
    v_role := 'merchant';
  ELSIF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    v_role := 'admin';
  ELSE
    v_role := 'customer';
  END IF;

  SELECT id INTO v_existing_id FROM public.users WHERE email = NEW.email LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    -- Nhờ ON UPDATE CASCADE, cập nhật users.id sẽ tự động cập nhật mọi bảng phụ thuộc
    UPDATE public.users 
    SET id = NEW.id,
        name = v_name,
        phone = COALESCE(v_phone, phone),
        avatar_url = COALESCE(v_avatar, avatar_url),
        role = COALESCE(v_role, role),
        updated_at = NOW() 
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.users (id, email, name, phone, avatar_url, role, created_at, updated_at)
    VALUES (NEW.id, NEW.email, v_name, v_phone, v_avatar, v_role, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name,
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
      phone = COALESCE(EXCLUDED.phone, public.users.phone),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND lower(role::text) = 'admin'
      );
    $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_store_owner"("p_user_id" "uuid", "p_store_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.stores
        WHERE id = p_store_id 
          AND owner_user_id = p_user_id
          AND deleted_at IS NULL
    );
END;
$$;


ALTER FUNCTION "public"."is_store_owner"("p_user_id" "uuid", "p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_bags_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer DEFAULT 10000, "p_category" "text" DEFAULT NULL::"text", "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "store_id" "uuid", "name" "text", "description" "text", "original_price" integer, "discount_price" integer, "category" "public"."bag_category", "image_url" "text", "quantity" integer, "max_quantity" integer, "pickup_start" time without time zone, "pickup_end" time without time zone, "is_daily" boolean, "is_available" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "expires_at" timestamp with time zone, "deleted_at" timestamp with time zone, "store_name" "text", "store_logo_url" "text", "store_address" "text", "latitude" double precision, "longitude" double precision, "distance_m" double precision, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_offset INTEGER;
  v_point  GEOGRAPHY(Point, 4326);
  v_total  BIGINT;
  v_today  DATE;
  v_now_time TIME;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  v_point  := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  v_today  := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_now_time := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;

  -- Đếm tổng số lượng túi khả dụng (chỉ lấy túi chưa hết hạn và chưa qua giờ kết thúc hôm nay)
  SELECT COUNT(*) INTO v_total
  FROM surprise_bags b
  INNER JOIN stores s ON s.id = b.store_id
  WHERE b.deleted_at IS NULL
    AND b.is_available = true
    AND b.quantity > 0
    AND COALESCE(b.status, 'active') = 'active'
    -- Loại 2: Hạn sử dụng chưa qua ngày hôm nay
    AND (b.expiry_date IS NULL OR b.expiry_date >= v_today)
    -- Loại 1: Chưa qua giờ nhận hôm nay (bắt buộc với toàn bộ túi dùng trong ngày, kể cả lặp lại)
    AND (COALESCE(b.bag_type, 'daily') != 'daily' OR b.pickup_end IS NULL OR v_now_time <= b.pickup_end)
    AND s.deleted_at IS NULL
    AND s.status = 'active'
    AND ST_DWithin(s.location, v_point, p_radius)
    AND (p_category IS NULL OR b.category::TEXT = p_category);

  RETURN QUERY
  SELECT
    b.id,
    b.store_id,
    b.name,
    b.description,
    b.original_price,
    b.discount_price,
    b.category,
    b.image_url,
    b.quantity,
    b.max_quantity,
    b.pickup_start,
    b.pickup_end,
    b.is_daily,
    b.is_available,
    b.created_at,
    b.updated_at,
    b.expires_at,
    b.deleted_at,
    s.name AS store_name,
    s.logo_url AS store_logo_url,
    s.address AS store_address,
    s.latitude,
    s.longitude,
    ST_Distance(s.location, v_point) AS distance_m,
    v_total AS total_count
  FROM surprise_bags b
  INNER JOIN stores s ON s.id = b.store_id
  WHERE b.deleted_at IS NULL
    AND b.is_available = true
    AND b.quantity > 0
    AND COALESCE(b.status, 'active') = 'active'
    AND (b.expiry_date IS NULL OR b.expiry_date >= v_today)
    AND (COALESCE(b.bag_type, 'daily') != 'daily' OR b.pickup_end IS NULL OR v_now_time <= b.pickup_end)
    AND s.deleted_at IS NULL
    AND s.status = 'active'
    AND ST_DWithin(s.location, v_point, p_radius)
    AND (p_category IS NULL OR b.category::TEXT = p_category)
  ORDER BY ST_Distance(s.location, v_point) ASC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."list_bags_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer, "p_category" "text", "p_page" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_stores_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer DEFAULT 5000, "p_category" "text" DEFAULT NULL::"text", "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "owner_user_id" "uuid", "name" "text", "description" "text", "phone" "text", "address" "text", "logo_url" "text", "banner_url" "text", "rating" real, "total_ratings" integer, "status" "public"."merchant_status", "commission_rate" real, "food_categories" "text"[], "open_time" time without time zone, "close_time" time without time zone, "is_open" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "deleted_at" timestamp with time zone, "latitude" double precision, "longitude" double precision, "distance_m" double precision, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_offset INTEGER;
  v_point  GEOGRAPHY(Point, 4326);
  v_total  BIGINT;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  v_point  := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

  -- Get total count (unfiltered by category for pagination meta)
  SELECT COUNT(*) INTO v_total
  FROM stores
  WHERE stores.deleted_at IS NULL
    AND stores.status = 'active'
    AND ST_DWithin(stores.location, v_point, p_radius)
    AND (p_category IS NULL OR p_category = ANY(stores.food_categories));

  RETURN QUERY
  SELECT
    s.id,
    s.owner_user_id,
    s.name,
    s.description,
    s.phone,
    s.address,
    s.logo_url,
    s.banner_url,
    s.rating,
    s.total_ratings,
    s.status,
    s.commission_rate,
    s.food_categories,
    s.open_time,
    s.close_time,
    s.is_open,
    s.created_at,
    s.updated_at,
    s.deleted_at,
    s.latitude,
    s.longitude,
    ST_Distance(s.location, v_point) AS distance_m,
    v_total AS total_count
  FROM stores s
  WHERE s.deleted_at IS NULL
    AND s.status = 'active'
    AND ST_DWithin(s.location, v_point, p_radius)
    AND (p_category IS NULL OR p_category = ANY(s.food_categories))
  ORDER BY ST_Distance(s.location, v_point) ASC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."list_stores_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer, "p_category" "text", "p_page" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_customer_order_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_title text;
  v_body text;
  v_order_label text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_order_label := COALESCE(NEW.qr_code, 'GSF-' || UPPER(SUBSTRING(NEW.id::text, 1, 6)));

  IF NEW.status = 'paid' THEN
    v_title := 'Thanh toán thành công 🎉';
    v_body := 'Đơn hàng ' || v_order_label || ' đã thanh toán thành công. Quán sẽ xác nhận trong ít phút.';
  ELSIF NEW.status = 'preparing' THEN
    v_title := 'Quán đang chuẩn bị món 🍳';
    v_body := 'Quán đã xác nhận đơn ' || v_order_label || ' và đang chuẩn bị món ăn cho bạn.';
  ELSIF NEW.status = 'ready_for_pickup' THEN
    v_title := 'Đơn hàng sẵn sàng nhận 🛍️';
    v_body := 'Đơn ' || v_order_label || ' đã sẵn sàng! Vui lòng đến quán xuất trình mã QR để nhận món.';
  ELSIF NEW.status = 'completed' THEN
    v_title := 'Đơn hàng đã hoàn thành ✨';
    v_body := 'Cảm ơn bạn đã giải cứu thực phẩm cùng GoSavingFood!';
  ELSIF NEW.status = 'cancelled' THEN
    v_title := 'Đơn hàng đã hủy';
    IF NEW.payment_status = 'refund_pending' THEN
      v_body := 'Đơn hàng ' || v_order_label || ' đã được hủy. Yêu cầu hoàn tiền của bạn đang được xử lý bởi GoSavingFood.';
    ELSE
      v_body := 'Đơn hàng ' || v_order_label || ' đã được hủy.';
    END IF;
  ELSIF NEW.status = 'expired' THEN
    v_title := 'Đơn hàng đã hết hạn ⏰';
    v_body := 'Đơn hàng ' || v_order_label || ' đã hết thời gian chờ thanh toán.';
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
$$;


ALTER FUNCTION "public"."notify_customer_order_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_store_new_order"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_owner uuid;
  v_store_name text;
  v_order_label text;
BEGIN
  IF (TG_OP = 'UPDATE' AND (
        (OLD.payment_status != 'success' AND NEW.payment_status = 'success')
        OR (OLD.status != 'paid' AND NEW.status = 'paid')
     ))
     OR (TG_OP = 'INSERT' AND NEW.payment_status = 'success') THEN
     
    SELECT owner_user_id, name INTO v_owner, v_store_name
    FROM public.stores
    WHERE id = NEW.store_id AND deleted_at IS NULL;

    v_order_label := COALESCE(NEW.qr_code, 'GSF-' || UPPER(SUBSTRING(NEW.id::text, 1, 6)));

    IF v_owner IS NOT NULL THEN
      INSERT INTO public.notifications (id, user_id, icon, title, body, data)
      VALUES (
        gen_random_uuid(),
        v_owner,
        'order',
        'Đơn hàng mới đã thanh toán! 🎉',
        'Đơn ' || v_order_label || ' đã thanh toán thành công qua VietQR. Vui lòng xác nhận và chuẩn bị món.',
        jsonb_build_object('orderId', NEW.id, 'status', NEW.status, 'storeName', v_store_name)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_store_new_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order"("p_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text" DEFAULT NULL::"text", "p_recipient_phone" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_email text;
  v_caller_name text;
  v_caller_phone text;
  v_customer_id uuid;
  v_clean_phone text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_customer_id := auth.uid();

  -- Tự động đảm bảo user tồn tại trong public.users
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_customer_id) THEN
    SELECT email,
           COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
           COALESCE(raw_user_meta_data->>'phone', '')
    INTO v_caller_email, v_caller_name, v_caller_phone
    FROM auth.users
    WHERE id = v_customer_id;

    v_clean_phone := NULLIF(TRIM(COALESCE(p_recipient_phone, v_caller_phone, '')), '');
    IF v_clean_phone IS NOT NULL AND EXISTS (SELECT 1 FROM public.users WHERE phone = v_clean_phone) THEN
      v_clean_phone := NULL; -- Tránh xung đột unique constraint
    END IF;

    INSERT INTO public.users (id, role, name, email, phone, created_at, updated_at)
    VALUES (
      v_customer_id,
      'customer',
      COALESCE(p_recipient_name, v_caller_name, 'Khách hàng'),
      COALESCE(v_caller_email, v_customer_id::text || '@placeholder.gsf'),
      v_clean_phone,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
  END IF;

  RETURN public.create_order_transaction(
    p_id,
    v_customer_id,
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
    p_qr_code,
    p_recipient_name,
    p_recipient_phone
  );
END;
$$;


ALTER FUNCTION "public"."place_order"("p_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text", "p_recipient_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_order_cancel_reason"("p_order_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
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
$$;


ALTER FUNCTION "public"."set_order_cancel_reason"("p_order_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."stamp_order_cancelled_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."stamp_order_cancelled_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_store_status"("p_store_id" "uuid", "p_is_open" boolean DEFAULT NULL::boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_current_status boolean;
  v_new_status boolean;
  v_store_name text;
BEGIN
  -- 1. Tìm store và lock row
  SELECT is_open, name INTO v_current_status, v_store_name
  FROM public.stores
  WHERE id = p_store_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND' USING DETAIL = p_store_id::TEXT;
  END IF;

  -- 2. Xác định trạng thái mới: nếu p_is_open được truyền thì dùng, ngược lại đảo ngược trạng thái hiện tại
  IF p_is_open IS NOT NULL THEN
    v_new_status := p_is_open;
  ELSE
    v_new_status := NOT COALESCE(v_current_status, true);
  END IF;

  -- 3. Cập nhật trạng thái mở/đóng và thời gian cập nhật
  UPDATE public.stores
  SET is_open = v_new_status,
      updated_at = NOW()
  WHERE id = p_store_id;

  RETURN jsonb_build_object(
    'store_id', p_store_id,
    'store_name', v_store_name,
    'is_open', v_new_status,
    'previous_status', v_current_status,
    'updated_at', NOW()
  );
END;
$$;


ALTER FUNCTION "public"."toggle_store_status"("p_store_id" "uuid", "p_is_open" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_order_status_transaction"("p_order_id" "uuid", "p_target_status" "text", "p_actor_id" "uuid", "p_actor_role" "text", "p_reason" "text" DEFAULT NULL::"text", "p_bank_info" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_status TEXT;
  v_customer_id UUID;
  v_store_id UUID;
  v_final_amount INTEGER;
  v_created_at TIMESTAMPTZ;
  v_pickup_time TIMESTAMPTZ;
  v_payment_method TEXT;
  v_payment_status TEXT;
  v_voucher_code TEXT;
  v_completed_at TIMESTAMPTZ;
  v_cancelled_at TIMESTAMPTZ;
  v_cancel_reason TEXT;
  v_pickup_token UUID;
  v_updated_status TEXT;
  v_updated_payment_status TEXT;
  v_item RECORD;
  v_order_label TEXT;
  v_store_owner UUID;
  v_real_user_role TEXT;
BEGIN
  -- 0. Xác thực bảo mật: Ngăn chặn leo thang đặc quyền
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING DETAIL = 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';
  END IF;

  SELECT role INTO v_real_user_role FROM public.users WHERE id = auth.uid();
  IF v_real_user_role IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING DETAIL = 'Không tìm thấy hồ sơ người dùng trong hệ thống.';
  END IF;

  IF p_actor_role = 'admin' AND v_real_user_role != 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Bạn không có quyền quản trị viên để thực hiện thao tác này.';
  END IF;

  -- 1. Khóa đơn & đọc dữ liệu
  SELECT status, customer_id, store_id, final_amount, created_at, pickup_time, payment_method, payment_status, voucher_code, completed_at, cancelled_at, cancel_reason, pickup_token
  INTO v_current_status, v_customer_id, v_store_id, v_final_amount, v_created_at, v_pickup_time, v_payment_method, v_payment_status, v_voucher_code, v_completed_at, v_cancelled_at, v_cancel_reason, v_pickup_token
  FROM public.orders
  WHERE id = p_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING DETAIL = p_order_id::TEXT;
  END IF;

  v_order_label := 'GSF-' || UPPER(SUBSTRING(p_order_id::text, 1, 6));

  -- 2. Kiểm tra quyền sở hữu đối với Customer
  IF p_actor_role = 'customer' THEN
    IF auth.uid() != v_customer_id THEN
      RAISE EXCEPTION 'FORBIDDEN' USING DETAIL = 'Bạn không có quyền thao tác trên đơn hàng của người khác.';
    END IF;
  END IF;

  -- 3. Xử lý logic chuyển trạng thái
  IF p_target_status = 'cancelled' THEN
    -- RBAC hủy đơn:
    IF p_actor_role = 'customer' THEN
      IF v_current_status NOT IN ('pending_payment', 'paid') THEN
        RAISE EXCEPTION 'CANCEL_NOT_ALLOWED'
          USING DETAIL = 'Khách hàng chỉ được hủy khi đơn ở trạng thái chờ thanh toán hoặc quán chưa chuẩn bị món.';
      END IF;
    ELSIF p_actor_role = 'merchant' THEN
      IF v_current_status IN ('completed', 'cancelled', 'expired') THEN
        RAISE EXCEPTION 'CANCEL_NOT_ALLOWED'
          USING DETAIL = 'Không thể hủy đơn hàng đã kết thúc.';
      END IF;
    END IF;

    v_updated_status := 'cancelled';
    v_cancelled_at := NOW();
    v_cancel_reason := COALESCE(p_reason, 'Người dùng hủy đơn');

    -- Tự động hoàn kho cho các túi trong đơn
    FOR v_item IN SELECT bag_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
      UPDATE public.surprise_bags
      SET quantity = quantity + v_item.quantity,
          is_available = true,
          status = 'active',
          updated_at = NOW()
      WHERE id = v_item.bag_id;
    END LOOP;

    -- Hoàn voucher nếu có
    IF v_voucher_code IS NOT NULL AND v_voucher_code != '' THEN
      UPDATE public.vouchers
      SET used_count = GREATEST(0, used_count - 1),
          updated_at = NOW()
      WHERE code = v_voucher_code AND deleted_at IS NULL;
    END IF;

    -- Hoàn tiền VietQR: Nếu đơn đã thanh toán (payment_status = 'success' hoặc status = 'paid')
    IF (v_payment_status = 'success' OR v_current_status = 'paid') THEN
      IF COALESCE(v_final_amount, 0) > 0 THEN
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
      ELSE
        -- Đơn hàng 0đ: Không cần tạo refund_requests, set luôn refunded
        v_updated_payment_status := 'refunded';
      END IF;

      -- Nếu khách hủy đơn: Bắn thông báo cho Chủ quán biết
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
    ELSE
      v_updated_payment_status := v_payment_status;
    END IF;

    -- Thu hồi mã nhận hàng & thông tin PayOS
    v_pickup_token := NULL;

  ELSIF p_target_status = 'preparing' THEN
    IF v_current_status != 'paid' AND v_current_status != 'pending' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION' USING DETAIL = 'Chỉ có thể chuẩn bị món từ đơn đã thanh toán.';
    END IF;
    v_updated_status := 'preparing';
    v_updated_payment_status := v_payment_status;

  ELSIF p_target_status = 'ready_for_pickup' THEN
    IF v_current_status != 'preparing' AND v_current_status != 'paid' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION' USING DETAIL = 'Đơn hàng phải đang chuẩn bị trước khi sẵn sàng giao.';
    END IF;
    v_updated_status := 'ready_for_pickup';
    v_updated_payment_status := v_payment_status;

  ELSIF p_target_status = 'completed' THEN
    IF v_current_status != 'ready_for_pickup' AND v_current_status != 'preparing' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION' USING DETAIL = 'Đơn hàng chưa sẵn sàng để hoàn thành.';
    END IF;
    v_updated_status := 'completed';
    v_completed_at := NOW();
    v_updated_payment_status := v_payment_status;

  ELSE
    RAISE EXCEPTION 'UNKNOWN_TARGET_STATUS' USING DETAIL = p_target_status;
  END IF;

  -- 4. Cập nhật vào DB
  UPDATE public.orders
  SET status = v_updated_status::order_status,
      payment_status = v_updated_payment_status::payment_status,
      completed_at = v_completed_at,
      cancelled_at = v_cancelled_at,
      cancel_reason = v_cancel_reason,
      pickup_token = v_pickup_token,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', v_updated_status,
    'payment_status', v_updated_payment_status
  );
END;
$$;


ALTER FUNCTION "public"."transition_order_status_transaction"("p_order_id" "uuid", "p_target_status" "text", "p_actor_id" "uuid", "p_actor_role" "text", "p_reason" "text", "p_bank_info" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_order_note"("p_order_id" "uuid", "p_note" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_order_note"("p_order_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_store_location_and_fields"("p_owner_user_id" "uuid", "p_latitude" double precision, "p_longitude" double precision, "p_updates" "jsonb") RETURNS TABLE("id" "uuid", "owner_user_id" "uuid", "name" "text", "description" "text", "phone" "text", "address" "text", "logo_url" "text", "banner_url" "text", "rating" real, "total_ratings" integer, "status" "public"."merchant_status", "commission_rate" real, "food_categories" "text"[], "open_time" time without time zone, "close_time" time without time zone, "is_open" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "deleted_at" timestamp with time zone, "latitude" double precision, "longitude" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_store_location_and_fields"("p_owner_user_id" "uuid", "p_latitude" double precision, "p_longitude" double precision, "p_updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_store_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
            DECLARE
                target_store_id UUID;
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    target_store_id := OLD.store_id;
                ELSE
                    target_store_id := NEW.store_id;
                END IF;

                UPDATE public.stores
                SET rating = COALESCE((
                    SELECT AVG(rating)::REAL
                    FROM public.reviews
                    WHERE store_id = target_store_id AND deleted_at IS NULL
                ), 0.0),
                total_ratings = COALESCE((
                    SELECT COUNT(*)
                    FROM public.reviews
                    WHERE store_id = target_store_id AND deleted_at IS NULL
                ), 0)
                WHERE id = target_store_id;

                RETURN NULL;
            END;
            $$;


ALTER FUNCTION "public"."update_store_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_pickup_qr"("p_token" "uuid", "p_store_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE pickup_token = p_token
    AND store_id = p_store_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1 FROM public.orders
      WHERE pickup_token = p_token AND status = 'completed'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'ALREADY_COMPLETED', 'message', 'Đơn hàng này đã được bàn giao trước đó!');
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TOKEN', 'message', 'Mã QR không hợp lệ hoặc không thuộc cửa hàng này.');
  END IF;

  IF v_order.status != 'ready_for_pickup' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', 'Đơn hàng đang ở trạng thái "' || v_order.status::text || '", chưa sẵn sàng nhận.'
    );
  END IF;

  -- Hoàn thành đơn & vô hiệu hóa token
  UPDATE public.orders
  SET status = 'completed'::order_status,
      completed_at = NOW(),
      updated_at = NOW(),
      pickup_token = NULL
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_code', COALESCE(v_order.qr_code, 'GSF-' || UPPER(SUBSTRING(v_order.id::text, 1, 6))),
    'final_amount', v_order.final_amount,
    'status', 'completed'
  );
END;
$$;


ALTER FUNCTION "public"."verify_pickup_qr"("p_token" "uuid", "p_store_id" "uuid") OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."_migrations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."_migrations_id_seq" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_migrations" (
    "id" integer DEFAULT "nextval"('"public"."_migrations_id_seq"'::"regclass") NOT NULL,
    "name" character varying NOT NULL,
    "run_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "admin_name" character varying,
    "action" character varying NOT NULL,
    "entity_type" character varying NOT NULL,
    "entity_id" character varying,
    "changes" "jsonb",
    "details" "text",
    "ip_address" character varying,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying NOT NULL,
    "image_url" "text" NOT NULL,
    "target_type" character varying DEFAULT 'STORE'::character varying NOT NULL,
    "target_id" character varying,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."banners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."idempotency_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "request_hash" "text" NOT NULL,
    "response" "jsonb",
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."idempotency_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reporter_role" "public"."reporter_role" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "public"."issue_status" DEFAULT 'pending'::"public"."issue_status" NOT NULL,
    "resolution" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."issues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "icon" "text",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "bag_id" "uuid" NOT NULL,
    "bag_name" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" integer NOT NULL,
    "total_price" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_total_price_check" CHECK (("total_price" > 0)),
    CONSTRAINT "order_items_unit_price_check" CHECK (("unit_price" > 0)),
    CONSTRAINT "valid_total" CHECK (("total_price" = ("unit_price" * "quantity")))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "total_original_price" integer NOT NULL,
    "total_discount_price" integer NOT NULL,
    "discount_amount" integer DEFAULT 0 NOT NULL,
    "final_amount" integer NOT NULL,
    "voucher_code" "text",
    "status" "public"."order_status" DEFAULT 'pending_payment'::"public"."order_status" NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "qr_code" "text" NOT NULL,
    "pickup_time" timestamp with time zone NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "cancel_reason" "text",
    "cancelled_at" timestamp with time zone,
    "payment_order_code" bigint,
    "payment_link_id" "text",
    "checkout_url" "text",
    "payment_expires_at" timestamp with time zone DEFAULT ("now"() + '00:33:00'::interval),
    "pickup_token" "uuid" DEFAULT "gen_random_uuid"(),
    "paid_at" timestamp with time zone,
    "recipient_name" "text",
    "recipient_phone" "text",
    "payos_qr_code" "text",
    "payos_description" "text",
    "payos_account_number" "text",
    CONSTRAINT "orders_discount_amount_check" CHECK (("discount_amount" >= 0)),
    CONSTRAINT "orders_final_amount_check" CHECK (("final_amount" >= 0)),
    CONSTRAINT "orders_total_discount_price_check" CHECK (("total_discount_price" >= 0)),
    CONSTRAINT "orders_total_original_price_check" CHECK (("total_original_price" >= 0))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text",
    "auth" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refund_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "bank_account_info" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."refund_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "total_orders" integer DEFAULT 0 NOT NULL,
    "gross_sales" numeric DEFAULT 0 NOT NULL,
    "commission_rate" numeric DEFAULT 20.00 NOT NULL,
    "commission_amount" numeric DEFAULT 0 NOT NULL,
    "payment_fee" numeric DEFAULT 0 NOT NULL,
    "net_payout" numeric DEFAULT 0 NOT NULL,
    "status" character varying DEFAULT 'PENDING'::character varying NOT NULL,
    "paid_at" timestamp with time zone,
    "payout_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."settlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "phone" "text" NOT NULL,
    "address" "text" NOT NULL,
    "location" "public"."geography" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "logo_url" "text",
    "banner_url" "text",
    "rating" real DEFAULT 0.0 NOT NULL,
    "total_ratings" integer DEFAULT 0 NOT NULL,
    "status" "public"."merchant_status" DEFAULT 'active'::"public"."merchant_status" NOT NULL,
    "commission_rate" real DEFAULT 15.0 NOT NULL,
    "food_categories" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "open_time" time without time zone NOT NULL,
    "close_time" time without time zone NOT NULL,
    "is_open" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "check_stores_banner_len" CHECK ((("banner_url" IS NULL) OR ("length"("banner_url") <= 500))),
    CONSTRAINT "check_stores_logo_len" CHECK ((("logo_url" IS NULL) OR ("length"("logo_url") <= 500))),
    CONSTRAINT "stores_commission_rate_check" CHECK ((("commission_rate" >= (0)::double precision) AND ("commission_rate" <= (100)::double precision))),
    CONSTRAINT "stores_rating_check" CHECK ((("rating" >= (0)::double precision) AND ("rating" <= (5)::double precision))),
    CONSTRAINT "stores_total_ratings_check" CHECK (("total_ratings" >= 0)),
    CONSTRAINT "valid_hours" CHECK (("close_time" > "open_time"))
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."surprise_bags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "original_price" integer NOT NULL,
    "discount_price" integer NOT NULL,
    "category" "public"."bag_category" NOT NULL,
    "image_url" "text",
    "quantity" integer DEFAULT 0 NOT NULL,
    "max_quantity" integer DEFAULT 3 NOT NULL,
    "pickup_start" time without time zone NOT NULL,
    "pickup_end" time without time zone NOT NULL,
    "is_daily" boolean DEFAULT true NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "deleted_at" timestamp with time zone,
    "bag_type" "text" DEFAULT 'daily'::"text" NOT NULL,
    "repeat_mode" "text" DEFAULT 'today_only'::"text" NOT NULL,
    "daily_quota" integer DEFAULT 3,
    "expiry_date" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    CONSTRAINT "check_bag_status" CHECK (("status" = ANY (ARRAY['active'::"text", 'sold_out'::"text", 'archived'::"text", 'expired'::"text"]))),
    CONSTRAINT "check_bag_type" CHECK (("bag_type" = ANY (ARRAY['daily'::"text", 'shelf_life'::"text"]))),
    CONSTRAINT "check_repeat_mode" CHECK (("repeat_mode" = ANY (ARRAY['today_only'::"text", 'recurring'::"text"]))),
    CONSTRAINT "check_surprise_bags_image_len" CHECK ((("image_url" IS NULL) OR ("length"("image_url") <= 500))),
    CONSTRAINT "surprise_bags_discount_price_check" CHECK (("discount_price" > 0)),
    CONSTRAINT "surprise_bags_max_quantity_check" CHECK (("max_quantity" > 0)),
    CONSTRAINT "surprise_bags_original_price_check" CHECK (("original_price" > 0)),
    CONSTRAINT "surprise_bags_quantity_check" CHECK (("quantity" >= 0)),
    CONSTRAINT "valid_discount" CHECK (("discount_price" < "original_price")),
    CONSTRAINT "valid_expiry" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "valid_pickup_window" CHECK (("pickup_end" > "pickup_start"))
);


ALTER TABLE "public"."surprise_bags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "avatar_url" "text",
    "role" "public"."user_role" DEFAULT 'customer'::"public"."user_role" NOT NULL,
    "store_id" "uuid",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "public"."voucher_discount_type" NOT NULL,
    "discount_value" integer NOT NULL,
    "min_order_value" integer DEFAULT 0 NOT NULL,
    "max_discount" integer,
    "quantity" integer NOT NULL,
    "used_count" integer DEFAULT 0 NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_hidden" boolean DEFAULT false,
    CONSTRAINT "valid_dates" CHECK (("end_date" > "start_date")),
    CONSTRAINT "valid_discount_type" CHECK (((("discount_type" = 'percentage'::"public"."voucher_discount_type") AND ("discount_value" <= 100)) OR (("discount_type" = 'fixed'::"public"."voucher_discount_type") AND ("discount_value" > 0)))),
    CONSTRAINT "valid_quantity" CHECK (("used_count" <= "quantity")),
    CONSTRAINT "vouchers_discount_value_check" CHECK (("discount_value" > 0)),
    CONSTRAINT "vouchers_max_discount_check" CHECK (("max_discount" > 0)),
    CONSTRAINT "vouchers_min_order_value_check" CHECK (("min_order_value" >= 0)),
    CONSTRAINT "vouchers_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "vouchers_used_count_check" CHECK (("used_count" >= 0))
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."_migrations"
    ADD CONSTRAINT "_migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."_migrations"
    ADD CONSTRAINT "_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."idempotency_keys"
    ADD CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_payment_order_code_key" UNIQUE ("payment_order_code");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_qr_code_key" UNIQUE ("qr_code");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."surprise_bags"
    ADD CONSTRAINT "surprise_bags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "uq_user_endpoint" UNIQUE ("user_id", "endpoint");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_created" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_bags_available" ON "public"."surprise_bags" USING "btree" ("is_available", "quantity") WHERE (("deleted_at" IS NULL) AND ("is_available" = true) AND ("quantity" > 0));



CREATE INDEX "idx_bags_category" ON "public"."surprise_bags" USING "btree" ("category") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_bags_covering_catalog" ON "public"."surprise_bags" USING "btree" ("store_id", "is_available", "quantity", "discount_price") INCLUDE ("id", "name", "category", "image_url") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_bags_expires" ON "public"."surprise_bags" USING "btree" ("expires_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_bags_pickup_window" ON "public"."surprise_bags" USING "btree" ("pickup_start", "pickup_end") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_bags_store" ON "public"."surprise_bags" USING "btree" ("store_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_banners_active_order" ON "public"."banners" USING "btree" ("is_active", "display_order");



CREATE INDEX "idx_idempotency_keys_expires" ON "public"."idempotency_keys" USING "btree" ("expires_at");



CREATE INDEX "idx_idempotency_keys_key" ON "public"."idempotency_keys" USING "btree" ("key");



CREATE INDEX "idx_idempotency_keys_user_id" ON "public"."idempotency_keys" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_idempotency_keys_user_key" ON "public"."idempotency_keys" USING "btree" ("user_id", "key") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_issues_order" ON "public"."issues" USING "btree" ("order_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_issues_reporter" ON "public"."issues" USING "btree" ("reporter_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_issues_status" ON "public"."issues" USING "btree" ("status", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE (("deleted_at" IS NULL) AND ("is_read" = false));



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_order_items_bag" ON "public"."order_items" USING "btree" ("bag_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_orders_created_at_desc" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_customer" ON "public"."orders" USING "btree" ("customer_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_orders_customer_id" ON "public"."orders" USING "btree" ("customer_id");



CREATE INDEX "idx_orders_payment_expires_at" ON "public"."orders" USING "btree" ("payment_expires_at");



CREATE INDEX "idx_orders_payment_order_code" ON "public"."orders" USING "btree" ("payment_order_code");



CREATE INDEX "idx_orders_pickup_token" ON "public"."orders" USING "btree" ("pickup_token");



CREATE INDEX "idx_orders_qr" ON "public"."orders" USING "btree" ("qr_code") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_store" ON "public"."orders" USING "btree" ("store_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_orders_store_id" ON "public"."orders" USING "btree" ("store_id");



CREATE INDEX "idx_orders_voucher" ON "public"."orders" USING "btree" ("voucher_code") WHERE ("voucher_code" IS NOT NULL);



CREATE INDEX "idx_refund_requests_customer_id" ON "public"."refund_requests" USING "btree" ("customer_id");



CREATE INDEX "idx_refund_requests_order_id" ON "public"."refund_requests" USING "btree" ("order_id");



CREATE INDEX "idx_reviews_customer" ON "public"."reviews" USING "btree" ("customer_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_reviews_order" ON "public"."reviews" USING "btree" ("order_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_reviews_store" ON "public"."reviews" USING "btree" ("store_id", "rating" DESC, "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_reviews_store_id" ON "public"."reviews" USING "btree" ("store_id");



CREATE INDEX "idx_settlements_store_status" ON "public"."settlements" USING "btree" ("store_id", "status");



CREATE INDEX "idx_stores_food_categories" ON "public"."stores" USING "gin" ("food_categories") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_stores_location" ON "public"."stores" USING "gist" ("location") WHERE (("deleted_at" IS NULL) AND ("status" = 'active'::"public"."merchant_status") AND ("is_open" = true));



CREATE INDEX "idx_stores_owner" ON "public"."stores" USING "btree" ("owner_user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_stores_rating" ON "public"."stores" USING "btree" ("rating" DESC) WHERE (("deleted_at" IS NULL) AND ("status" = 'active'::"public"."merchant_status"));



CREATE INDEX "idx_stores_status" ON "public"."stores" USING "btree" ("status") WHERE (("deleted_at" IS NULL) AND ("status" = 'active'::"public"."merchant_status"));



CREATE INDEX "idx_surprise_bags_available" ON "public"."surprise_bags" USING "btree" ("is_available");



CREATE INDEX "idx_surprise_bags_store_id" ON "public"."surprise_bags" USING "btree" ("store_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email") WHERE (("email" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_users_phone" ON "public"."users" USING "btree" ("phone") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_users_store_id" ON "public"."users" USING "btree" ("store_id") WHERE ("store_id" IS NOT NULL);



CREATE INDEX "idx_vouchers_active" ON "public"."vouchers" USING "btree" ("is_active", "start_date", "end_date") WHERE (("deleted_at" IS NULL) AND ("is_active" = true));



CREATE INDEX "idx_vouchers_code" ON "public"."vouchers" USING "btree" ("code") WHERE ("deleted_at" IS NULL);



CREATE OR REPLACE TRIGGER "auto_deactivate_surprise_bag" BEFORE UPDATE ON "public"."surprise_bags" FOR EACH ROW EXECUTE FUNCTION "public"."auto_deactivate_bag"();



CREATE OR REPLACE TRIGGER "notify_customer_order_status" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."notify_customer_order_status"();



CREATE OR REPLACE TRIGGER "notify_store_new_order" AFTER INSERT OR UPDATE OF "payment_status", "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."notify_store_new_order"();



CREATE OR REPLACE TRIGGER "stamp_order_cancelled_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_order_cancelled_at"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reviews_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_store_rating_after_review" AFTER INSERT OR DELETE OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_store_rating"();



CREATE OR REPLACE TRIGGER "update_stores_updated_at" BEFORE UPDATE ON "public"."stores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_surprise_bags_updated_at" BEFORE UPDATE ON "public"."surprise_bags" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vouchers_updated_at" BEFORE UPDATE ON "public"."vouchers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "fk_users_store_id" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."idempotency_keys"
    ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_bag_id_fkey" FOREIGN KEY ("bag_id") REFERENCES "public"."surprise_bags"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_voucher_code_fkey" FOREIGN KEY ("voucher_code") REFERENCES "public"."vouchers"("code") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."surprise_bags"
    ADD CONSTRAINT "surprise_bags_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



CREATE POLICY "Admin full access banners" ON "public"."banners" USING ("public"."is_admin"());



CREATE POLICY "Admin full access settlements" ON "public"."settlements" USING ("public"."is_admin"());



CREATE POLICY "Admin insert audit logs" ON "public"."admin_audit_logs" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin read audit logs" ON "public"."admin_audit_logs" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can manage all stores" ON "public"."stores" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage all surprise bags" ON "public"."surprise_bags" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage vouchers" ON "public"."vouchers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update issues" ON "public"."issues" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can update orders" ON "public"."orders" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can view all issues" ON "public"."issues" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all orders" ON "public"."orders" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all users" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Customers can create orders" ON "public"."orders" FOR INSERT WITH CHECK ((("customer_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Customers can create own reviews" ON "public"."reviews" FOR INSERT WITH CHECK ((("customer_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Customers can update own reviews" ON "public"."reviews" FOR UPDATE USING ((("customer_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Customers can view own order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."customer_id" = "auth"."uid"())))));



CREATE POLICY "Customers can view own orders" ON "public"."orders" FOR SELECT USING ((("customer_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Customers view own refund requests" ON "public"."refund_requests" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "customer_id"));



CREATE POLICY "Merchant read own settlements" ON "public"."settlements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."stores"
  WHERE (("stores"."id" = "settlements"."store_id") AND ("stores"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Public can view active stores" ON "public"."stores" FOR SELECT USING ((("status" = 'active'::"public"."merchant_status") AND ("deleted_at" IS NULL)));



CREATE POLICY "Public can view active vouchers" ON "public"."vouchers" FOR SELECT USING ((("is_active" = true) AND ("deleted_at" IS NULL)));



CREATE POLICY "Public can view available bags" ON "public"."surprise_bags" FOR SELECT USING ((("is_available" = true) AND ("deleted_at" IS NULL)));



CREATE POLICY "Public can view reviews" ON "public"."reviews" FOR SELECT USING (("deleted_at" IS NULL));



CREATE POLICY "Public read active banners" ON "public"."banners" FOR SELECT USING ((("is_active" = true) AND (("start_date" IS NULL) OR ("start_date" <= "now"())) AND (("end_date" IS NULL) OR ("end_date" >= "now"()))));



CREATE POLICY "Service role manages refund requests" ON "public"."refund_requests" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Store owners can insert own store" ON "public"."stores" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "Store owners can manage own bags" ON "public"."surprise_bags" USING ((EXISTS ( SELECT 1
   FROM "public"."stores"
  WHERE (("stores"."id" = "surprise_bags"."store_id") AND ("stores"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Store owners can update own store" ON "public"."stores" FOR UPDATE USING ((("owner_user_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Store owners can update store orders" ON "public"."orders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."stores"
  WHERE (("stores"."id" = "orders"."store_id") AND ("stores"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Store owners can view own order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."orders"
     JOIN "public"."stores" ON (("stores"."id" = "orders"."store_id")))
  WHERE (("orders"."id" = "order_items"."order_id") AND ("stores"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Store owners can view store issues" ON "public"."issues" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders"
     JOIN "public"."stores" ON (("orders"."store_id" = "stores"."id")))
  WHERE (("orders"."id" = "issues"."order_id") AND ("stores"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Store owners can view store orders" ON "public"."orders" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."stores"
  WHERE (("stores"."id" = "orders"."store_id") AND ("stores"."owner_user_id" = "auth"."uid"())))) AND ("deleted_at" IS NULL)));



CREATE POLICY "Store owners can view their customers" ON "public"."users" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."customer_id" = "users"."id") AND ("o"."deleted_at" IS NULL)))));



CREATE POLICY "Users can create issues" ON "public"."issues" FOR INSERT WITH CHECK ((("reporter_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can manage their push subscriptions" ON "public"."push_subscriptions" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own issues" ON "public"."issues" FOR SELECT USING ((("reporter_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."idempotency_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."issues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."refund_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."surprise_bags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";




































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."auto_deactivate_bag"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_deactivate_bag"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_deactivate_bag"() TO "service_role";
GRANT ALL ON FUNCTION "public"."auto_deactivate_bag"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."cleanup_expired_idempotency_keys"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_idempotency_keys"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_idempotency_keys"() TO "service_role";
GRANT ALL ON FUNCTION "public"."cleanup_expired_idempotency_keys"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."cleanup_expired_pending_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_pending_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_pending_orders"() TO "service_role";
GRANT ALL ON FUNCTION "public"."cleanup_expired_pending_orders"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."confirm_order_payment"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_order_payment"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_order_payment"("p_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."confirm_order_payment"("p_order_id" "uuid") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."confirm_payos_payment"("p_order_code" bigint, "p_payment_link_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_payos_payment"("p_order_code" bigint, "p_payment_link_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_payos_payment"("p_order_code" bigint, "p_payment_link_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."confirm_payos_payment"("p_order_code" bigint, "p_payment_link_id" "text") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."create_order_transaction"("p_id" "uuid", "p_customer_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text", "p_recipient_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_transaction"("p_id" "uuid", "p_customer_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text", "p_recipient_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_transaction"("p_id" "uuid", "p_customer_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text", "p_recipient_phone" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_order_transaction"("p_id" "uuid", "p_customer_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text", "p_recipient_phone" "text") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."create_store"("p_owner_user_id" "uuid", "p_name" "text", "p_description" "text", "p_phone" "text", "p_address" "text", "p_latitude" double precision, "p_longitude" double precision, "p_logo_url" "text", "p_banner_url" "text", "p_food_categories" "text"[], "p_open_time" time without time zone, "p_close_time" time without time zone, "p_is_open" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_store"("p_owner_user_id" "uuid", "p_name" "text", "p_description" "text", "p_phone" "text", "p_address" "text", "p_latitude" double precision, "p_longitude" double precision, "p_logo_url" "text", "p_banner_url" "text", "p_food_categories" "text"[], "p_open_time" time without time zone, "p_close_time" time without time zone, "p_is_open" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_store"("p_owner_user_id" "uuid", "p_name" "text", "p_description" "text", "p_phone" "text", "p_address" "text", "p_latitude" double precision, "p_longitude" double precision, "p_logo_url" "text", "p_banner_url" "text", "p_food_categories" "text"[], "p_open_time" time without time zone, "p_close_time" time without time zone, "p_is_open" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."create_store"("p_owner_user_id" "uuid", "p_name" "text", "p_description" "text", "p_phone" "text", "p_address" "text", "p_latitude" double precision, "p_longitude" double precision, "p_logo_url" "text", "p_banner_url" "text", "p_food_categories" "text"[], "p_open_time" time without time zone, "p_close_time" time without time zone, "p_is_open" boolean) TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."cron_daily_bag_cycle"() TO "anon";
GRANT ALL ON FUNCTION "public"."cron_daily_bag_cycle"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cron_daily_bag_cycle"() TO "service_role";
GRANT ALL ON FUNCTION "public"."cron_daily_bag_cycle"() TO "supabase_auth_admin";



REVOKE ALL ON FUNCTION "public"."delete_user_account"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_user_account"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_user_account"("p_user_id" "uuid") TO "supabase_auth_admin";



REVOKE ALL ON FUNCTION "public"."delete_user_by_identifier"("p_identifier" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_user_by_identifier"("p_identifier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_by_identifier"("p_identifier" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_user_by_identifier"("p_identifier" "text") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."expire_noshow_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_noshow_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_noshow_orders"() TO "service_role";
GRANT ALL ON FUNCTION "public"."expire_noshow_orders"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."expire_stale_surprise_bags"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_stale_surprise_bags"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_stale_surprise_bags"() TO "service_role";
GRANT ALL ON FUNCTION "public"."expire_stale_surprise_bags"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."expire_unpaid_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_unpaid_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_unpaid_orders"() TO "service_role";
GRANT ALL ON FUNCTION "public"."expire_unpaid_orders"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."get_email_by_phone"("p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_by_phone"("p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_by_phone"("p_phone" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_email_by_phone"("p_phone" "text") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."get_store_by_owner"("p_owner_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_by_owner"("p_owner_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_by_owner"("p_owner_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_store_by_owner"("p_owner_user_id" "uuid") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."is_store_owner"("p_user_id" "uuid", "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_store_owner"("p_user_id" "uuid", "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_store_owner"("p_user_id" "uuid", "p_store_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_store_owner"("p_user_id" "uuid", "p_store_id" "uuid") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."list_bags_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer, "p_category" "text", "p_page" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_bags_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer, "p_category" "text", "p_page" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_bags_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer, "p_category" "text", "p_page" integer, "p_limit" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."list_bags_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer, "p_category" "text", "p_page" integer, "p_limit" integer) TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."list_stores_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer, "p_category" "text", "p_page" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_stores_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer, "p_category" "text", "p_page" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_stores_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer, "p_category" "text", "p_page" integer, "p_limit" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."list_stores_nearby"("p_lat" double precision, "p_lng" double precision, "p_radius" integer, "p_category" "text", "p_page" integer, "p_limit" integer) TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."notify_customer_order_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_customer_order_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_customer_order_status"() TO "service_role";
GRANT ALL ON FUNCTION "public"."notify_customer_order_status"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."notify_store_new_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_store_new_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_store_new_order"() TO "service_role";
GRANT ALL ON FUNCTION "public"."notify_store_new_order"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."place_order"("p_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text", "p_recipient_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."place_order"("p_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text", "p_recipient_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."place_order"("p_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text", "p_recipient_phone" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."place_order"("p_id" "uuid", "p_store_id" "uuid", "p_idempotency_key" "text", "p_items" "jsonb", "p_voucher_code" "text", "p_pickup_time" timestamp with time zone, "p_payment_method" "text", "p_note" "text", "p_total_original_price" integer, "p_total_discount_price" integer, "p_discount_amount" integer, "p_final_amount" integer, "p_qr_code" "text", "p_recipient_name" "text", "p_recipient_phone" "text") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."set_order_cancel_reason"("p_order_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_order_cancel_reason"("p_order_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_order_cancel_reason"("p_order_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."set_order_cancel_reason"("p_order_id" "uuid", "p_reason" "text") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."stamp_order_cancelled_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."stamp_order_cancelled_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."stamp_order_cancelled_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."stamp_order_cancelled_at"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."toggle_store_status"("p_store_id" "uuid", "p_is_open" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_store_status"("p_store_id" "uuid", "p_is_open" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_store_status"("p_store_id" "uuid", "p_is_open" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."toggle_store_status"("p_store_id" "uuid", "p_is_open" boolean) TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."transition_order_status_transaction"("p_order_id" "uuid", "p_target_status" "text", "p_actor_id" "uuid", "p_actor_role" "text", "p_reason" "text", "p_bank_info" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."transition_order_status_transaction"("p_order_id" "uuid", "p_target_status" "text", "p_actor_id" "uuid", "p_actor_role" "text", "p_reason" "text", "p_bank_info" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transition_order_status_transaction"("p_order_id" "uuid", "p_target_status" "text", "p_actor_id" "uuid", "p_actor_role" "text", "p_reason" "text", "p_bank_info" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."transition_order_status_transaction"("p_order_id" "uuid", "p_target_status" "text", "p_actor_id" "uuid", "p_actor_role" "text", "p_reason" "text", "p_bank_info" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."update_order_note"("p_order_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_order_note"("p_order_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_order_note"("p_order_id" "uuid", "p_note" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_order_note"("p_order_id" "uuid", "p_note" "text") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."update_store_location_and_fields"("p_owner_user_id" "uuid", "p_latitude" double precision, "p_longitude" double precision, "p_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_store_location_and_fields"("p_owner_user_id" "uuid", "p_latitude" double precision, "p_longitude" double precision, "p_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_store_location_and_fields"("p_owner_user_id" "uuid", "p_latitude" double precision, "p_longitude" double precision, "p_updates" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_store_location_and_fields"("p_owner_user_id" "uuid", "p_latitude" double precision, "p_longitude" double precision, "p_updates" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."update_store_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_store_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_store_rating"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_store_rating"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."verify_pickup_qr"("p_token" "uuid", "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_pickup_qr"("p_token" "uuid", "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_pickup_qr"("p_token" "uuid", "p_store_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."verify_pickup_qr"("p_token" "uuid", "p_store_id" "uuid") TO "supabase_auth_admin";























































































GRANT ALL ON SEQUENCE "public"."_migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."_migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."_migrations_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."_migrations_id_seq" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."_migrations" TO "anon";
GRANT ALL ON TABLE "public"."_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."_migrations" TO "service_role";
GRANT ALL ON TABLE "public"."_migrations" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."banners" TO "anon";
GRANT ALL ON TABLE "public"."banners" TO "authenticated";
GRANT ALL ON TABLE "public"."banners" TO "service_role";
GRANT ALL ON TABLE "public"."banners" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."idempotency_keys" TO "anon";
GRANT ALL ON TABLE "public"."idempotency_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."idempotency_keys" TO "service_role";
GRANT ALL ON TABLE "public"."idempotency_keys" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."issues" TO "anon";
GRANT ALL ON TABLE "public"."issues" TO "authenticated";
GRANT ALL ON TABLE "public"."issues" TO "service_role";
GRANT ALL ON TABLE "public"."issues" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";
GRANT ALL ON TABLE "public"."notifications" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";
GRANT ALL ON TABLE "public"."order_items" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";
GRANT ALL ON TABLE "public"."orders" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."refund_requests" TO "anon";
GRANT ALL ON TABLE "public"."refund_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."refund_requests" TO "service_role";
GRANT ALL ON TABLE "public"."refund_requests" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";
GRANT ALL ON TABLE "public"."reviews" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."settlements" TO "anon";
GRANT ALL ON TABLE "public"."settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."settlements" TO "service_role";
GRANT ALL ON TABLE "public"."settlements" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";
GRANT ALL ON TABLE "public"."stores" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."surprise_bags" TO "anon";
GRANT ALL ON TABLE "public"."surprise_bags" TO "authenticated";
GRANT ALL ON TABLE "public"."surprise_bags" TO "service_role";
GRANT ALL ON TABLE "public"."surprise_bags" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT ALL ON TABLE "public"."users" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";
GRANT ALL ON TABLE "public"."vouchers" TO "supabase_auth_admin";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




































-- Synthetic prerequisite owner referenced by historical data migration 0036.
INSERT INTO public.users (id, name, email, role) VALUES ('20205ac1-1255-4759-a44b-6abe4e097890', 'Historical fixture owner', 'legacy-owner@gosavingfood.test', 'merchant') ON CONFLICT (id) DO NOTHING;

-- Local compatibility for historical migration 0037 enum ILIKE expressions.
CREATE FUNCTION public.local_bag_category_ilike(public.bag_category, text)
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT
AS $$ SELECT $1::text ILIKE $2 $$;
CREATE OPERATOR public.~~* (
  LEFTARG = public.bag_category, RIGHTARG = text,
  FUNCTION = public.local_bag_category_ilike
);
