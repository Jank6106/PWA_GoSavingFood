import { afterEach, describe, expect, it, vi } from 'vitest';
import { filterCustomerCatalog, parseFinderQuery, searchCustomerCatalog, FINDER_AI_TIMEOUT_MS } from '../apps/customer/src/services/customer-finder.service';
import type { Merchant, SurpriseBag } from '../apps/customer/src/shared/types/customer.types';

vi.mock('../apps/customer/src/services/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(() => new Promise(() => {})) } },
}));

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('Coordinator integration regression cases', () => {
  it('preserves metre precision for nearby stores instead of rounding 34 metres to zero', () => {
    const merchant: Merchant = {
      id: 'qa-store', name: 'Tiệm QA', description: '', phone: '', address: 'Dịch Vọng',
      logo: '', banner: '', rating: 0, totalRatings: 0, distance: 34,
      status: 'active', isOpen: true, openingHours: '00:00–23:59',
      latitude: 21.030306, longitude: 105.78,
    };
    const bag: SurpriseBag = {
      id: 'qa-bag', merchantId: merchant.id, merchantName: merchant.name, name: 'Bánh QA',
      description: '', originalPrice: 80000, discountPrice: 30000, category: 'bakery',
      imageUrl: '', quantity: 3, maxQuantity: 3, pickupStart: '00:00', pickupEnd: '23:59',
      bagType: 'daily', isAvailable: true, rating: 0,
    };
    const response = filterCustomerCatalog({
      query: 'bánh 100k', bags: [bag], merchants: [merchant],
      coords: { lat: 21.03, lng: 105.78 }, now: new Date('2026-11-13T12:00:00Z'),
    });
    expect(response.results).toHaveLength(1);
    expect(response.results[0].distanceKm).toBeCloseTo(0.034, 3);
    expect(response.results[0].reasons).toContain('Cách vị trí của bạn ~34 m');
  });
  it('preserves literal đồng units rather than silently multiplying them by a thousand', () => {
    expect(parseFinderQuery('bánh dưới 500đ').constraints.maxBudget).toBe(500);
  });
  it('does not infer meat from the word ngàn in a beverage budget', () => {
    expect(parseFinderQuery('cà phê dưới 100 ngàn').constraints.category).toBe('beverage');
  });
  it('does not infer meat from a budget-only request', () => {
    expect(parseFinderQuery('ngân sách 100k').constraints.category).toBeNull();
  });
  it('extracts the location in the complete meeting example without a generic khu prefix', () => {
    const { constraints } = parseFinderQuery('Tối nay có món mặn nào dưới 35k quanh khu Dịch Vọng ăn no được không?');
    expect(constraints.area).toBe('Dịch Vọng');
  });
  it('settles after the timeout even when the session lookup never settles', async () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_CUSTOMER_FINDER_API_ENABLED', 'true');
    let state = 'pending';
    void searchCustomerCatalog({ query: 'bánh dưới 50k', bags: [], merchants: [] })
      .then(() => { state = 'resolved'; }, () => { state = 'rejected'; });
    await vi.advanceTimersByTimeAsync(FINDER_AI_TIMEOUT_MS + 100);
    expect(state).toBe('rejected');
  });
});
