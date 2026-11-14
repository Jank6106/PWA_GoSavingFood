import { describe, expect, it } from 'vitest';
import { filterCustomerCatalog, parseFinderQuery, validateServerConstraints } from '../apps/customer/src/services/customer-finder.service';
import type { Merchant, SurpriseBag } from '../apps/customer/src/shared/types/customer.types';

const merchant: Merchant = {
  id: 'review-store', name: 'Cửa hàng kiểm thử', description: '', phone: '',
  address: 'Dịch Vọng', logo: '', banner: '', rating: 0, totalRatings: 0,
  distance: 0, status: 'active', isOpen: true, openingHours: '08:00–22:00',
};
const bag: SurpriseBag = {
  id: 'review-bag', merchantId: merchant.id, merchantName: merchant.name,
  name: 'Bánh kiểm thử', description: '', originalPrice: 60000, discountPrice: 30000,
  category: 'bakery', imageUrl: '', quantity: 5, maxQuantity: 5,
  pickupStart: '16:00', pickupEnd: '22:00', bagType: 'daily', isAvailable: true, rating: 0,
};
const now = new Date('2026-11-13T11:30:00Z'); // 18:30 Vietnam
const search = (overrides: Partial<SurpriseBag> = {}, query = 'bánh dưới 50k', merchants = [merchant]) =>
  filterCustomerCatalog({ query, bags: [{ ...bag, ...overrides }], merchants, now });

describe('Coordinator review: constraints must not silently widen', () => {
  it('rejects a pickup deadline that has already passed today', () => {
    expect(search({}, 'bánh nhận trước 17:00').results).toHaveLength(0);
  });
  it('does not recommend bags whose merchant cannot be verified open', () => {
    expect(search({}, 'bánh dưới 50k', []).results).toHaveLength(0);
  });
  it('does not recommend bags explicitly marked expired', () => {
    expect(search({ status: 'expired' }).results).toHaveLength(0);
  });
  it.each([-100, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid price %s', (discountPrice) => {
    expect(search({ discountPrice }).results).toHaveLength(0);
  });
  it('does not claim unsupported queries match the entire catalogue', () => {
    const response = search({}, 'pizza pepperoni');
    expect(response.results).toHaveLength(0);
    expect(response.warnings.length).toBeGreaterThan(0);
  });
  it('understands decimal money rather than multiplying the budget by ten', () => {
    expect(parseFinderQuery('dưới 1,5 triệu').constraints.maxBudget).toBe(1500000);
  });
  it('preserves an explicit vegetarian category over generic dish terms', () => {
    expect(parseFinderQuery('bún chay dưới 50k').constraints.category).toBe('vegetarian');
  });
  it('rejects empty server constraints rather than matching everything', () => {
    expect(() => validateServerConstraints({ constraints: {} })).toThrow();
  });
  it('rejects out-of-range server pickup hours and minutes', () => {
    expect(() => validateServerConstraints({ constraints: {
      maxBudget: 50000, people: 1, category: 'bakery', area: null,
      pickupBefore: '29:99', preferences: [],
    } })).toThrow();
  });
});
