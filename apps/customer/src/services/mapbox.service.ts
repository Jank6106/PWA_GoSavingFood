import type { LocationSuggestion } from '../shared/types/customer.types';

// Mapbox Token từ biến môi trường Vite (hoặc fallback token)
export const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1IjoiZGF2aWRraGFuaCIsImEiOiJjbXVsMjYzbXkyMHliMndvZWZ6cDgxbXpnIn0.DFP-fsuCTdE8VMF8d7PIKA';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Chuyển đổi tọa độ từ format App { latitude, longitude } sang Mapbox format [lng, lat]
 * theo mục 2 của docs/MAPBOX_INTEGRATION.md
 */
export function toLngLat(coords: LatLng): [number, number] {
  return [coords.longitude, coords.latitude];
}

/**
 * Chuyển đổi tọa độ từ Mapbox format [lng, lat] sang format App { latitude, longitude }
 */
export function fromLngLat(coords: [number, number]): LatLng {
  return {
    latitude: coords[1],
    longitude: coords[0],
  };
}

export const mapboxService = {
  getToken(): string {
    return MAPBOX_TOKEN;
  },

  /**
   * Tìm kiếm địa điểm bằng Mapbox Geocoding API v5
   * Tự động ưu tiên quốc gia Việt Nam (country=vn) và ngôn ngữ tiếng Việt (language=vi)
   */
  async searchPlaces(query: string, proximity?: [number, number]): Promise<LocationSuggestion[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      const proximityParam = proximity ? `&proximity=${proximity[0]},${proximity[1]}` : '';
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        trimmed
      )}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi&limit=5${proximityParam}`;

      const res = await fetch(url);
      if (!res.ok) {
        console.warn('[Mapbox] Geocoding API error:', res.status, res.statusText);
        return [];
      }

      const data = await res.json();
      if (!data.features || !Array.isArray(data.features)) {
        return [];
      }

      return data.features.map((feature: any) => ({
        id: feature.id,
        name: feature.text || feature.place_name,
        address: feature.place_name,
        distance: 'Khu vực bạn chọn',
        coordinates: feature.center as [number, number],
      }));
    } catch (err) {
      console.error('[Mapbox] Search error:', err);
      return [];
    }
  },

  /**
   * Reverse Geocoding: Lấy địa chỉ cụ thể từ tọa độ [lng, lat]
   */
  async reverseGeocode(lng: number, lat: number): Promise<{ name: string; address: string }> {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi&limit=1`;
      const res = await fetch(url);
      if (!res.ok) {
        return {
          name: 'Vị trí đã chọn',
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        };
      }

      const data = await res.json();
      const feature = data.features?.[0];
      if (feature) {
        return {
          name: feature.text || 'Vị trí đã chọn',
          address: feature.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        };
      }
    } catch (err) {
      console.error('[Mapbox] Reverse geocode error:', err);
    }

    return {
      name: 'Vị trí đã chọn',
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
  },
};
