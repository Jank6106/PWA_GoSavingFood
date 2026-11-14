import type { Merchant, SurpriseBag } from '../types/customer.types';
import { getBagTimingInfo, isBagVisibleOnMarket } from './bagTiming';

export interface VietnamTime {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number;
}

/**
 * Lấy thời gian hiện tại theo múi giờ chuẩn Việt Nam (Asia/Ho_Chi_Minh, UTC+7).
 * Có thể truyền `referenceDate` để phục vụ deterministic testing.
 */
export function getNowVietnam(referenceDate: Date = new Date()): VietnamTime {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceDate);
  let year = 2026;
  let month = 11;
  let day = 13;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'hour') hours = parseInt(p.value, 10);
    if (p.type === 'minute') minutes = parseInt(p.value, 10);
    if (p.type === 'second') seconds = parseInt(p.value, 10);
  }

  if (hours === 24) hours = 0;

  return {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    totalMinutes: hours * 60 + minutes,
  };
}

/**
 * Kiểm tra toạ độ địa lý hợp lệ.
 * Chặn NaN, Infinity, toạ độ ngoài phạm vi [-90, 90] / [-180, 180] và toạ độ rỗng [0, 0].
 */
export function isValidCoordinates(lat?: number | null, lng?: number | null): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Định dạng khoảng cách cửa hàng theo mét chính xác.
 * customer.service getHome luôn trả distance tính theo mét (ví dụ 34 mét).
 * Tuyệt đối không dùng heuristic distance < 50 => * 1000 khiến 34 mét thành 34 km.
 * Nếu merchant thiếu toạ độ hợp lệ thì KHÔNG hiển thị khoảng cách vì dữ liệu cũ chứa fallback 500 giả.
 */
export function formatMerchantDistance(merchant?: Merchant | null): string {
  if (!merchant) return '';

  // Kiểm tra toạ độ thật: nếu thiếu hoặc không hợp lệ thì không hiện khoảng cách giả
  if (!isValidCoordinates(merchant.latitude, merchant.longitude)) {
    return '';
  }

  const { distance } = merchant;
  if (typeof distance !== 'number' || !Number.isFinite(distance) || distance < 0) {
    return '';
  }

  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }
  return `${(distance / 1000).toFixed(1)} km`;
}

/**
 * Kiểm tra giá bán và giá gốc hợp lệ.
 * Chặn giá âm, NaN, Infinity và trường hợp giá bán cao hơn giá gốc.
 */
export function isValidBagPrice(bag?: SurpriseBag | null): boolean {
  if (!bag) return false;
  const { originalPrice, discountPrice } = bag;

  if (typeof originalPrice !== 'number' || !Number.isFinite(originalPrice) || originalPrice < 0) {
    return false;
  }
  if (typeof discountPrice !== 'number' || !Number.isFinite(discountPrice) || discountPrice < 0) {
    return false;
  }
  if (discountPrice > originalPrice) {
    return false;
  }

  return true;
}

/**
 * Tính phần trăm giảm giá:
 * - 0đ => 100% (không clamp 99).
 * - Nếu discountPrice === originalPrice: hợp lệ nhưng không có giảm giá (trả về null).
 * - Nếu không hợp lệ: trả về null.
 */
export function calculateDiscountPercent(
  originalPrice?: number | null,
  discountPrice?: number | null
): number | null {
  if (
    typeof originalPrice !== 'number' ||
    typeof discountPrice !== 'number' ||
    !Number.isFinite(originalPrice) ||
    !Number.isFinite(discountPrice) ||
    originalPrice <= 0 ||
    discountPrice < 0 ||
    discountPrice >= originalPrice
  ) {
    return null;
  }

  if (discountPrice === 0) {
    return 100;
  }

  const rawPercent = Math.round((1 - discountPrice / originalPrice) * 100);
  return Math.min(100, Math.max(1, rawPercent));
}

/**
 * Kiểm tra định dạng giờ HH:mm và phạm vi hợp lệ.
 */
export function parseTimeString(timeStr?: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr.trim());
  if (!match) return null;
  return {
    hours: parseInt(match[1], 10),
    minutes: parseInt(match[2], 10),
  };
}

/**
 * Kiểm tra xem giờ nhận hàng hôm nay đã kết thúc hay chưa theo múi giờ Việt Nam.
 */
export function isPickupPastToday(
  pickupEnd?: string,
  nowVn: VietnamTime = getNowVietnam()
): boolean {
  const parsed = parseTimeString(pickupEnd);
  if (!parsed) return true; // Định dạng giờ không hợp lệ => không an toàn để cho phép

  const endTotalMinutes = parsed.hours * 60 + parsed.minutes;
  return nowVn.totalMinutes > endTotalMinutes;
}

/**
 * Kiểm tra hạn sử dụng (HSD) theo múi giờ chuẩn Việt Nam.
 * Định dạng: YYYY-MM-DD.
 * Phải validate ngày tháng thực tế (năm nhuận, số ngày trong tháng).
 */
