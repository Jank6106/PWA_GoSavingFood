import { describe, it, expect } from 'vitest';
import { getBagTimingInfo } from '../apps/customer/src/shared/utils/bagTiming';
import type { SurpriseBag } from '../apps/customer/src/shared/types/customer.types';

describe('Google Engineering Standard: Bag Timing Business Logic', () => {
  it('should return order_closed when bag is null or undefined', () => {
    const res = getBagTimingInfo(null);
    expect(res.phase).toBe('order_closed');
    expect(res.canOrder).toBe(false);
  });

  it('should return sold_out when bag quantity is 0', () => {
    const bag: Partial<SurpriseBag> = {
      id: 'test-1',
      name: 'Túi test',
      quantity: 0,
      price: 50000,
      discountPrice: 25000,
      originalPrice: 50000,
    };
    const res = getBagTimingInfo(bag as SurpriseBag);
    expect(res.phase).toBe('sold_out');
    expect(res.badgeLabel).toBe('Hết hàng');
    expect(res.canOrder).toBe(false);
  });

  it('should return expired when shelf_life bag expiryDate is in the past', () => {
    const bag: Partial<SurpriseBag> = {
      id: 'test-2',
      name: 'Túi hết hạn',
      quantity: 5,
      bagType: 'shelf_life',
      expiryDate: '2020-01-01',
      price: 50000,
      discountPrice: 25000,
      originalPrice: 50000,
    };
    const res = getBagTimingInfo(bag as SurpriseBag);
    expect(res.phase).toBe('expired');
    expect(res.badgeLabel).toBe('Đã hết hạn');
    expect(res.canOrder).toBe(false);
  });

  it('should return available when shelf_life bag expiryDate is in the future', () => {
    const futureYear = new Date().getFullYear() + 1;
    const bag: Partial<SurpriseBag> = {
      id: 'test-3',
      name: 'Túi còn hạn dài',
      quantity: 5,
      bagType: 'shelf_life',
      expiryDate: `${futureYear}-12-31`,
      price: 50000,
      discountPrice: 25000,
      originalPrice: 50000,
    };
    const res = getBagTimingInfo(bag as SurpriseBag);
    expect(res.phase).toBe('available');
    expect(res.canOrder).toBe(true);
  });
});
