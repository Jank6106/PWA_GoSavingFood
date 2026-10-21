import type { BagItem } from '../types';

export type BagTabCategory = 'on_shelf' | 'in_storage' | 'expired';

export const getVnDateString = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
};

export const getVnTimeMinutes = (): number => {
  const now = new Date();
  const timeInVn = now.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = timeInVn.split(':').map((p) => parseInt(p, 10));
  const h = parts[0] === 24 ? 0 : parts[0];
  const m = parts[1] || 0;
  return h * 60 + m;
};

export const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
  return parts[0] * 60 + parts[1];
};

/**
 * Phân loại vị trí hiển thị của túi hàng trong app Merchant:
 * 1. 'expired': Hàng hết hạn (loại có hạn sử dụng mà quá ngày)
 * 2. 'in_storage': Trong kho (chủ quán chủ động gỡ kệ, hết hàng, hoặc đã quá khung giờ kết thúc hôm nay)
 * 3. 'on_shelf': Trên kệ hàng (đang được mở bán, còn hàng, và chưa qua giờ kết thúc hôm nay)
 */
export function getBagCategory(bag: BagItem): BagTabCategory {
  const todayStr = getVnDateString();
  const nowMinutes = getVnTimeMinutes();

  // 1. Mục "Hàng hết hạn": Túi loại có hạn sử dụng và đã quá ngày HSD
  const isShelfLife = bag.bagType === 'shelf_life' || Boolean(bag.expiryDate);
  if (isShelfLife && bag.expiryDate) {
    if (bag.expiryDate < todayStr || (bag as any).status === 'expired') {
      return 'expired';
    }
  }

  const qty = bag.availableQuantity ?? bag.quantity ?? 0;

  // 2. Mục "Trong kho":
  // - Chủ quán chủ động gỡ kệ (status === 'hidden')
  // - Hoặc đã hết hàng (qty <= 0)
  if (bag.status === 'hidden' || qty <= 0) {
    return 'in_storage';
  }

  // - Đối với túi dùng trong ngày: Nếu đã qua khung giờ nhận hôm nay (nowMinutes > endM) -> Vào kho chờ ca tiếp theo
  if (!isShelfLife) {
    const endM = parseTimeToMinutes(bag.pickupTimeEnd);
    if (nowMinutes > endM) {
      return 'in_storage';
    }
  }

  // 3. Mục "Trên kệ hàng": Còn hàng (qty > 0), đang bật mở bán (status !== 'hidden'), và chưa qua giờ kết thúc hôm nay (kể cả đang trong ca hoặc sắp mở hôm nay)
  return 'on_shelf';
}
