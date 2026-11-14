import { describe, expect, it } from 'vitest';
import {
  calculateDiscountPercent,
  canOrderBag,
  filterAndRankTodayDeals,
  formatMerchantDistance,
  getNowVietnam,
  isListingExpired,
  isPickupPastToday,
  isShelfLifeExpired,
  isValidBagPrice,
  isValidCoordinates,
  type VietnamTime,
} from '../apps/customer/src/shared/utils/customerDeals';
import type { Merchant, SurpriseBag } from '../apps/customer/src/shared/types/customer.types';

describe('today-deals.utils', () => {
  describe('formatMerchantDistance', () => {
    it('định dạng đúng mét cho khoảng cách nhỏ (34m phải là "34 m", không thành 34km)', () => {
      const merchant: Merchant = {
        id: 'm1',
        name: 'Quán Bánh Mì',
        description: '',
        phone: '0901234567',
        address: 'Hà Nội',
        logo: '',
        banner: '',
        rating: 4.8,
        totalRatings: 10,
        distance: 34,
        status: 'active',
        isOpen: true,
        openingHours: '08:00 - 22:00',
        latitude: 21.0285,
        longitude: 105.8542,
      };

      expect(formatMerchantDistance(merchant)).toBe('34 m');
    });

    it('định dạng đúng mét cho 500m và km cho >= 1000m', () => {
      const base: Merchant = {
        id: 'm2',
        name: 'Quán Cà Phê',
        description: '',
        phone: '0901234567',
        address: 'Hà Nội',
        logo: '',
        banner: '',
        rating: 4.8,
        totalRatings: 10,
        distance: 500,
        status: 'active',
        isOpen: true,
        openingHours: '08:00 - 22:00',
        latitude: 21.0285,
        longitude: 105.8542,
      };

      expect(formatMerchantDistance(base)).toBe('500 m');

      const farMerchant = { ...base, distance: 1540 };
      expect(formatMerchantDistance(farMerchant)).toBe('1.5 km');
    });

    it('không hiển thị khoảng cách nếu thiếu toạ độ hợp lệ (chặn fallback 500 giả)', () => {
      const missingCoords: Merchant = {
        id: 'm3',
        name: 'Quán Ẩn',
        description: '',
        phone: '0901234567',
        address: 'Hà Nội',
        logo: '',
        banner: '',
        rating: 4.5,
        totalRatings: 5,
        distance: 500,
        status: 'active',
        isOpen: true,
        openingHours: '08:00 - 22:00',
        latitude: undefined,
        longitude: undefined,
      };

      expect(formatMerchantDistance(missingCoords)).toBe('');
      expect(formatMerchantDistance({ ...missingCoords, latitude: 0, longitude: 0 })).toBe('');
      expect(formatMerchantDistance({ ...missingCoords, latitude: NaN, longitude: 105.8 })).toBe('');
      expect(formatMerchantDistance({ ...missingCoords, latitude: 95, longitude: 105.8 })).toBe('');
    });
  });

  describe('isValidBagPrice & calculateDiscountPercent', () => {
    it('chặn giá âm, NaN, Infinity và giá bán lớn hơn giá gốc', () => {
      const baseBag: SurpriseBag = {
        id: 'b1',
        merchantId: 'm1',
        merchantName: 'Quán A',
        name: 'Túi giải cứu',
        description: '',
        originalPrice: 100000,
        discountPrice: 40000,
        category: 'bakery',
        imageUrl: '',
        quantity: 5,
        maxQuantity: 10,
        pickupStart: '18:00',
        pickupEnd: '20:00',
        isAvailable: true,
        rating: 5,
      };

      expect(isValidBagPrice(baseBag)).toBe(true);
      expect(isValidBagPrice({ ...baseBag, originalPrice: -1000 })).toBe(false);
      expect(isValidBagPrice({ ...baseBag, discountPrice: NaN })).toBe(false);
      expect(isValidBagPrice({ ...baseBag, originalPrice: Infinity })).toBe(false);
      expect(isValidBagPrice({ ...baseBag, originalPrice: 50000, discountPrice: 70000 })).toBe(false);
    });

    it('tính phần trăm giảm giá chính xác: 0đ => 100% không clamp 99', () => {
      // 0đ => 100%
      expect(calculateDiscountPercent(100000, 0)).toBe(100);

      // Giảm 50%
      expect(calculateDiscountPercent(100000, 50000)).toBe(50);

      // Bằng giá gốc (không giảm) => null
      expect(calculateDiscountPercent(50000, 50000)).toBe(null);

      // Giá không hợp lệ => null
      expect(calculateDiscountPercent(-10000, 5000)).toBe(null);
      expect(calculateDiscountPercent(NaN, 5000)).toBe(null);
      expect(calculateDiscountPercent(100000, Infinity)).toBe(null);
    });
  });

  describe('Kiểm tra giờ nhận và HSD theo múi giờ Việt Nam', () => {
    const fixedNowVn: VietnamTime = {
      year: 2026,
      month: 11,
      day: 13,
      hours: 19,
      minutes: 30,
      seconds: 0,
      totalMinutes: 19 * 60 + 30, // 1170 phút
    };

    it('xác định chính xác giờ nhận hôm nay đã hết hay chưa', () => {
      // Giờ kết thúc 19:00 < 19:30 => đã hết giờ nhận
      expect(isPickupPastToday('19:00', fixedNowVn)).toBe(true);

      // Giờ kết thúc 20:30 > 19:30 => còn giờ nhận
      expect(isPickupPastToday('20:30', fixedNowVn)).toBe(false);

      // Định dạng sai => coi như hết giờ nhận (fail-safe)
      expect(isPickupPastToday('25:00', fixedNowVn)).toBe(true);
      expect(isPickupPastToday('abc', fixedNowVn)).toBe(true);
    });

    it('xác định chính xác HSD theo ngày thực tế ở Việt Nam', () => {
      // Ngày trước 13/11/2026 => hết hạn
      expect(isShelfLifeExpired('2026-11-12', fixedNowVn)).toBe(true);

      // Ngày hôm nay 13/11/2026 => chưa hết hạn trong ngày
      expect(isShelfLifeExpired('2026-11-13', fixedNowVn)).toBe(false);

      // Ngày tương lai => còn hạn
      expect(isShelfLifeExpired('2026-11-14', fixedNowVn)).toBe(false);
      expect(isShelfLifeExpired('2027-01-01', fixedNowVn)).toBe(false);

      // Ngày không hợp lệ
      expect(isShelfLifeExpired('2026-02-30', fixedNowVn)).toBe(true);
      expect(isShelfLifeExpired('invalid-date', fixedNowVn)).toBe(true);
    });

    it('guard expiresAt listing expire mà không suy đoán HSD từ expiresAt', () => {
      const nowMs = 1794570000000;
      expect(isListingExpired(new Date(nowMs - 10000).toISOString(), nowMs)).toBe(true);
      expect(isListingExpired(new Date(nowMs + 10000).toISOString(), nowMs)).toBe(false);
    });
  });

  describe('canOrderBag', () => {
    const fixedNowVn: VietnamTime = {
      year: 2026,
      month: 11,
      day: 13,
      hours: 18,
      minutes: 30,
      seconds: 0,
      totalMinutes: 18 * 60 + 30,
    };

    const validBag: SurpriseBag = {
      id: 'b1',
      merchantId: 'm1',
      merchantName: 'Tiệm Bánh A',
      name: 'Túi Bánh Ngọt',
      description: '',
      originalPrice: 80000,
      discountPrice: 35000,
      category: 'bakery',
      imageUrl: '',
      quantity: 3,
      maxQuantity: 10,
      pickupStart: '18:00',
      pickupEnd: '20:00',
      isAvailable: true,
      rating: 5,
    };

    it('cho phép đặt khi đầy đủ điều kiện hợp lệ', () => {
      expect(canOrderBag(validBag, true, fixedNowVn)).toBe(true);
    });

    it('chặn đặt hàng khi hàng shelf-life đã quá khung giờ nhận hôm nay', () => {
      const shelfBag: SurpriseBag = {
        ...validBag,
        bagType: 'shelf_life',
        expiryDate: '2026-11-20',
        pickupEnd: '18:00', // Đã qua lúc 18:30
      };

      // Dù HSD còn đến 20/11 nhưng hôm nay đã quá giờ nhận lúc 18:00 => chặn đặt
      expect(canOrderBag(shelfBag, true, fixedNowVn)).toBe(false);
    });

    it('chặn đặt hàng khi giá không hợp lệ, hết hàng hoặc trạng thái expired', () => {
      expect(canOrderBag({ ...validBag, discountPrice: NaN }, true, fixedNowVn)).toBe(false);
      expect(canOrderBag({ ...validBag, quantity: 0 }, true, fixedNowVn)).toBe(false);
      expect(canOrderBag({ ...validBag, status: 'expired' }, true, fixedNowVn)).toBe(false);
      expect(canOrderBag({ ...validBag, status: 'archived' }, true, fixedNowVn)).toBe(false);
    });
  });

  describe('filterAndRankTodayDeals', () => {
    const fixedNowVn: VietnamTime = {
      year: 2026,
      month: 11,
      day: 13,
      hours: 18,
      minutes: 15,
      seconds: 0,
      totalMinutes: 18 * 60 + 15,
    };

    const merchants: Merchant[] = [
      {
        id: 'm1',
        name: 'Quán Mở',
        description: '',
        phone: '0901',
        address: 'Hà Nội',
        logo: '',
        banner: '',
        rating: 4.9,
        totalRatings: 10,
        distance: 250,
        status: 'active',
        isOpen: true,
        openingHours: '08:00 - 22:00',
        latitude: 21.02,
        longitude: 105.85,
      },
      {
        id: 'm_closed',
        name: 'Quán Đóng',
        description: '',
        phone: '0902',
        address: 'Hà Nội',
        logo: '',
        banner: '',
        rating: 4.5,
        totalRatings: 5,
        distance: 100,
        status: 'active',
        isOpen: false, // Cửa hàng đang đóng
        openingHours: '08:00 - 22:00',
        latitude: 21.02,
        longitude: 105.85,
      },
    ];

    it('chỉ chọn túi từ cửa hàng active/open, chưa hết giờ nhận và sắp xếp theo mức tiết kiệm', () => {
      const bags: SurpriseBag[] = [
        {
          id: 'bag_closed_merchant',
          merchantId: 'm_closed',
          merchantName: 'Quán Đóng',
          name: 'Túi 1',
          description: '',
          originalPrice: 100000,
          discountPrice: 20000, // Tiết kiệm 80k
          category: 'bakery',
          imageUrl: '',
          quantity: 2,
          maxQuantity: 5,
          pickupStart: '08:00',
          pickupEnd: '23:59',
          isAvailable: true,
          rating: 5,
        },
        {
          id: 'bag_deal_small',
          merchantId: 'm1',
          merchantName: 'Quán Mở',
          name: 'Túi nhỏ',
          description: '',
          originalPrice: 60000,
          discountPrice: 30000, // Tiết kiệm 30k
          category: 'bakery',
          imageUrl: '',
          quantity: 2,
          maxQuantity: 5,
          pickupStart: '08:00',
          pickupEnd: '23:59',
          isAvailable: true,
          rating: 5,
        },
        {
          id: 'bag_deal_big',
          merchantId: 'm1',
          merchantName: 'Quán Mở',
          name: 'Túi to',
          description: '',
          originalPrice: 120000,
          discountPrice: 40000, // Tiết kiệm 80k
          category: 'bakery',
          imageUrl: '',
          quantity: 2,
          maxQuantity: 5,
          pickupStart: '08:00',
          pickupEnd: '23:59',
          isAvailable: true,
          rating: 5,
        },
        {
          id: 'bag_past_pickup',
          merchantId: 'm1',
          merchantName: 'Quán Mở',
          name: 'Túi hết giờ nhận',
          description: '',
          originalPrice: 100000,
          discountPrice: 30000,
          category: 'bakery',
          imageUrl: '',
          quantity: 2,
          maxQuantity: 5,
          pickupStart: '08:00',
          pickupEnd: '17:00', // Đã hết giờ lúc 18:15 (và cũng đã hết so với hiện tại)
          isAvailable: true,
          rating: 5,
        },
      ];

      const result = filterAndRankTodayDeals(bags, merchants, fixedNowVn);

      // Loại bỏ bag_closed_merchant và bag_past_pickup
      expect(result.map((b) => b.id)).toEqual(['bag_deal_big', 'bag_deal_small']);
    });
  });
});
