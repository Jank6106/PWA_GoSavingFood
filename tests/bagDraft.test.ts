import { describe, it, expect } from 'vitest';
import { resolveDraftExpiry } from '../apps/merchant/src/utils/aiBagDraft';
import {
  buildUserPrompt,
  cleanDescription,
  cleanName,
  normalizeExpiry,
  sanitizeResult,
} from '../apps/web/app/api/ai/analyze-bag/bagDraft';

describe('AI Đăng Hàng: giữ giới hạn hạn sử dụng khi điền form', () => {
  it('chặn HSD đã qua thay vì chuyển thành hàng trong ngày', () => {
    expect(() => resolveDraftExpiry('2026-11-13', '2026-11-14')).toThrow(/đã qua/);
  });

  it('giữ HSD tương lai và chỉ dùng daily cho hôm nay hoặc không có nhãn', () => {
    expect(resolveDraftExpiry('2026-11-15', '2026-11-14')).toEqual({ bagType: 'shelf_life', expiryDate: '2026-11-15' });
    expect(resolveDraftExpiry('2026-11-14', '2026-11-14')).toEqual({ bagType: 'daily', expiryDate: '' });
    expect(resolveDraftExpiry(null, '2026-11-14')).toEqual({ bagType: 'daily', expiryDate: '' });
  });
});

describe('AI Đăng Hàng: làm sạch tên món', () => {
  it('bỏ hẳn chữ "cuối ngày" và các từ cấm', () => {
    expect(cleanName('Túi bánh mì bơ tỏi cuối ngày')).toBe('Túi bánh mì bơ tỏi');
    expect(cleanName('Túi bánh ngọt - cuối ngày')).toBe('Túi bánh ngọt');
    expect(cleanName('Túi croissant giải cứu giảm giá')).toBe('Túi croissant');
    expect(cleanName('Túi Bánh Mì CUỐI NGÀY')).toBe('Túi Bánh Mì');
  });

  it('bỏ emoji, ngoặc kép, dấu chấm cuối và viết hoa chữ đầu', () => {
    expect(cleanName('"túi trà sữa trân châu 🧋."')).toBe('Túi trà sữa trân châu');
  });

  it('cắt tên quá dài theo ranh giới từ (≤ 60 ký tự)', () => {
    const long = cleanName('Túi bánh ngọt mix gồm croissant bơ, su kem vani, bánh tart trứng và bánh mì hoa cúc');
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith(',')).toBe(false);
  });
});

describe('AI Đăng Hàng: mô tả & hạn dùng', () => {
  it('mô tả bỏ emoji, kết thúc bằng dấu câu, không quá 240 ký tự', () => {
    expect(cleanDescription('Bánh giòn thơm 😋')).toBe('Bánh giòn thơm.');
    const long = cleanDescription('Câu một rất dài. '.repeat(30));
    expect(long.length).toBeLessThanOrEqual(241);
  });

  it('hạn dùng: nhận YYYY-MM-DD và dd/mm/yyyy, loại chữ như "Hôm nay"', () => {
    expect(normalizeExpiry('2026-11-20')).toBe('2026-11-20');
    expect(normalizeExpiry('20/11/2026')).toBe('2026-11-20');
    expect(normalizeExpiry('Hôm nay')).toBeNull();
    expect(normalizeExpiry('31/02/2026')).toBeNull();
    expect(normalizeExpiry(null)).toBeNull();
  });

  it('sanitizeResult chuẩn hóa toàn bộ JSON từ AI', () => {
    const res = sanitizeResult({
      is_food: true,
      items_seen: ['bánh sừng bò', ''],
      name: 'Túi croissant bơ cuối ngày',
      category: 'unknown',
      description: 'Croissant vỏ vàng nhiều lớp',
      expiry_date: 'Hôm nay',
      estimated_original_price: 25499,
    });
    expect(res).toEqual({
      isFood: true,
      itemsSeen: ['bánh sừng bò'],
      name: 'Túi croissant bơ',
      category: 'other',
      description: 'Croissant vỏ vàng nhiều lớp.',
      expiryDate: null,
      estimatedOriginalPrice: 25000,
    });
  });

  it('prompt người dùng kèm ngữ cảnh cửa hàng khi có', () => {
    expect(buildUserPrompt({ name: 'Tiệm bánh ABC', foodCategories: ['bakery'] })).toContain('Tiệm bánh ABC');
    expect(buildUserPrompt()).toBe('Phân tích ảnh đồ còn dư này để đăng bán.');
  });
});
