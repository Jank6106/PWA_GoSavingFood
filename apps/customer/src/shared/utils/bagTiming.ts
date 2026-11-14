import type { SurpriseBag } from '../types/customer.types';

export type BagTimingPhase = 'upcoming' | 'available' | 'order_closed' | 'sold_out' | 'expired';

export interface BagTimingInfo {
  phase: BagTimingPhase;
  canOrder: boolean;
  badgeLabel: string;
  badgeVariant: 'yellow' | 'green' | 'gray' | 'orange' | 'red';
  detailMessage: string;
}

const parseTimeToMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
};

export function getBagTimingInfo(bag?: SurpriseBag | null): BagTimingInfo {
  if (!bag) {
    return {
      phase: 'order_closed',
      canOrder: false,
      badgeLabel: 'Không khả dụng',
      badgeVariant: 'gray',
      detailMessage: 'Túi hàng không tồn tại hoặc đã bị gỡ.',
    };
  }

  // 1. Kiểm tra hết hàng
  if (bag.quantity <= 0) {
    return {
      phase: 'sold_out',
      canOrder: false,
      badgeLabel: 'Hết hàng',
      badgeVariant: 'gray',
      detailMessage: 'Túi hàng đã hết suất cho hôm nay.',
    };
  }

  // 2. Loại 2: Mặt hàng có hạn sử dụng (shelf_life)
  const isShelfLife = bag.bagType === 'shelf_life' || Boolean(bag.expiryDate);
  if (isShelfLife && bag.expiryDate) {
    const [y, m, d] = bag.expiryDate.split('-').map(Number);
    // Hạn sử dụng tính hết 23:59:59 của ngày HSD
    const endOfDay = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999).getTime();
    if (Date.now() > endOfDay) {
      return {
        phase: 'expired',
        canOrder: false,
        badgeLabel: 'Đã hết hạn',
        badgeVariant: 'red',
        detailMessage: 'Sản phẩm đã quá hạn sử dụng.',
      };
    }

    const formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
    return {
      phase: 'available',
      canOrder: true,
      badgeLabel: `HSD: ${formattedDate}`,
      badgeVariant: 'green',
      detailMessage: `Nhận hàng: ${bag.pickupStart || '08:00'}–${bag.pickupEnd || '21:00'} hàng ngày (HSD: ${formattedDate}/${y})`,
    };
  }

  // 3. Loại 1: Mặt hàng dùng trong ngày (daily)
  // Lấy giờ hiện tại theo giờ chuẩn Việt Nam (UTC+7)
  const now = new Date();
  const timeInVn = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const currentMinutes = parseTimeToMinutes(timeInVn) ?? (now.getHours() * 60 + now.getMinutes());

  const startMinutes = parseTimeToMinutes(bag.pickupStart) ?? (18 * 60);
  const endMinutes = parseTimeToMinutes(bag.pickupEnd) ?? (20 * 60);

  // GIAI ĐOẠN 1: Trước giờ mở bán
  if (currentMinutes < startMinutes) {
    return {
      phase: 'upcoming',
      canOrder: false,
      badgeLabel: `Mở bán ${bag.pickupStart || '18:00'}`,
      badgeVariant: 'yellow',
      detailMessage: `Quán sẽ mở bán túi này lúc ${bag.pickupStart || '18:00'} hôm nay. Bạn quay lại sau nhé!`,
    };
  }

  // GIAI ĐOẠN 2: Trong khung giờ mở bán
  if (currentMinutes <= endMinutes) {
    return {
      phase: 'available',
      canOrder: true,
      badgeLabel: `Đang bán (${bag.pickupStart}–${bag.pickupEnd})`,
      badgeVariant: 'green',
      detailMessage: `Khung giờ nhận túi hôm nay: ${bag.pickupStart}–${bag.pickupEnd}`,
    };
  }

  // SAU KHUNG GIỜ: Đã hết giờ nhận đơn
  return {
    phase: 'order_closed',
    canOrder: false,
    badgeLabel: 'Hết giờ đặt',
    badgeVariant: 'orange',
    detailMessage: 'Đã kết thúc thời gian nhận đơn hôm nay. Quán hiện chỉ mở để giao túi cho các đơn đã đặt trước.',
  };
}

/**
 * Kiểm tra xem túi hàng có đủ điều kiện để hiển thị trên sàn Customer hay không.
 * Quy tắc: Trên sàn CHỈ hiển thị những mặt hàng:
 * 1. Sắp mở bán trong hôm nay (phase === 'upcoming')
 * 2. Đang trong thời gian mở bán (phase === 'available')
 * Toàn bộ các mặt hàng đã hết hạn (expired) hoặc đã quá giờ nhận hôm nay (order_closed) hoặc hết hàng (sold_out)
 * sẽ được gỡ bỏ hoàn toàn khỏi sàn.
 */
export function isBagVisibleOnMarket(bag?: SurpriseBag | null): boolean {
  if (!bag) return false;
  if (!bag.isAvailable || (bag.quantity ?? 0) <= 0) return false;
  if (bag.status === 'archived' || bag.status === 'expired') return false;

  const timing = getBagTimingInfo(bag);
  return timing.phase === 'upcoming' || timing.phase === 'available';
}
