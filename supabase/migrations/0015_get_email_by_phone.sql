-- Migration 0015: RPC hỗ trợ tra cứu email đăng nhập thông qua số điện thoại
-- Cho phép khách hàng đăng nhập linh hoạt bằng Email hoặc Số điện thoại di động đã đăng ký

CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO anon, authenticated, service_role;
