-- 0021_toggle_store_status.sql
-- Thêm hàm RPC toggle / cập nhật trạng thái mở/đóng cửa hàng (is_open) trên Supabase Database
-- Sử dụng SECURITY DEFINER để đảm bảo Merchant App cập nhật thành công lên Database
-- và kích hoạt Supabase Realtime (đã cấu hình ở 0017) đồng bộ ngay lập tức tới Customer App.

CREATE OR REPLACE FUNCTION public.toggle_store_status(
  p_store_id uuid,
  p_is_open boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Phân quyền cho anon, authenticated và service_role
GRANT EXECUTE ON FUNCTION public.toggle_store_status(uuid, boolean) TO anon, authenticated, service_role;

-- Đảm bảo Realtime trên bảng stores luôn sẵn sàng
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

ALTER TABLE public.stores REPLICA IDENTITY FULL;
