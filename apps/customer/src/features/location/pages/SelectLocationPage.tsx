import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Crosshair, Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import { ScreenHeader, SearchField } from '../../../shared/components';
import { customerService } from '../../../services/customer.service';
import { MAPBOX_TOKEN, mapboxService } from '../../../services/mapbox.service';
import type { LocationSuggestion } from '../../../shared/types/customer.types';

// Tọa độ trung tâm mặc định: TP. Hồ Chí Minh [lng, lat]
const DEFAULT_COORDS: [number, number] = [106.7032, 10.7798];

interface SelectLocationPageProps {
  currentLocation: string;
  initialCoords?: { lat: number; lng: number } | null;
  onBack: () => void;
  onSelect: (location: string, coords?: { lat: number; lng: number }) => void;
}

export function SelectLocationPage({
  currentLocation,
  initialCoords,
  onBack,
  onSelect,
}: SelectLocationPageProps) {
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<LocationSuggestion[]>([]);
  const [selected, setSelected] = useState(currentLocation || 'TP. Hồ Chí Minh');
  const [selectedCoords, setSelectedCoords] = useState<[number, number]>(() => {
    if (initialCoords && typeof initialCoords.lng === 'number' && typeof initialCoords.lat === 'number') {
      return [initialCoords.lng, initialCoords.lat];
    }
    return DEFAULT_COORDS;
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const storeMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // 1. Tải danh sách cửa hàng gần vị trí [lng, lat] và vẽ Marker
  const loadNearbyStores = async (lngLat: [number, number]) => {
    if (!mapRef.current) return;
    try {
      const stores = await customerService.getStoresNearby({
        lat: lngLat[1],
        lng: lngLat[0],
      });

      // Xóa marker cửa hàng cũ
      storeMarkersRef.current.forEach((m) => m.remove());
      storeMarkersRef.current = [];

      // Thêm marker mới
      stores.forEach((store: any) => {
        if (!store.latitude || !store.longitude) return;

        const el = document.createElement('div');
        el.className = 'gsf-store-marker';
        el.innerHTML = `
          <div class="gsf-store-pill">
            <span>🥡 ${store.name || 'Quán ăn'}</span>
          </div>
        `;

        const distanceText = store.distance_m
          ? `${(store.distance_m / 1000).toFixed(1)} km`
          : 'Gần đây';

        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
          <div style="font-family:sans-serif;padding:4px 6px;">
            <strong style="display:block;font-size:13px;color:#1e293b;margin-bottom:2px;">${store.name}</strong>
            <small style="display:block;font-size:11px;color:#64748b;margin-bottom:4px;">${store.address || ''}</small>
            <span style="font-size:11px;font-weight:700;color:#166B4A;">Cách bạn ~${distanceText}</span>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([store.longitude, store.latitude])
          .setPopup(popup)
          .addTo(mapRef.current!);

        el.addEventListener('click', () => {
          setSelected(store.address || store.name);
          setSelectedCoords([store.longitude, store.latitude]);
        });

        storeMarkersRef.current.push(marker);
      });
    } catch (err) {
      console.warn('[Mapbox] Could not load nearby stores:', err);
    }
  };

  // 2. Di chuyển ghim vị trí đã chọn
  const updateUserPin = (lngLat: [number, number]) => {
    if (!mapRef.current) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'gsf-map-user-pin';
      el.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      `;
      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLngLat(lngLat);
    }
  };

  // 3. Khởi tạo bản đồ Mapbox
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: selectedCoords,
      zoom: 14,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      updateUserPin(selectedCoords);
      void loadNearbyStores(selectedCoords);
    });


    // Cho phép người dùng click bất kỳ vị trí nào trên bản đồ để chọn
    map.on('click', async (e) => {
      const clickedLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setSelectedCoords(clickedLngLat);
      updateUserPin(clickedLngLat);
      setStatusMessage('Đang lấy địa chỉ...');

      try {
        const addr = await mapboxService.reverseGeocode(clickedLngLat[0], clickedLngLat[1]);
        setSelected(addr.address || addr.name);
        setStatusMessage(null);
      } catch {
        setStatusMessage(null);
      }

      void loadNearbyStores(clickedLngLat);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 4. Tìm kiếm địa điểm với debounce 250ms
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setLocations([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      let active = true;
      customerService
        .searchLocations(trimmed, selectedCoords)
        .then((items) => {
          if (active) {
            setLocations(items);
            setIsSearching(false);
          }
        })
        .catch(() => {
          if (active) setIsSearching(false);
        });
      return () => {
        active = false;
      };
    }, 250);

    return () => clearTimeout(timer);
  }, [query, selectedCoords]);

  // 5. Nút bấm "Dùng vị trí hiện tại" (GPS thật qua navigator.geolocation)
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setIsLocating(true);
    setStatusMessage('Đang tìm vị trí GPS của bạn...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLngLat: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        setSelectedCoords(userLngLat);
        setIsLocating(false);
        setStatusMessage(null);

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: userLngLat,
            zoom: 15,
            essential: true,
          });
        }

        updateUserPin(userLngLat);

        // Reverse geocoding để lấy tên phố/phường
        try {
          const res = await mapboxService.reverseGeocode(userLngLat[0], userLngLat[1]);
          setSelected(res.address || res.name);
        } catch {
          setSelected(`Vị trí GPS (${userLngLat[1].toFixed(4)}, ${userLngLat[0].toFixed(4)})`);
        }

        void loadNearbyStores(userLngLat);
      },
      (error) => {
        setIsLocating(false);
        setStatusMessage(null);
        console.warn('[GPS] Error code:', error.code, error.message);
        if (error.code === 1) {
          alert('Vui lòng cho phép quyền truy cập vị trí để tự động định vị.');
        } else {
          alert('Không thể nhận diện vị trí GPS lúc này. Vui lòng chọn địa điểm từ bản đồ.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // 6. Xử lý khi click vào 1 gợi ý địa điểm từ danh sách tìm kiếm
  const handleSelectSuggestion = (loc: LocationSuggestion) => {
    setSelected(loc.address || loc.name);

    if (loc.coordinates && mapRef.current) {
      const coords: [number, number] = loc.coordinates;
      setSelectedCoords(coords);
      mapRef.current.flyTo({
        center: coords,
        zoom: 15,
        essential: true,
      });
      updateUserPin(coords);
      void loadNearbyStores(coords);
    }
  };

  return (
    <div className="customer-screen customer-location-screen">
      <ScreenHeader
        title="Chọn vị trí"
        subtitle="Tìm món ngon cứu trợ ở gần bạn"
        onBack={onBack}
      />

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Tìm đường, phường, quận..."
      />

      <button
        type="button"
        className="customer-gps-button"
        onClick={handleUseCurrentGPS}
        disabled={isLocating}
      >
        {isLocating ? (
          <Loader2 size={19} className="animate-spin text-primary" />
        ) : (
          <Crosshair size={19} />
        )}
        <span>
          <strong>
            {isLocating ? 'Đang định vị GPS...' : 'Dùng vị trí hiện tại'}
          </strong>
          <small>Cho phép trình duyệt truy cập GPS chính xác</small>
        </span>
      </button>

      {/* Khung bản đồ tương tác Mapbox */}
      <div className="customer-location-map">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        {statusMessage && (
          <div className="customer-map-status-overlay">
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Danh sách gợi ý tìm kiếm */}
      <div className="customer-location-results">
        {isSearching ? (
          <div className="customer-location-loading">
            <Loader2 size={18} className="animate-spin text-primary" />
            <span>Đang tìm kiếm “{query}”...</span>
          </div>
        ) : locations.length > 0 ? (
          locations.map((location) => {
            const isMatch =
              selected === location.name || selected === location.address;
            return (
              <button
                type="button"
                key={location.id}
                className={isMatch ? 'is-selected' : ''}
                onClick={() => handleSelectSuggestion(location)}
              >
                <MapPin size={18} />
                <span>
                  <strong>{location.name}</strong>
                  <small>{location.address}</small>
                </span>
                <em>{location.distance}</em>
              </button>
            );
          })
        ) : query.trim() ? (
          <div className="customer-location-empty">
            <MapPin size={22} className="text-muted" />
            <span>Không tìm thấy địa điểm “{query}”</span>
            <small>Hãy thử nhập tên đường, địa danh hoặc ghim trực tiếp trên bản đồ.</small>
          </div>
        ) : (
          <button type="button" className="is-selected">
            <Navigation size={18} />
            <span>
              <strong>Vị trí đã chọn trên bản đồ</strong>
              <small>{selected}</small>
            </span>
          </button>
        )}
      </div>

      <div className="customer-sticky-action">
        <Button
          fullWidth
          size="lg"
          onClick={() =>
            onSelect(selected, {
              lat: selectedCoords[1],
              lng: selectedCoords[0],
            })
          }
        >
          Xác nhận vị trí này
        </Button>
      </div>
    </div>
  );
}
