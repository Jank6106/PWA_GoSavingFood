-- ============================================================
-- 0033_fix_auto_deactivate_bag_trigger.sql
-- Khắc phục lỗi trigger auto_deactivate_bag:
-- Khi chủ quán bấm "Gỡ khỏi kệ" (is_available = false), trigger cũ có điều kiện (OR NEW.is_available = false)
-- dẫn đến việc trigger tự động ép NEW.is_available := true trở lại, làm quán không thể gỡ kệ.
-- Sửa lại: Chỉ tự động kích hoạt (is_available = true) khi kho được nạp lại từ 0 lên > 0 sau khi hết hàng (sold_out).
-- ============================================================

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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_deactivate_surprise_bag ON public.surprise_bags;
CREATE TRIGGER auto_deactivate_surprise_bag
  BEFORE UPDATE ON public.surprise_bags
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_deactivate_bag();
