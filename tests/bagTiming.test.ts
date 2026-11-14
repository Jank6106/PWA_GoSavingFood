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

  it('merchant getBagCategory should keep bag on_shelf when quantity is 0', async () => {
    const { getBagCategory } = await import('../apps/merchant/src/utils/bagTiming');
    const bag = {
      id: 'test-mer-1',
      name: 'Túi hết hàng',
      quantity: 0,
      availableQuantity: 0,
      status: 'active' as const,
      bagType: 'shelf_life' as const,
      expiryDate: '2099-12-31',
      pickupTimeStart: '08:00',
      pickupTimeEnd: '22:00',
      category: 'Bánh mỳ',
      originalPrice: 50000,
      salePrice: 25000,
      imageUrl: 'test.jpg',
      createdAt: '2026-01-01',
    };
    const category = getBagCategory(bag as any);
    expect(category).toBe('on_shelf');
  });

  it('merchant getBagCategory should return in_storage when status is hidden', async () => {
    const { getBagCategory } = await import('../apps/merchant/src/utils/bagTiming');
    const bag = {
      id: 'test-mer-2',
      name: 'Túi gỡ kệ',
      quantity: 5,
      availableQuantity: 5,
      status: 'hidden' as const,
      bagType: 'shelf_life' as const,
      expiryDate: '2099-12-31',
      pickupTimeStart: '08:00',
      pickupTimeEnd: '22:00',
      category: 'Bánh mỳ',
      originalPrice: 50000,
      salePrice: 25000,
      imageUrl: 'test.jpg',
      createdAt: '2026-01-01',
    };
    const category = getBagCategory(bag as any);
    expect(category).toBe('in_storage');
  });
});
