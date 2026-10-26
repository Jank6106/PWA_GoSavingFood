import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronLeft, Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import { Button } from '@gosavingfood/ui';
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

  // 1. Di chuyển ghim vị trí đã chọn
  const updateUserPin = (lngLat: [number, number]) => {
    if (!mapRef.current) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'gsf-map-user-pin';
      el.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#166B4A" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="none" />
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

    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      updateUserPin(selectedCoords);
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
    });

    const handleResize = () => {
      map.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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

        try {
          const res = await mapboxService.reverseGeocode(userLngLat[0], userLngLat[1]);
          setSelected(res.address || res.name);
        } catch {
          setSelected(`Vị trí GPS (${userLngLat[1].toFixed(4)}, ${userLngLat[0].toFixed(4)})`);
        }
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
    setQuery(''); // Đóng dropdown sau khi chọn

    if (loc.coordinates && mapRef.current) {
      const coords: [number, number] = loc.coordinates;
      setSelectedCoords(coords);
      mapRef.current.flyTo({
        center: coords,
        zoom: 15,
        essential: true,
      });
      updateUserPin(coords);
    }
  };

  return (
    <div className="customer-location-page-fullscreen">
      {/* 1. Header xanh Yindii style: Nút Back + Thanh Search pill trắng */}
      <header className="customer-location-header-yindii">
        <button
          type="button"
          className="customer-location-back-btn"
          onClick={onBack}
          aria-label="Quay lại"
        >
          <ChevronLeft size={26} />
        </button>

        <div className="customer-location-input-pill">
          <Search size={19} className="text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm đường, phường, quận..."
            autoFocus
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              className="customer-location-clear-btn"
              onClick={() => setQuery('')}
              aria-label="Xóa tìm kiếm"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* 2. Danh sách gợi ý địa điểm: Dropdown overlay ngay dưới header (chuẩn ảnh Yindii) */}
      {query.trim().length > 0 && (
        <div className="customer-location-dropdown-overlay">
          {isSearching ? (
            <div className="customer-location-dropdown-loading">
              <Loader2 size={18} className="animate-spin text-primary" />
              <span>Đang tìm kiếm “{query}”...</span>
            </div>
          ) : locations.length > 0 ? (
            <div className="customer-location-dropdown-list">
              {locations.map((loc) => (
                <button
                  type="button"
                  key={loc.id}
                  className="customer-location-dropdown-item"
                  onClick={() => handleSelectSuggestion(loc)}
                >
                  <MapPin size={20} className="customer-location-item-pin" />
                  <div className="customer-location-item-text">
                    <strong>{loc.name}</strong>
                    {loc.address && loc.address !== loc.name && (
                      <small>{loc.address}</small>
                    )}
                  </div>
                  {loc.distance && <em>{loc.distance}</em>}
                </button>
              ))}
            </div>
          ) : (
            <div className="customer-location-dropdown-empty">
              <MapPin size={22} className="text-muted" />
              <span>Không tìm thấy địa điểm “{query}”</span>
              <small>Hãy thử nhập tên đường, địa danh hoặc bấm chọn trực tiếp trên bản đồ.</small>
            </div>
          )}
        </div>
      )}

      {/* 3. Bản đồ toàn màn hình (Full-screen Mapbox) */}
      <div className="customer-location-fullscreen-map">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {statusMessage && (
          <div className="customer-map-status-overlay">
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* 4. Nút GPS nổi (FAB) ở góc phải dưới bản đồ */}
      <button
        type="button"
        className="customer-location-gps-fab"
        onClick={handleUseCurrentGPS}
        disabled={isLocating}
        title="Dùng vị trí GPS hiện tại"
        aria-label="Dùng vị trí GPS hiện tại"
      >
        {isLocating ? (
          <Loader2 size={21} className="animate-spin" />
        ) : (
          <Crosshair size={22} />
        )}
      </button>

      {/* 5. Thẻ xác nhận vị trí nổi ở đáy màn hình */}
      <div className="customer-location-bottom-card">
        <div className="customer-location-selected-preview">
          <div className="customer-location-preview-icon">
            <MapPin size={20} />
          </div>
          <div className="customer-location-preview-text">
            <small>Vị trí bạn đã chọn</small>
            <strong>{selected}</strong>
          </div>
        </div>

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
