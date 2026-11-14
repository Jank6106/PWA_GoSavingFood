import { getVnTimeMinutes, parseTimeToMinutes } from './bagTiming';

/**
 * Gợi ý % giảm giá theo thời gian còn lại đến giờ đóng cửa (quy tắc cố định, không dùng AI
 * để kết quả ổn định, giải thích được và không "bịa" giá):
 *  - Còn < 1 tiếng (hoặc đã qua giờ đóng cửa): giảm 70%
 *  - Còn 1–3 tiếng: giảm 50%
 *  - Còn > 3 tiếng: giảm 30%
 */
export interface DiscountSuggestion {
  percent: number;
  minutesLeft: number;
  reason: string;
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} tiếng ${m} phút` : `${h} tiếng`;
};

const toClosingMinutes = (closingTime?: string): number => {
  const parsed = parseTimeToMinutes(closingTime || '22:00');
  // "00:00" nghĩa là đóng cửa lúc nửa đêm
  return parsed === 0 ? 24 * 60 : parsed;
};

export function suggestDiscount(closingTime?: string, nowMinutes: number = getVnTimeMinutes()): DiscountSuggestion {
  const minutesLeft = Math.max(0, toClosingMinutes(closingTime) - nowMinutes);

  if (minutesLeft < 60) {
    return {
      percent: 70,
      minutesLeft,
      reason:
        minutesLeft === 0
          ? 'Đã tới giờ đóng cửa, giảm sâu 70% để bán hết ngay thay vì bỏ đi.'
          : `Chỉ còn ${formatDuration(minutesLeft)} là đóng cửa, giảm 70% để bán hết nhanh nhất.`,
    };
  }
  if (minutesLeft <= 180) {
    return {
      percent: 50,
      minutesLeft,
      reason: `Còn ${formatDuration(minutesLeft)} đến giờ đóng cửa, giảm 50% để hút khách tan làm.`,
    };
  }
  return {
    percent: 30,
    minutesLeft,
    reason: `Còn ${formatDuration(minutesLeft)} mới đóng cửa, giảm nhẹ 30% để giữ biên lợi nhuận.`,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const minutesToTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Khung giờ nhận hàng mặc định cho túi "dùng trong ngày": từ bây giờ (làm tròn 5 phút) đến giờ đóng cửa. */
export function suggestPickupWindow(
  closingTime?: string,
  nowMinutes: number = getVnTimeMinutes()
): { start: string; end: string } {
  const lastMinute = 23 * 60 + 59;
  const start = Math.ceil(nowMinutes / 5) * 5;
  const end = Math.min(toClosingMinutes(closingTime), lastMinute);
  if (start >= end) {
    throw new Error('Không còn khung giờ nhận hàng trước giờ đóng cửa hôm nay. Vui lòng nhập tay khung giờ phù hợp.');
  }
  return { start: minutesToTime(start), end: minutesToTime(end) };
}

/** Giá giải cứu làm tròn nghìn, luôn >= 1.000đ và nhỏ hơn giá gốc. */
export function computeSalePrice(originalPrice: number, percent: number): number {
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) return 0;
  const raw = Math.round((originalPrice * (1 - percent / 100)) / 1000) * 1000;
  return Math.min(Math.max(raw, 1000), Math.max(originalPrice - 1000, 1000));
}
