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
 * 2. 'on_shelf': Trên kệ hàng (đang được mở bán, còn hàng, trong khung giờ)
 * 3. 'in_storage': Trong kho (chưa mở bán, ngoài khung giờ, hết hàng, hoặc chủ quán gỡ kệ)
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

  // 2. Mục "Trên kệ hàng": Đang được mở bán
  const qty = bag.availableQuantity ?? bag.quantity ?? 0;
  const isAvailable = bag.status !== 'hidden' && qty > 0;

  if (isAvailable) {
    // Hàng có HSD: Chưa hết hạn và đang mở bán -> Trên kệ hàng
    if (isShelfLife) {
      return 'on_shelf';
    }

    // Hàng dùng trong ngày: Bắt buộc phải đang nằm trong khung giờ mở bán
    const startM = parseTimeToMinutes(bag.pickupTimeStart);
    const endM = parseTimeToMinutes(bag.pickupTimeEnd);

    if (nowMinutes >= startM && nowMinutes <= endM) {
      return 'on_shelf';
    }
  }

  // 3. Mục "Trong kho": Chưa đến giờ, đã qua giờ hôm nay, hết hàng, hoặc chủ quán gỡ khỏi kệ
  return 'in_storage';
}
