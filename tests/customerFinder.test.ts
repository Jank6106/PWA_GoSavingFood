import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Merchant, SurpriseBag } from '../apps/customer/src/shared/types/customer.types';
import {
  filterCustomerCatalog,
  parseFinderQuery,
  validateServerConstraints,
  getVietnamTime,
  searchCustomerCatalog,
} from '../apps/customer/src/services/customer-finder.service';

// Mock Supabase service hoàn toàn để không gọi network thật và không log cảnh báo env
vi.mock('../apps/customer/src/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-test-token' } },
        error: null,
      }),
    },
  },
}));

describe('Customer Finder — Logic & Contract Tests', () => {
  // Mock dữ liệu chuẩn
  const mockMerchantActive: Merchant = {
    id: 'store-dich-vong',
    name: 'Tiệm Bánh Dịch Vọng',
    description: 'Bánh tươi mỗi ngày',
    phone: '0987654321',
    address: 'Số 15 Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    logo: 'https://example.com/logo.webp',
    banner: 'https://example.com/banner.webp',
    rating: 4.8,
    totalRatings: 120,
    distance: 0,
    status: 'active',
    isOpen: true,
    openingHours: '08:00 - 22:00',
    latitude: 21.0333,
    longitude: 105.7895,
  };

  const mockMerchantClosed: Merchant = {
    ...mockMerchantActive,
    id: 'store-closed',
    name: 'Quán Cơm Đã Đóng Cửa',
    isOpen: false,
  };

  const mockMerchantInactive: Merchant = {
    ...mockMerchantActive,
    id: 'store-inactive',
    name: 'Quán Tạm Dừng Hoạt Động',
    status: 'inactive',
  };

  const mockBagBakery: SurpriseBag = {
    id: 'bag-bakery-1',
    merchantId: 'store-dich-vong',
    merchantName: 'Tiệm Bánh Dịch Vọng',
    name: 'Túi Bất Ngờ Bánh Mì & Bánh Ngọt',
    description: 'Gồm bánh sừng bò, bánh mì hoa cúc',
    originalPrice: 70000,
    discountPrice: 35000,
    category: 'bakery',
    imageUrl: 'https://example.com/bag-bakery.webp',
    quantity: 5,
    maxQuantity: 10,
    pickupStart: '18:00',
    pickupEnd: '21:00',
    bagType: 'daily',
    isAvailable: true,
    rating: 4.8,
  };

  const mockBagMeat: SurpriseBag = {
    id: 'bag-meat-1',
    merchantId: 'store-dich-vong',
    merchantName: 'Tiệm Bánh Dịch Vọng',
    name: 'Túi Món Mặn Cơm Tấm',
    description: 'Cơm tấm sườn nướng kèm canh',
    originalPrice: 80000,
    discountPrice: 40000,
    category: 'meat',
    imageUrl: 'https://example.com/bag-meat.webp',
    quantity: 2,
    maxQuantity: 5,
    pickupStart: '17:30',
    pickupEnd: '20:00',
    bagType: 'daily',
    isAvailable: true,
    rating: 4.5,
  };

  // Giờ chuẩn để test: 2026-11-13 18:30:00 tại Việt Nam (UTC+7) -> 11:30:00 UTC
  const testNow1830 = new Date('2026-11-13T11:30:00Z');

  describe('1. Parsing câu truy vấn tiếng Việt & Chuẩn hoá (Natural Language Parsing)', () => {
    it('nhận diện đúng danh mục món mặn và ngân sách 35k', () => {
      const { constraints } = parseFinderQuery('món mặn dưới 35k');
      expect(constraints.category).toBe('meat');
      expect(constraints.maxBudget).toBe(35000);
      expect(constraints.people).toBe(1);
    });

    it('nhận diện đúng số người và ngân sách nhóm (2 người 100k)', () => {
      const { constraints } = parseFinderQuery('2 người 100k');
      expect(constraints.people).toBe(2);
      expect(constraints.maxBudget).toBe(100000);
    });

    it('nhận diện đúng bánh và ngân sách có dấu chấm tiền tệ (bánh dưới 50.000đ)', () => {
      const { constraints } = parseFinderQuery('bánh dưới 50.000đ');
      expect(constraints.category).toBe('bakery');
      expect(constraints.maxBudget).toBe(50000);
    });

    it('nhận diện đúng khu vực theo cụm từ quanh...', () => {
      const { constraints } = parseFinderQuery('quanh Dịch Vọng');
      expect(constraints.area).toBe('Dịch Vọng');
    });

    it('nhận diện đúng giờ nhận trước (nhận trước 20:30)', () => {
      const { constraints } = parseFinderQuery('nhận trước 20:30');
      expect(constraints.pickupBefore).toBe('20:30');
    });

    it('chuẩn hoá các biến thể định dạng tiền tệ: 100 nghìn, 100 ngàn, 100.000 vnd', () => {
      expect(parseFinderQuery('tầm 100 nghìn').constraints.maxBudget).toBe(100000);
      expect(parseFinderQuery('khoảng 100 ngàn').constraints.maxBudget).toBe(100000);
      expect(parseFinderQuery('dưới 100.000 vnd').constraints.maxBudget).toBe(100000);
    });

    it('xử lý chính xác số thập phân tiếng Việt (1,5 triệu -> 1500000)', () => {
      expect(parseFinderQuery('dưới 1,5 triệu').constraints.maxBudget).toBe(1500000);
      expect(parseFinderQuery('khoảng 1.5 triệu').constraints.maxBudget).toBe(1500000);
    });

    it('ưu tiên danh mục chay trước các từ món chung (bún chay -> vegetarian)', () => {
      expect(parseFinderQuery('bún chay dưới 50k').constraints.category).toBe('vegetarian');
      expect(parseFinderQuery('cơm chay 35k').constraints.category).toBe('vegetarian');
    });

    it('hỗ trợ không dấu tiếng Việt tự nhiên', () => {
      const { constraints } = parseFinderQuery('banh duoi 50k quanh dich vong');
      expect(constraints.category).toBe('bakery');
      expect(constraints.maxBudget).toBe(50000);
      expect(constraints.area).toBe('dich vong');
    });

    it('giới hạn độ dài truy vấn tối đa 400 ký tự', () => {
      const longQuery = 'bánh dưới 50k ' + 'a'.repeat(450);
      const res = parseFinderQuery(longQuery);
      expect(res.warnings.some((w) => w.includes('400 ký tự'))).toBe(true);
      expect(res.constraints.category).toBe('bakery');
    });
  });

  describe('2. Ngân sách nhóm & Tồn kho thực tế (Budget Group & Stock)', () => {
    it('tính đúng tổng ngân sách nhóm (unitPrice * quantity) và chấp nhận khi nằm trong giới hạn', () => {
      const res = filterCustomerCatalog({
        query: '2 người 100k',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(1);
      expect(res.results[0].quantity).toBe(2);
      expect(res.results[0].totalPrice).toBe(70000);
    });

    it('loại bỏ túi khi tổng ngân sách nhóm vượt quá maxBudget', () => {
      const res = filterCustomerCatalog({
        query: '2 người 70k',
        bags: [mockBagMeat],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
    });

    it('loại bỏ túi khi tồn kho không đủ số lượng người yêu cầu', () => {
      const res = filterCustomerCatalog({
        query: '3 người 150k',
        bags: [mockBagMeat],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
    });

    it('loại bỏ túi khi giá không hợp lệ (âm, NaN, Infinity)', () => {
      const invalidBags: SurpriseBag[] = [
        { ...mockBagBakery, id: 'b-neg', discountPrice: -50000 },
        { ...mockBagBakery, id: 'b-nan', discountPrice: Number.NaN },
        { ...mockBagBakery, id: 'b-inf', discountPrice: Number.POSITIVE_INFINITY },
      ];

      const res = filterCustomerCatalog({
        query: 'bánh 50k',
        bags: invalidBags,
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
    });
  });

  describe('3. Trạng thái quán và túi (Closed / Inactive / Archived / Unverified)', () => {
    it('không trả kết quả nếu quán đang đóng cửa (isOpen = false)', () => {
      const closedBag: SurpriseBag = {
        ...mockBagBakery,
        id: 'bag-closed',
        merchantId: 'store-closed',
      };
      const res = filterCustomerCatalog({
        query: 'bánh 50k',
        bags: [closedBag],
        merchants: [mockMerchantClosed],
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
    });

    it('không trả kết quả nếu quán có status inactive', () => {
      const inactiveBag: SurpriseBag = {
        ...mockBagBakery,
        id: 'bag-inactive',
        merchantId: 'store-inactive',
      };
      const res = filterCustomerCatalog({
        query: 'bánh 50k',
        bags: [inactiveBag],
        merchants: [mockMerchantInactive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
    });

    it('không trả kết quả nếu quán không tồn tại hoặc không xác minh được mở cửa', () => {
      const res = filterCustomerCatalog({
        query: 'bánh 50k',
        bags: [mockBagBakery],
        merchants: [], // Danh sách quán rỗng
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
    });

    it('không trả kết quả nếu túi có isAvailable = false, status archived hoặc expired', () => {
      const unavailableBag: SurpriseBag = { ...mockBagBakery, isAvailable: false };
      const archivedBag: SurpriseBag = { ...mockBagBakery, status: 'archived' };
      const expiredStatusBag: SurpriseBag = { ...mockBagBakery, status: 'expired' };

      const res = filterCustomerCatalog({
        query: 'bánh 50k',
        bags: [unavailableBag, archivedBag, expiredStatusBag],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
    });
  });

  describe('4. Giờ nhận & Hạn sử dụng (Pickup Timezone & Shelf-life Expiry)', () => {
    it('chuyển đổi đúng giờ Việt Nam UTC+7 độc lập với múi giờ máy chạy', () => {
      const date = new Date('2026-11-13T14:00:00Z');
      const vn = getVietnamTime(date);
      expect(vn.hours).toBe(21);
      expect(vn.minutes).toBe(0);
      expect(vn.dateStr).toBe('2026-11-13');
      expect(vn.totalMinutes).toBe(21 * 60);
    });

    it('loại bỏ túi shelf-life nếu HSD còn hạn dài nhưng giờ nhận hôm nay đã qua', () => {
      const shelfLifeBag: SurpriseBag = {
        ...mockBagBakery,
        id: 'shelf-life-passed',
        bagType: 'shelf_life',
        expiryDate: '2027-12-31',
        pickupStart: '08:00',
        pickupEnd: '18:00',
      };

      const res = filterCustomerCatalog({
        query: 'bánh 50k',
        bags: [shelfLifeBag],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
    });

    it('loại bỏ túi khi mốc giờ nhận yêu cầu đã qua hôm nay (nhận trước 17:00 lúc 18:30)', () => {
      const res = filterCustomerCatalog({
        query: 'bánh nhận trước 17:00',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: testNow1830, // 18:30 VN
      });

      expect(res.results.length).toBe(0);
    });

    it('loại bỏ túi shelf-life nếu ngày HSD đã qua trong quá khứ', () => {
      const expiredBag: SurpriseBag = {
        ...mockBagBakery,
        id: 'shelf-life-expired',
        bagType: 'shelf_life',
        expiryDate: '2026-11-10',
        pickupStart: '18:00',
        pickupEnd: '21:00',
      };

      const res = filterCustomerCatalog({
        query: 'bánh 50k',
        bags: [expiredBag],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
    });

    it('loại bỏ túi khi khung giờ nhận bắt đầu sau thời điểm pickupBefore người dùng yêu cầu', () => {
      const res = filterCustomerCatalog({
        query: 'bánh nhận trước 17:00',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: new Date('2026-11-13T09:00:00Z'), // 16:00 VN
      });

      expect(res.results.length).toBe(0);
    });

    it('chấp nhận túi khi khung giờ nhận thoả mãn pickupBefore', () => {
      const res = filterCustomerCatalog({
        query: 'bánh nhận trước 20:30',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(1);
      expect(res.results[0].bag.id).toBe(mockBagBakery.id);
    });
  });

  describe('5. Khoảng cách thật và toạ độ (Distance Calculations)', () => {
    it('trả distanceKm = null khi người dùng không cung cấp toạ độ (không bịa khoảng cách)', () => {
      const res = filterCustomerCatalog({
        query: 'bánh dưới 50k',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        coords: null,
        now: testNow1830,
      });

      expect(res.results.length).toBe(1);
      expect(res.results[0].distanceKm).toBeNull();
    });

    it('tính toán khoảng cách Haversine chuẩn xác khi có đủ toạ độ người dùng và quán', () => {
      const userCoords = { lat: 21.03, lng: 105.785 };
      const res = filterCustomerCatalog({
        query: 'bánh dưới 50k',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        coords: userCoords,
        now: testNow1830,
      });

      expect(res.results.length).toBe(1);
      expect(res.results[0].distanceKm).toBeGreaterThan(0.2);
      expect(res.results[0].distanceKm).toBeLessThan(1.5);
    });

    it('trả distanceKm = null nếu toạ độ không hợp lệ hoặc ngoài giới hạn', () => {
      const merchantBadCoords: Merchant = {
        ...mockMerchantActive,
        id: 'store-bad-coords',
        latitude: 999, // Ngoài -90..90
        longitude: 105.7895,
      };
      const bagBadCoords: SurpriseBag = {
        ...mockBagBakery,
        merchantId: 'store-bad-coords',
      };

      const res = filterCustomerCatalog({
        query: 'bánh dưới 50k',
        bags: [bagBadCoords],
        merchants: [merchantBadCoords],
        coords: { lat: 21.03, lng: 105.785 },
        now: testNow1830,
      });

      expect(res.results.length).toBe(1);
      expect(res.results[0].distanceKm).toBeNull();
    });
  });

  describe('6. Cảnh báo an toàn, khẩu vị, món chưa hỗ trợ & Dị ứng', () => {
    it('thêm cảnh báo rõ ràng khi người dùng hỏi món không cay hoặc dị ứng', () => {
      const res = filterCustomerCatalog({
        query: '2 người 100k không ăn cay',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.warnings.length).toBeGreaterThan(0);
      expect(res.warnings.some((w) => w.includes('chưa được hệ thống xác minh độc lập'))).toBe(true);
    });

    it('thêm cảnh báo về khẩu phần khi người dùng hỏi ăn no', () => {
      const res = filterCustomerCatalog({
        query: 'món mặn 40k ăn no',
        bags: [mockBagMeat],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.warnings.some((w) => w.includes('không đảm bảo khẩu phần đủ no'))).toBe(true);
    });

    it('không khẳng định khớp catalogue khi truy vấn món không được hỗ trợ (pizza pepperoni)', () => {
      const res = filterCustomerCatalog({
        query: 'pizza pepperoni',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results).toHaveLength(0);
      expect(res.warnings.length).toBeGreaterThan(0);
      expect(res.warnings.some((w) => w.includes('từ khóa món cụ thể') || w.includes('ngoài các danh mục'))).toBe(true);
    });

    it('trả thông báo hướng dẫn khi không tìm thấy kết quả nào', () => {
      const res = filterCustomerCatalog({
        query: 'bánh dưới 10k',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
      expect(res.warnings.some((w) => w.includes('Không tìm thấy túi bất ngờ'))).toBe(true);
    });
  });

  describe('7. So khớp khu vực thực tế (Area Filtering)', () => {
    it('khớp khu vực qua địa chỉ cửa hàng', () => {
      const res = filterCustomerCatalog({
        query: 'quanh Dịch Vọng',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(1);
      expect(res.results[0].bag.id).toBe(mockBagBakery.id);
    });

    it('loại trừ khi khu vực không khớp bất kỳ thông tin nào trong danh mục', () => {
      const res = filterCustomerCatalog({
        query: 'quanh Hoàn Kiếm',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.results.length).toBe(0);
    });
  });

  describe('8. Kiểm tra tính hợp lệ của Constraints từ AI (AI Server Constraints Validation)', () => {
    it('chấp nhận constraints hợp lệ đủ envelope shape từ server', () => {
      const validPayload = {
        constraints: {
          maxBudget: 60000,
          people: 2,
          category: 'bakery',
          area: 'Cầu Giấy',
          pickupBefore: '20:00',
          preferences: ['không cay'],
        },
      };

      const c = validateServerConstraints(validPayload);
      expect(c.maxBudget).toBe(60000);
      expect(c.people).toBe(2);
      expect(c.category).toBe('bakery');
      expect(c.area).toBe('Cầu Giấy');
      expect(c.pickupBefore).toBe('20:00');
      expect(c.preferences).toEqual(['không cay']);
    });

    it('từ chối constraints rỗng hoặc thiếu trường bắt buộc trong envelope', () => {
      expect(() => validateServerConstraints({ constraints: {} })).toThrow();
      expect(() => validateServerConstraints({})).toThrow();
      expect(() => validateServerConstraints(null)).toThrow();
    });

    it('từ chối maxBudget âm, NaN hoặc không phải số', () => {
      expect(() =>
        validateServerConstraints({
          constraints: {
            maxBudget: -50000,
            people: 1,
            category: 'bakery',
            area: null,
            pickupBefore: null,
            preferences: [],
          },
        })
      ).toThrow();
    });

    it('từ chối số người ngoài khoảng 1..20 hoặc số thập phân', () => {
      expect(() =>
        validateServerConstraints({
          constraints: {
            maxBudget: 50000,
            people: 0,
            category: 'bakery',
            area: null,
            pickupBefore: null,
            preferences: [],
          },
        })
      ).toThrow();

      expect(() =>
        validateServerConstraints({
          constraints: {
            maxBudget: 50000,
            people: 25,
            category: 'bakery',
            area: null,
            pickupBefore: null,
            preferences: [],
          },
        })
      ).toThrow();
    });

    it('từ chối category không tồn tại trong repo', () => {
      expect(() =>
        validateServerConstraints({
          constraints: {
            maxBudget: 50000,
            people: 1,
            category: 'fabricated_category',
            area: null,
            pickupBefore: null,
            preferences: [],
          },
        })
      ).toThrow();
    });

    it('từ chối pickupBefore ngoài phạm vi giờ 00..23 hoặc phút 00..59 (29:99)', () => {
      expect(() =>
        validateServerConstraints({
          constraints: {
            maxBudget: 50000,
            people: 1,
            category: 'bakery',
            area: null,
            pickupBefore: '29:99',
            preferences: [],
          },
        })
      ).toThrow();
    });
  });

  describe('9. searchCustomerCatalog Network & AI Mode Contract', () => {
    const originalEnv = process.env.VITE_CUSTOMER_FINDER_API_ENABLED;

    afterEach(() => {
      process.env.VITE_CUSTOMER_FINDER_API_ENABLED = originalEnv;
      vi.restoreAllMocks();
    });

    it('mặc định chạy ở mode local mà không gọi fetch', async () => {
      process.env.VITE_CUSTOMER_FINDER_API_ENABLED = 'false';
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const res = await searchCustomerCatalog({
        query: 'bánh 50k',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(res.mode).toBe('local');
      expect(res.results.length).toBe(1);
    });

    it('khi bật API và fetch trả về HTTP 500, quăng lỗi rõ ràng thay vì silently fallback', async () => {
      process.env.VITE_CUSTOMER_FINDER_API_ENABLED = 'true';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(
        searchCustomerCatalog({
          query: 'bánh 50k',
          bags: [mockBagBakery],
          merchants: [mockMerchantActive],
          now: testNow1830,
        })
      ).rejects.toThrow(/HTTP 500/);
    });

    it('khi gọi AI thành công, chỉ lấy constraints và re-evaluate trên bags/merchants thực tế', async () => {
      process.env.VITE_CUSTOMER_FINDER_API_ENABLED = 'true';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          constraints: {
            maxBudget: 50000,
            people: 1,
            category: 'bakery',
            area: null,
            pickupBefore: null,
            preferences: [],
          },
          fabricatedBags: [{ id: 'fake-bag', name: 'Món ảo từ server' }],
        }),
      } as Response);

      const res = await searchCustomerCatalog({
        query: 'bánh 50k',
        bags: [mockBagBakery],
        merchants: [mockMerchantActive],
        now: testNow1830,
      });

      expect(res.mode).toBe('ai');
      expect(res.results.length).toBe(1);
      expect(res.results[0].bag.id).toBe(mockBagBakery.id);
    });
  });
});
