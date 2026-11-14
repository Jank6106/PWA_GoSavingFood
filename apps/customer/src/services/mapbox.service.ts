interface MapboxFeature { id: string; center?: [number, number]; geometry?: {coordinates: [number, number]}; text?: string; place_name?: string; properties?: { name?: string; full_address?: string; place_formatted?: string; mapbox_id?: string } }
import type { LocationSuggestion } from '../shared/types/customer.types';

// Mapbox Token từ biến môi trường Vite (hoặc fallback token)
export const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  import.meta.env.MAPBOX_PUBLIC_TOKEN ||
  import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ||
  '';


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

/**
 * Tính khoảng cách (km) giữa 2 tọa độ theo công thức Haversine
 */
export function calculateDistanceKm(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Định dạng khoảng cách hiển thị thân thiện với người dùng
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `Cách ~${Math.round(distanceKm * 1000)} m`;
  }
  return `Cách ~${distanceKm.toFixed(1)} km`;
}

export const mapboxService = {
  getToken(): string {
    return MAPBOX_TOKEN;
  },

  /**
   * Tìm kiếm địa điểm chất lượng cao:
   * 1. Sử dụng Mapbox Search Box API v1 (/search/searchbox/v1/forward) chuyên biệt cho địa điểm, POI, đường phố VN
   * 2. Ưu tiên gần vị trí người dùng (proximity)
   * 3. Tính toán khoảng cách thực tế (km/m)
   * 4. Tự động fallback sang Geocoding v6 và v5 nếu lỗi
   */
  async searchPlaces(query: string, proximity?: [number, number]): Promise<LocationSuggestion[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const effectiveProximity = proximity || [105.8542, 21.0285];
    const proximityParam = `&proximity=${effectiveProximity[0]},${effectiveProximity[1]}`;

    // CHIẾN LƯỢC 1: Mapbox Search Box API v1 (Độ chính xác cao nhất cho POI, quán ăn, tòa nhà, địa chỉ VN)
    try {
      const searchBoxUrl = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(
        trimmed
      )}&access_token=${MAPBOX_TOKEN}&country=vn&language=vi&types=poi,address,street,neighborhood,place,district,locality&limit=8${proximityParam}`;

      const res = await fetch(searchBoxUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.features) && data.features.length > 0) {
          return data.features.map((feature: MapboxFeature) => {
            const coords = feature.geometry?.coordinates as [number, number];
            let distanceText = 'Khu vực bạn chọn';
            if (coords && proximity) {
              const km = calculateDistanceKm(proximity, coords);
              distanceText = formatDistance(km);
            }

            const name = feature.properties?.name || feature.properties?.full_address || 'Địa điểm';
            const address =
              feature.properties?.full_address ||
              feature.properties?.place_formatted ||
              feature.properties?.name ||
              '';

            return {
              id: feature.properties?.mapbox_id || feature.id || `loc-${Math.random()}`,
              name,
              address,
              distance: distanceText,
              coordinates: coords,
            };
          });
        }
      }
    } catch (err) {
      console.warn('[Mapbox SearchBox] Forward search failed, trying Geocoding fallback:', err);
    }

    // CHIẾN LƯỢC 2: Fallback sang Mapbox Geocoding v5
    try {
      const v5Url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        trimmed
      )}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi&limit=6${proximityParam}`;

      const res = await fetch(v5Url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.features) && data.features.length > 0) {
          return data.features.map((feature: MapboxFeature) => {
            const coords = feature.center as [number, number];
            let distanceText = 'Khu vực bạn chọn';
            if (coords && proximity) {
              const km = calculateDistanceKm(proximity, coords);
              distanceText = formatDistance(km);
            }
            return {
              id: feature.id,
              name: feature.text || feature.place_name,
              address: feature.place_name,
              distance: distanceText,
              coordinates: coords,
            };
          });
        }
      }
    } catch (err) {
      console.error('[Mapbox v5] Search error:', err);
    }

    return [];
  },

  /**
   * Reverse Geocoding: Lấy địa chỉ cụ thể từ tọa độ [lng, lat]
   * Sử dụng Mapbox Geocoding v6 API, fallback v5
   */
  async reverseGeocode(lng: number, lat: number): Promise<{ name: string; address: string }> {
    // 1. Thử Mapbox Geocoding v6 Reverse
    try {
      const v6Url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${MAPBOX_TOKEN}&country=vn&language=vi`;
      const res = await fetch(v6Url);
      if (res.ok) {
        const data = await res.json();
        const top = data.features?.[0];
        if (top?.properties) {
          return {
            name: top.properties.name || 'Vị trí đã chọn',
            address:
              top.properties.full_address ||
              top.properties.place_formatted ||
              `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          };
        }
      }
    } catch (err) {
      console.warn('[Mapbox v6] Reverse geocode failed, trying v5 fallback:', err);
    }

    // 2. Fallback sang Mapbox v5 Reverse
    try {
      const v5Url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi&limit=1`;
      const res = await fetch(v5Url);
      if (res.ok) {
        const data = await res.json();
        const feature = data.features?.[0];
        if (feature) {
          return {
            name: feature.text || 'Vị trí đã chọn',
            address: feature.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          };
        }
      }
    } catch (err) {
      console.error('[Mapbox v5] Reverse geocode error:', err);
    }

    return {
      name: 'Vị trí đã chọn',
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
  },
};

