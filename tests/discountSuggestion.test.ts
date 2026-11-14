import { describe, it, expect } from 'vitest';
import {
  computeSalePrice,
  suggestDiscount,
  suggestPickupWindow,
} from '../apps/merchant/src/utils/discountSuggestion';

const at = (h: number, m = 0) => h * 60 + m;

describe('AI Đăng Hàng: gợi ý % giảm theo giờ đóng cửa', () => {
  it('còn dưới 1 tiếng -> giảm 70%', () => {
    const res = suggestDiscount('21:00', at(20, 15));
    expect(res.percent).toBe(70);
    expect(res.minutesLeft).toBe(45);
    expect(res.reason).toContain('45 phút');
  });

  it('đã qua giờ đóng cửa -> giảm 70%, minutesLeft = 0', () => {
    const res = suggestDiscount('21:00', at(21, 30));
    expect(res.percent).toBe(70);
    expect(res.minutesLeft).toBe(0);
  });

  it('còn đúng 1 tiếng và tới 3 tiếng -> giảm 50%', () => {
    expect(suggestDiscount('21:00', at(20, 0)).percent).toBe(50);
    expect(suggestDiscount('21:00', at(18, 0)).percent).toBe(50);
  });

  it('còn hơn 3 tiếng -> giảm 30%', () => {
    expect(suggestDiscount('21:00', at(15, 0)).percent).toBe(30);
  });

  it('đóng cửa 00:00 được hiểu là nửa đêm', () => {
    const res = suggestDiscount('00:00', at(23, 30));
    expect(res.percent).toBe(70);
    expect(res.minutesLeft).toBe(30);
  });
});

describe('AI Đăng Hàng: khung giờ nhận & giá giải cứu', () => {
  it('khung giờ từ hiện tại (làm tròn 5 phút) đến giờ đóng cửa', () => {
    expect(suggestPickupWindow('21:00', at(19, 2))).toEqual({ start: '19:05', end: '21:00' });
  });

  it('khung giờ luôn có start < end kể cả khi đã sát/qua giờ đóng cửa', () => {
    const w = suggestPickupWindow('21:00', at(20, 55));
    expect(w.start < w.end).toBe(true);
    const late = suggestPickupWindow('21:00', at(23, 50));
    expect(late.start < late.end).toBe(true);
  });

  it('giá giải cứu làm tròn nghìn và luôn nhỏ hơn giá gốc', () => {
    expect(computeSalePrice(120000, 70)).toBe(36000);
    expect(computeSalePrice(85000, 50)).toBe(43000);
    expect(computeSalePrice(1500, 30)).toBeLessThan(1500);
    expect(computeSalePrice(0, 50)).toBe(0);
  });
});