export function isShelfLifeExpired(
  expiryDate?: string,
  nowVn: VietnamTime = getNowVietnam()
): boolean {
  if (!expiryDate) return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDate.trim());
  if (!match) return true; // Sai định dạng ngày => coi như không hợp lệ

  const expYear = parseInt(match[1], 10);
  const expMonth = parseInt(match[2], 10);
  const expDay = parseInt(match[3], 10);

  if (expMonth < 1 || expMonth > 12) return true;

  const daysInMonth = new Date(expYear, expMonth, 0).getDate();
  if (expDay < 1 || expDay > daysInMonth) return true;

  if (expYear < nowVn.year) return true;
  if (expYear > nowVn.year) return false;

  if (expMonth < nowVn.month) return true;
  if (expMonth > nowVn.month) return false;

  return expDay < nowVn.day;
}

/**
 * Kiểm tra xem bài đăng túi đã hết hạn listing (expiresAt) hay chưa.
 * Không suy đoán HSD từ expiresAt.
 */
export function isListingExpired(expiresAt?: string, nowMs: number = Date.now()): boolean {
  if (!expiresAt) return false;
  const parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed)) return false;
  return nowMs > parsed;
}

/**
 * Xác định túi có thể đặt ngay bây giờ hay không (canOrderNow).
 * Chặn giá âm/NaN/Infinity, status expired/archived, listing hết hạn,
 * và cả trường hợp shelf-life đã quá khung giờ nhận hôm nay.
 */
export function canOrderBag(
  bag: SurpriseBag,
  timingCanOrder: boolean,
  nowVn: VietnamTime = getNowVietnam()
): boolean {
  // 1. Kiểm tra giá bán
  if (!isValidBagPrice(bag)) return false;

  // 2. Kiểm tra tồn kho và trạng thái mở bán
  if (!bag.isAvailable || (bag.quantity ?? 0) <= 0) return false;
  if (bag.status === 'archived' || bag.status === 'expired' || bag.status === 'sold_out') {
    return false;
  }

  // 3. Kiểm tra listing expiration
  if (isListingExpired(bag.expiresAt)) return false;

  // 4. Khung giờ nhận hàng hôm nay: CẢ daily VÀ shelf-life đều không thể đặt nếu hôm nay đã quá giờ nhận
  if (isPickupPastToday(bag.pickupEnd, nowVn)) {
    return false;
  }

  // 5. Kiểm tra hạn sử dụng nếu là hàng shelf_life
  if (bag.bagType === 'shelf_life' || bag.expiryDate) {
    if (isShelfLifeExpired(bag.expiryDate, nowVn)) {
      return false;
    }
  }

  // 6. Helper bagTiming canOrder
  return Boolean(timingCanOrder);
}

/**
 * Lọc và xếp hạng ưu đãi hời nhất hôm nay:
 * - Giá hợp lệ, có tiết kiệm thực tế (discountPrice < originalPrice).
 * - Cửa hàng active và open.
 * - Túi hiển thị được trên thị trường.
 * - Chưa qua giờ nhận hôm nay, shelf-life chưa hết hạn, listing chưa hết hạn.
 * - Sắp xếp giảm dần theo số tiền tiết kiệm, sau đó theo % giảm.
 * - Tối đa 6 món.
 */
export function filterAndRankTodayDeals(
  bags: SurpriseBag[],
  merchants: Merchant[],
  nowVn: VietnamTime = getNowVietnam()
): SurpriseBag[] {
  const merchantsMap = new Map<string, Merchant>();
  for (const m of merchants) {
    merchantsMap.set(m.id, m);
  }

  return bags
    .filter((bag) => {
      // 1. Phải hiển thị được trên thị trường và còn hàng
      if (!isBagVisibleOnMarket(bag)) return false;
      if (!bag.isAvailable || (bag.quantity ?? 0) <= 0) return false;
      if (bag.status === 'archived' || bag.status === 'expired' || bag.status === 'sold_out') {
        return false;
      }

      // 2. Giá phải hợp lệ và có giảm giá thực tế (discountPrice < originalPrice)
      if (!isValidBagPrice(bag)) return false;
      if (bag.discountPrice >= bag.originalPrice || bag.originalPrice <= 0) return false;

      // 3. Cửa hàng phải active và open
      const merchant = merchantsMap.get(bag.merchantId);
      if (!merchant || merchant.status !== 'active' || !merchant.isOpen) {
        return false;
      }

      // 4. Khung giờ nhận hôm nay chưa kết thúc
      if (isPickupPastToday(bag.pickupEnd, nowVn)) {
        return false;
      }

      // 5. Hạn sử dụng (HSD) nếu có phải còn hạn theo giờ VN
      if (bag.bagType === 'shelf_life' || bag.expiryDate) {
        if (isShelfLifeExpired(bag.expiryDate, nowVn)) {
          return false;
        }
      }

      // 6. Listing expiresAt
      if (isListingExpired(bag.expiresAt)) {
        return false;
      }

      // 7. Trạng thái timing
      const timing = getBagTimingInfo(bag);
      if (timing.phase !== 'available' && timing.phase !== 'upcoming') {
        return false;
      }

      return true;
    })
    .map((bag) => {
      const savings = bag.originalPrice - bag.discountPrice;
      const savingsRate = bag.originalPrice > 0 ? savings / bag.originalPrice : 0;
      return { bag, savings, savingsRate };
    })
    .sort((a, b) => {
      if (b.savings !== a.savings) {
        return b.savings - a.savings;
      }
      return b.savingsRate - a.savingsRate;
    })
    .slice(0, 6)
    .map((item) => item.bag);
}
