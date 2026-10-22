import { describe, it, expect } from 'vitest';
import { calculateDistanceKm, toLngLat, fromLngLat } from '../apps/customer/src/services/mapbox.service';

describe('Google Engineering Standard: Mapbox & Geo Utilities', () => {
  it('converts LatLng to [lng, lat] and back accurately', () => {
    const coords = { latitude: 10.7769, longitude: 106.7009 };
    const lngLat = toLngLat(coords);
    expect(lngLat).toEqual([106.7009, 10.7769]);

    const restored = fromLngLat(lngLat);
    expect(restored).toEqual(coords);
  });

  it('calculates distance between two points accurately (Haversine formula)', () => {
    // Tọa độ Chợ Bến Thành và Nhà thờ Đức Bà (khoảng ~1.1km)
    const benThanh: [number, number] = [106.6983, 10.7725];
    const ducBa: [number, number] = [106.6990, 10.7798];

    const dist = calculateDistanceKm(benThanh, ducBa);
    expect(dist).toBeGreaterThan(0.7);
    expect(dist).toBeLessThan(1.5);
  });

  it('returns 0 distance for identical coordinates', () => {
    const pt: [number, number] = [106.7, 10.8];
    const dist = calculateDistanceKm(pt, pt);
    expect(dist).toBe(0);
  });
});
