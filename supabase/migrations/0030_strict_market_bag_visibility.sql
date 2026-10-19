-- ============================================================
-- GSF Platform - Strict Market Bag Visibility Migration (0030)
-- Đảm bảo chỉ hiển thị túi hàng đang hoặc sắp mở bán trên sàn Customer:
-- 1. Loại 1 (Dùng trong ngày): pickup_end phải >= v_now_time (chưa qua giờ chốt hôm nay, áp dụng cả recurring và today_only)
-- 2. Loại 2 (Có HSD): expiry_date phải >= v_today (chưa hết hạn)
-- 3. Chỉ lấy các túi còn tồn kho (quantity > 0) và chưa bị gỡ/archived
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_bags_nearby(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius INTEGER DEFAULT 10000,
  p_category TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  store_id UUID,
  name TEXT,
  description TEXT,
  original_price INTEGER,
  discount_price INTEGER,
  category bag_category,
  image_url TEXT,
  quantity INTEGER,
  max_quantity INTEGER,
  pickup_start TIME WITHOUT TIME ZONE,
  pickup_end TIME WITHOUT TIME ZONE,
  is_daily BOOLEAN,
  is_available BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  store_name TEXT,
  store_logo_url TEXT,
  store_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_m DOUBLE PRECISION,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.list_bags_nearby(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT, INTEGER, INTEGER) TO authenticated, service_role, anon;
