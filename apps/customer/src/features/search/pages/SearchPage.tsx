import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Crosshair,
  List,
  Map as MapIcon,
  Star,
  X,
} from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { MAPBOX_TOKEN, calculateDistanceKm, mapboxService } from '../../../services/mapbox.service';
import { optimizeImageUrl } from '../../../services/customer.service';
import type { Merchant, SurpriseBag } from '../../../shared/types/customer.types';

const formatPrice = (price: number) => {
  if (price >= 1000) {
    return `${price.toLocaleString('vi-VN')}đ`;
  }
  return `$${price.toFixed(2)}`;
};

const formatPickupTime = (start?: string, end?: string) => {
  if (!start && !end) return 'Hôm nay';
  const cleanStart = (start || '17:00').slice(0, 5);
  const cleanEnd = (end || '20:00').slice(0, 5);
  return `Hôm nay ${cleanStart} - ${cleanEnd}`;
};

const formatDistance = (meters?: number) => {
  if (!meters) return '560 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

interface SearchPageProps {
  bags: SurpriseBag[];
  merchants: Merchant[];
  currentLocation?: string;
  coords?: { lat: number; lng: number } | null;
  onBack: () => void;
  onOpenBag: (bag: SurpriseBag) => void;
  onOpenLocation?: () => void;
  onOpenMerchant?: (merchant: Merchant) => void;
  onLocationChange?: (location: string, coords: { lat: number; lng: number }) => void;
  onAdd?: (bag: SurpriseBag) => void;
}

const filterOptions = [
  { id: 'in_stock', label: 'Còn hàng' },
  { id: 'pickup_now', label: 'Nhận ngay' },
];

const DEFAULT_CENTER: [number, number] = [105.8542, 21.0285];

/**
 * Chuẩn hóa tiếng Việt để tìm kiếm thông minh:
 * - Chuyển chữ thường
 * - Khử dấu thanh (bánh mì -> banh mi)
 * - Đồng nhất các biến thể i/y (mì <-> mỳ, ly <-> li, v.v.)
 */
function normalizeVietnamese(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/\bmy\b/g, 'mi') // "mỳ" -> "mi"
    .replace(/banh\s+my/g, 'banh mi')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Thuật toán tìm kiếm thông minh tiếng Việt:
 * 1. Khớp cụm trực tiếp không dấu (vd: 'banh mi' khớp cả 'bánh mì' và 'bánh mỳ')
 * 2. Khớp từng từ khóa (token matching: 'bánh' & 'mì' đều có trong tên/mô tả)
 * 3. Tìm kiếm chéo từ khóa danh mục (bakery, chay, nước, cơm...)
 */
function matchVietnameseQuery(
  poolText: string,
  rawQuery: string,
  categoryTags: (string | undefined)[] = []
): boolean {
  const normQuery = normalizeVietnamese(rawQuery);
  if (!normQuery) return true;

  const normPool = normalizeVietnamese(poolText);

  // 1. Khớp nguyên cụm trực tiếp
  if (normPool.includes(normQuery)) return true;

  // 2. Khớp tất cả các từ trong query
  const tokens = normQuery.split(' ').filter(Boolean);
  if (tokens.length > 0 && tokens.every((tok) => normPool.includes(tok))) {
    return true;
  }

  // 3. Khớp danh mục thực phẩm & từ khóa tương đương
  const isBakery = /banh|mi|bread|cake|croissant|bakery|ngot|pate/.test(normQuery);
  const isVegetarian = /chay|rau|salad|healthy|thuc duong|vegetarian|xanh|nam/.test(normQuery);
  const isBeverage = /nuoc|uong|ca phe|cafe|coffee|tra|ep|smoothie|beverage|juice/.test(normQuery);
  const isMeat = /com|bun|pho|thit|nong|man|meat|nieu|ga|bo|heo/.test(normQuery);

  for (const cat of categoryTags) {
    if (!cat) continue;
    const c = normalizeVietnamese(cat);
    if (isBakery && (c.includes('bakery') || c.includes('banh'))) return true;
    if (isVegetarian && (c.includes('vegetarian') || c.includes('chay') || c.includes('xanh'))) return true;
    if (isBeverage && (c.includes('beverage') || c.includes('uong') || c.includes('nuoc') || c.includes('ca phe'))) return true;
    if (isMeat && (c.includes('meat') || c.includes('nong') || c.includes('man') || c.includes('com'))) return true;
  }

  return false;
}

interface StoreCluster {
  id: string;
  stores: Merchant[];
  centerLng: number;
  centerLat: number;
  count: number;
}

/**
 * Thuật toán gom cụm (Clustering) các cửa hàng theo pixel màn hình
 * Giống hệt phong cách Yindii: các điểm gần nhau hiện số vòng tròn xanh,
 * khi click hoặc zoom in vào sẽ tự động tách rời ("bung ra các logo").
 */
function computeClusters(
  merchantsList: Merchant[],
  map: mapboxgl.Map,
  radiusPx = 46
): StoreCluster[] {
  const valid = merchantsList.filter(
    (m) => typeof m.longitude === 'number' && typeof m.latitude === 'number'
  );

  const projected = valid.map((m) => {
    const p = map.project([m.longitude!, m.latitude!]);
    return {
      merchant: m,
      x: p.x,
      y: p.y,
      lng: m.longitude!,
      lat: m.latitude!,
    };
  });

  const clusters: StoreCluster[] = [];
  const visited = new Set<number>();

  for (let i = 0; i < projected.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);

    const clusterStores = [projected[i].merchant];
    let sumLng = projected[i].lng;
    let sumLat = projected[i].lat;

    for (let j = i + 1; j < projected.length; j++) {
      if (visited.has(j)) continue;
      const dx = projected[i].x - projected[j].x;
      const dy = projected[i].y - projected[j].y;
      if (Math.hypot(dx, dy) <= radiusPx) {
        visited.add(j);
        clusterStores.push(projected[j].merchant);
        sumLng += projected[j].lng;
        sumLat += projected[j].lat;
      }
    }

    clusters.push({
      id: `cluster-${projected[i].merchant.id}-${clusterStores.length}`,
      stores: clusterStores,
      centerLng: sumLng / clusterStores.length,
      centerLat: sumLat / clusterStores.length,
      count: clusterStores.length,
    });
  }

  return clusters;
}

export function SearchPage({
  bags,
  merchants,
  currentLocation,
  coords,
  onBack,
  onOpenBag,
  onOpenLocation,
  onOpenMerchant,
  onLocationChange,
}: SearchPageProps) {
  // Chế độ xem: 'map' (bản đồ full) hoặc 'list' (danh sách món/quán gợi ý)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [clusterModalStores, setClusterModalStores] = useState<Merchant[] | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const storeMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const centerCoords: [number, number] = useMemo(() => {
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      return [coords.lng, coords.lat];
    }
    return DEFAULT_CENTER;
  }, [coords]);

  // Nhóm túi đồ theo cửa hàng để phục vụ tìm kiếm thông minh
  const bagsByMerchant = useMemo(() => {
    const map = new Map<string, SurpriseBag[]>();
    for (const b of bags) {
      const list = map.get(b.merchantId);
      if (list) {
        list.push(b);
      } else {
        map.set(b.merchantId, [b]);
      }
    }
    return map;
  }, [bags]);

  // Lọc danh sách quán theo từ khóa tiếng Việt thông minh và bộ lọc
  const filteredMerchants = useMemo(() => {
    let list = merchants;

    if (query.trim()) {
      list = list.filter((m) => {
        const storeBags = bagsByMerchant.get(m.id) || [];
        const bagInfo = storeBags.map((b) => `${b.name} ${b.description}`).join(' ');
        const categories = storeBags.map((b) => b.category);
        const pool = `${m.name} ${m.address} ${m.description} ${bagInfo}`;
        return matchVietnameseQuery(pool, query, categories);
      });
    }

    if (activeFilter === 'in_stock') {
      const merchantsWithStock = new Set(
        bags.filter((b) => b.quantity > 0).map((b) => b.merchantId)
      );
      list = list.filter((m) => merchantsWithStock.has(m.id));
    } else if (activeFilter === 'pickup_now') {
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const currentMinutes = currentHour * 60 + currentMinute;

      const merchantsAvailableNow = new Set(
        bags
          .filter((b) => {
            if (b.quantity <= 0) return false;
            if (!b.pickupStart || !b.pickupEnd) return true;
            const [sH, sM] = b.pickupStart.split(':').map(Number);
            const [eH, eM] = b.pickupEnd.split(':').map(Number);
            const startMin = (sH || 0) * 60 + (sM || 0);
            const endMin = (eH || 0) * 60 + (eM || 0);
            return currentMinutes >= startMin - 30 && currentMinutes <= endMin;
          })
          .map((b) => b.merchantId)
      );
      list = list.filter((m) => merchantsAvailableNow.has(m.id));
    }

    return list;
  }, [merchants, bags, bagsByMerchant, query, activeFilter]);

  // Tọa độ các quán hiển thị trên bản đồ (100% tọa độ thực tế, không giả lập offset)
  const effectiveMerchants = useMemo(() => {
    if (!filteredMerchants.length) return [];
    const [centerLng, centerLat] = centerCoords;

    return filteredMerchants
      .filter((m) => typeof m.latitude === 'number' && typeof m.longitude === 'number')
      .map((m) => {
        const distKm = calculateDistanceKm([centerLng, centerLat], [m.longitude!, m.latitude!]);
        return {
          ...m,
          distance: Math.round(distKm * 1000),
        };
      })
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [filteredMerchants, centerCoords]);

  // Cửa hàng đang được chọn (nếu có)
  const selectedMerchant = useMemo(
    () => effectiveMerchants.find((m) => m.id === selectedMerchantId) || null,
    [effectiveMerchants, selectedMerchantId]
  );

  const merchantsMap = useMemo(() => {
    const map = new Map<string, Merchant>();
    merchants.forEach((m) => map.set(m.id, m));
    effectiveMerchants.forEach((m) => map.set(m.id, m));
    return map;
  }, [merchants, effectiveMerchants]);

  const selectedStoreBags = useMemo(
    () => (selectedMerchantId ? bags.filter((b) => b.merchantId === selectedMerchantId) : []),
    [bags, selectedMerchantId]
  );

  // Lọc danh sách túi theo từ khóa tiếng Việt thông minh và bộ lọc (cho List View)
  const filteredBags = useMemo(() => {
    let list = bags;

    if (query.trim()) {
      list = list.filter((b) => {
        const merchant = merchantsMap.get(b.merchantId);
        const pool = `${b.name} ${b.description} ${b.merchantName} ${merchant?.name || ''} ${merchant?.address || ''} ${merchant?.description || ''}`;
        return matchVietnameseQuery(pool, query, [b.category]);
      });
    }

    if (activeFilter === 'in_stock') {
      list = list.filter((b) => b.quantity > 0);
    } else if (activeFilter === 'pickup_now') {
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const currentMinutes = currentHour * 60 + currentMinute;

      list = list.filter((b) => {
        if (b.quantity <= 0) return false;
        if (!b.pickupStart || !b.pickupEnd) return true;
        const [sH, sM] = b.pickupStart.split(':').map(Number);
        const [eH, eM] = b.pickupEnd.split(':').map(Number);
        const startMin = (sH || 0) * 60 + (sM || 0);
        const endMin = (eH || 0) * 60 + (eM || 0);
        return currentMinutes >= startMin - 30 && currentMinutes <= endMin;
      });
    }

    // Luôn sắp xếp theo khoảng cách từ gần đến xa
    list = [...list].sort((a, b) => {
      const distA = merchantsMap.get(a.merchantId)?.distance ?? 999999;
      const distB = merchantsMap.get(b.merchantId)?.distance ?? 999999;
      return distA - distB;
    });

    return list;
  }, [bags, merchantsMap, query, activeFilter]);

  const updateUserMarker = useCallback((lngLat: [number, number]) => {
    if (!mapRef.current) return;
    if (!userMarkerRef.current) {
      const userEl = document.createElement('div');
      userEl.className = 'gsf-map-user-pin';
      userEl.style.width = '26px';
      userEl.style.height = '26px';
      userEl.innerHTML = `<span style="font-size:12px;">📍</span>`;
      userMarkerRef.current = new mapboxgl.Marker({ element: userEl })
        .setLngLat(lngLat)
        .addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLngLat(lngLat);
    }
  }, []);

  // Cập nhật và vẽ các Marker / Cluster lên bản đồ
  const renderClusterMarkers = useCallback(() => {
    if (!mapRef.current) return;

    // Xóa marker cũ
    storeMarkersRef.current.forEach((m) => m.remove());
    storeMarkersRef.current = [];

    const clusters = computeClusters(effectiveMerchants, mapRef.current);

    clusters.forEach((cluster) => {
      // TRƯỜNG HỢP 1: Cửa hàng riêng lẻ -> Hiện vòng tròn nhỏ kèm logo cửa hàng (Yindii style)
      if (cluster.count === 1) {
        const store = cluster.stores[0];
        const storeBags = bags.filter((b) => b.merchantId === store.id);

        const el = document.createElement('div');
        el.className = `gsf-yindii-store-marker ${
          selectedMerchantId === store.id ? 'is-active' : ''
        }`;

        const logoUrl = optimizeImageUrl(
          store.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
          100,
          75
        );

        el.innerHTML = `
          <img src="${logoUrl}" alt="${store.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="gsf-yindii-store-fallback" style="display:none;">${store.name.charAt(0).toUpperCase()}</div>
          ${
            storeBags.length > 0
              ? `<span class="gsf-yindii-store-badge">${storeBags.length}</span>`
              : ''
          }
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedMerchantId(store.id);
          mapRef.current?.flyTo({
            center: [store.longitude!, store.latitude!],
            zoom: Math.max(mapRef.current.getZoom(), 15),
            essential: true,
          });
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([store.longitude!, store.latitude!])
          .addTo(mapRef.current!);

        storeMarkersRef.current.push(marker);
      }
      // TRƯỜNG HỢP 2: Các cửa hàng sát nhau -> Hiện vòng tròn xanh lá đánh số (Yindii style)
      else {
        const el = document.createElement('div');
        el.className = 'gsf-yindii-cluster-marker';
        const size = Math.min(38 + Math.floor(cluster.count / 3) * 3, 48);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.innerHTML = `<span>${cluster.count}</span>`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const currentZoom = mapRef.current?.getZoom() || 13;
          if (currentZoom < 15.5) {
            // Khi ấn vào: Phóng to lướt vào cụm để BUNG RA CÁC LOGO!
            mapRef.current?.flyTo({
              center: [cluster.centerLng, cluster.centerLat],
              zoom: currentZoom + 2.5,
              duration: 600,
              essential: true,
            });
          } else {
            // Nếu đã ở mức zoom tối đa mà các quán vẫn sát nhau: mở danh sách quán tại vị trí này
            setClusterModalStores(cluster.stores);
          }
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([cluster.centerLng, cluster.centerLat])
          .addTo(mapRef.current!);

        storeMarkersRef.current.push(marker);
      }
    });
  }, [effectiveMerchants, bags, selectedMerchantId]);

  // 1. Khởi tạo Mapbox Map CHỈ 1 LẦN DUY NHẤT
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: centerCoords,
      zoom: 13.5,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      updateUserMarker(centerCoords);
      renderClusterMarkers();
    });

    // Khi người dùng di chuyển hoặc zoom bản đồ xong -> tự động tính toán lại cụm và bung logo
    map.on('moveend', () => {
      renderClusterMarkers();
    });

    // Click vào khoảng trống bản đồ -> bỏ chọn quán đang mở
    map.on('click', () => {
      setSelectedMerchantId(null);
      setClusterModalStores(null);
    });

    return () => {
      storeMarkersRef.current.forEach((m) => m.remove());
      storeMarkersRef.current = [];
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Di chuyển camera khi centerCoords thay đổi
  useEffect(() => {
    if (!mapRef.current) return;
    updateUserMarker(centerCoords);
    mapRef.current.flyTo({
      center: centerCoords,
      zoom: 14,
      essential: true,
    });
  }, [centerCoords[0], centerCoords[1], updateUserMarker]);

  // 3. Cập nhật lại markers khi danh sách cửa hàng/túi hoặc quán đang chọn thay đổi
  useEffect(() => {
    renderClusterMarkers();
  }, [renderClusterMarkers]);

  // Khi chuyển giữa map và list view, resize lại map ngay khi hiển thị
  useEffect(() => {
    if (viewMode === 'map' && mapRef.current) {
      const frameId = requestAnimationFrame(() => {
        mapRef.current?.resize();
        renderClusterMarkers();
      });
      const timerId = setTimeout(() => {
        mapRef.current?.resize();
        renderClusterMarkers();
      }, 120);
      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timerId);
      };
    }
  }, [viewMode, renderClusterMarkers]);

  // Xử lý nút Định vị lại GPS
  const handleRecenterGPS = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: centerCoords,
      zoom: 15,
      essential: true,
    });
    updateUserMarker(centerCoords);

    if (navigator.geolocation && onLocationChange) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const rev = await mapboxService.reverseGeocode(lng, lat);
          onLocationChange(rev.address || rev.name, { lat, lng });
        } catch {
          onLocationChange(`Vị trí hiện tại (${lat.toFixed(4)}, ${lng.toFixed(4)})`, { lat, lng });
        }
      });
    }
  };

  return (
    <div className={`customer-yindii-search-container ${viewMode === 'map' ? 'is-map-view' : 'is-list-view'}`}>
      {/* 1. Header xanh phong cách Yindii với thanh tìm kiếm pill trắng */}
      <div className="customer-yindii-search-header">
        <div className="customer-yindii-search-pill">
          <button
            type="button"
            className="customer-yindii-pill-back"
            onClick={onBack}
            aria-label="Quay lại"
          >
            <ArrowLeft size={21} />
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm món ăn hoặc quán gần bạn..."
            className="customer-yindii-pill-input"
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              className="customer-yindii-pill-clear"
              onClick={() => setQuery('')}
              aria-label="Xóa tìm kiếm"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Thanh lọc trắng Yindii: [Map view nếu ở List view] + Chips */}
      <div className="customer-yindii-filter-bar">
        <div className="customer-yindii-filter-scroll">
          {/* Trong List View: Item đầu tiên là button 'Map view' màu xanh (Yindii style) */}
          {viewMode === 'list' && (
            <button
              type="button"
              className="customer-yindii-mapview-pill-btn"
              onClick={() => {
                setSelectedMerchantId(null);
                setViewMode('map');
              }}
              aria-label="Chuyển sang Map view"
            >
              <MapIcon size={16} />
              <span>Map view</span>
            </button>
          )}

          {/* Các nút Filter: Tất cả, Gần nhất, Giảm nhiều... */}
          {filterOptions.map((opt) => {
            const isSelected = activeFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`customer-yindii-chip-btn ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setActiveFilter(isSelected ? 'all' : opt.id)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* VÙNG NỘI DUNG CHÍNH (Chứa 2 view map/list) */}
      <div className="customer-search-content-area">
        {/* ================= GIAO DIỆN BẢN ĐỒ (MAP VIEW) ================= */}
        <div
          className="customer-map-fullscreen"
          style={{ display: viewMode === 'map' ? 'block' : 'none' }}
        >
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Floating List view button trên bản đồ góc trên bên phải (Yindii style) */}
          <button
            type="button"
            className="customer-floating-listview-btn"
            onClick={() => {
              setSelectedMerchantId(null);
              setViewMode('list');
            }}
            aria-label="Chuyển sang List view"
          >
            <List size={16} />
            <span>List view</span>
          </button>

          {/* Nút Recenter GPS nổi ở góc dưới */}
          <button
            type="button"
            className={`customer-map-recenter-btn ${selectedMerchant ? 'is-sheet-open' : ''}`}
            onClick={handleRecenterGPS}
            title="Về vị trí hiện tại của tôi"
          >
            <Crosshair size={20} />
          </button>

          {/* Thanh đề xuất ở dưới (Bottom Suggestion Carousel phong cách Yindii) */}
          {!selectedMerchant && (
            <div className="customer-map-bottom-container">
              {/* Header thanh đề xuất: Vị trí hiện tại + Đổi vị trí */}
              <div
                className="customer-map-banner"
                onClick={onOpenLocation}
                role="button"
                tabIndex={0}
              >
                <div className="customer-map-banner-info">
                  <strong>📍 {currentLocation || 'Khu vực của bạn'}</strong>
                  <small>{filteredBags.length} món & túi cứu trợ quanh đây</small>
                </div>
                <div className="customer-map-banner-action">
                  <span>Đổi vị trí</span>
                  <ChevronRight size={15} />
                </div>
              </div>

              {/* Danh sách thẻ món đề xuất cuộn ngang */}
              {filteredBags.length > 0 && (
                <div className="customer-map-carousel-track">
                  {filteredBags.slice(0, 10).map((bag) => {
                    const store = merchantsMap.get(bag.merchantId);
                    const discountPct =
                      bag.originalPrice > bag.discountPrice
                        ? Math.round(
                            ((bag.originalPrice - bag.discountPrice) / bag.originalPrice) * 100
                          )
                        : 50;
                    const rating = store?.rating ?? bag.rating ?? 0;
                    const distanceText = store?.distance
                      ? formatDistance(store.distance)
                      : 'Gần đây';

                    return (
                      <div
                        key={bag.id}
                        className="customer-map-carousel-card"
                        onClick={() => onOpenBag(bag)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="customer-map-carousel-thumb-wrap">
                          <img
                            src={
                              bag.imageUrl ||
                              'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600'
                            }
                            alt={bag.name}
                            className="customer-map-carousel-thumb"
                            loading="lazy"
                          />
                          {discountPct > 0 && (
                            <span className="customer-map-carousel-discount">
                              -{discountPct}%
                            </span>
                          )}
                        </div>

                        <div className="customer-map-carousel-details">
                          <div className="customer-map-carousel-store">
                            {bag.merchantName || store?.name || 'Cửa hàng'}
                          </div>
                          <div className="customer-map-carousel-name">{bag.name}</div>
                          <div className="customer-map-carousel-meta">
                            <span>{distanceText}</span>
                            {rating > 0 && (
                              <>
                                <span>•</span>
                                <span className="customer-map-carousel-rating">
                                  ★ {rating.toFixed(1)}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="customer-map-carousel-price">
                            <strong>{formatPrice(bag.discountPrice)}</strong>
                            {bag.originalPrice > bag.discountPrice && (
                              <del>{formatPrice(bag.originalPrice)}</del>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Card xem nhanh quán khi ấn vào 1 Logo cửa hàng */}
          {selectedMerchant && (
            <div className="customer-map-store-sheet">
              <div className="customer-store-sheet-top">
                <img
                  src={
                    selectedMerchant.logo ||
                    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'
                  }
                  alt={selectedMerchant.name}
                  className="customer-store-sheet-logo"
                />
                <div className="customer-store-sheet-info">
                  <h3>{selectedMerchant.name}</h3>
                  <p>{selectedMerchant.address}</p>
                  <div className="customer-store-sheet-meta">
                    <span className="customer-store-sheet-rating">
                      {selectedMerchant.totalRatings > 0 ? `⭐ ${selectedMerchant.rating.toFixed(1)} (${selectedMerchant.totalRatings})` : '⭐ Mới'}
                    </span>
                    <span className="customer-store-sheet-dist">
                      {selectedMerchant.distance
                        ? `Cách ~${(selectedMerchant.distance / 1000).toFixed(1)} km`
                        : 'Gần đây'}
                    </span>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                      • Còn {selectedStoreBags.length} túi
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="customer-store-sheet-close"
                  onClick={() => setSelectedMerchantId(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <button
                type="button"
                className="customer-store-sheet-btn"
                onClick={() => onOpenMerchant?.(selectedMerchant)}
              >
                <span>Xem quán & danh sách túi</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Modal bung danh sách các quán trong cụm (khi zoom cao nhất vẫn sát nhau) */}
          {clusterModalStores && (
            <div
              className="customer-cluster-modal-backdrop"
              onClick={() => setClusterModalStores(null)}
            >
              <div
                className="customer-cluster-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="customer-cluster-modal-header">
                  <h4>{clusterModalStores.length} quán ăn tại khu vực này</h4>
                  <button
                    type="button"
                    className="customer-store-sheet-close"
                    onClick={() => setClusterModalStores(null)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="customer-cluster-list">
                  {clusterModalStores.map((store) => {
                    const storeBags = bags.filter((b) => b.merchantId === store.id);
                    return (
                      <div
                        key={store.id}
                        className="customer-cluster-item"
                        onClick={() => {
                          setClusterModalStores(null);
                          setSelectedMerchantId(store.id);
                        }}
                      >
                        <img
                          src={
                            store.logo ||
                            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'
                          }
                          alt={store.name}
                          style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>
                            {store.name}
                          </strong>
                          <small
                            style={{
                              fontSize: 11,
                              color: '#64748b',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {store.address}
                          </small>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)' }}>
                          {storeBags.length} túi
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      {/* ================= GIAO DIỆN DANH SÁCH (LIST VIEW YINDII STYLE) ================= */}
      <div
        className="customer-yindii-list-scroll-area"
        style={{
          display: viewMode === 'list' ? 'block' : 'none',
        }}
      >
        {/* Header hiển thị số lượng túi */}
        <div className="customer-yindii-list-count">
          <span>{filteredBags.length} món & túi cứu trợ quanh bạn</span>
        </div>

          {filteredBags.length > 0 ? (
            <div className="customer-yindii-list-container">
              {filteredBags.map((bag) => {
                const store = merchantsMap.get(bag.merchantId);
                const discountPct =
                  bag.originalPrice > bag.discountPrice
                    ? Math.round(
                        ((bag.originalPrice - bag.discountPrice) / bag.originalPrice) * 100
                      )
                    : 50;

                const rating = store?.rating ?? bag.rating ?? 0;
                const totalRatings = store?.totalRatings ?? 0;
                const distanceText = store?.distance
                  ? formatDistance(store.distance)
                  : '560 m';

                return (
                  <button
                    type="button"
                    key={bag.id}
                    className="customer-yindii-item-card"
                    onClick={() => onOpenBag(bag)}
                  >
                    {/* Ảnh món ăn vuông bo tròn bên trái với badge giảm giá */}
                    <div className="customer-yindii-item-thumb-wrapper">
                      <img
                        src={
                          bag.imageUrl ||
                          'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600'
                        }
                        alt={bag.name}
                        className="customer-yindii-item-thumb"
                        loading="lazy"
                      />
                      {discountPct > 0 && (
                        <div className="customer-yindii-thumb-discount-badge">
                          -{discountPct}%
                        </div>
                      )}
                      {bag.quantity <= 0 && (
                        <div className="customer-yindii-sold-out-badge">Hết hàng</div>
                      )}
                    </div>

                    {/* Nội dung thông tin món và quán bên phải */}
                    <div className="customer-yindii-item-content">
                      <div className="customer-yindii-item-top">
                        <h3 className="customer-yindii-item-store" title={bag.merchantName || store?.name}>
                          {bag.merchantName || store?.name || 'Cửa hàng đối tác'}
                        </h3>
                        <p className="customer-yindii-item-bag" title={bag.name}>
                          {bag.name}
                        </p>
                      </div>

                      <div className="customer-yindii-item-bottom">
                        <div className="customer-yindii-item-pickup">
                          <Clock size={12} />
                          <span>{formatPickupTime(bag.pickupStart, bag.pickupEnd)}</span>
                        </div>

                        <div className="customer-yindii-item-bottom-row">
                          <div className="customer-yindii-item-meta">
                            {totalRatings > 0 ? (
                              <>
                                <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                <span className="customer-yindii-item-rating">
                                  {rating.toFixed(1)} ({totalRatings})
                                </span>
                              </>
                            ) : (
                              <span className="customer-yindii-item-rating is-new">
                                Mới
                              </span>
                            )}
                            <span className="customer-yindii-item-dot">•</span>
                            <span>{distanceText}</span>
                          </div>

                          <div className="customer-yindii-item-pricing">
                            {bag.originalPrice > bag.discountPrice && (
                              <span className="customer-yindii-item-original-price">
                                {formatPrice(bag.originalPrice)}
                              </span>
                            )}
                            <span className="customer-yindii-item-discount-price">
                              {formatPrice(bag.discountPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Không tìm thấy món ăn phù hợp"
              description="Thử tìm bằng từ khoá khác"
            />
          )}
        </div>
      </div>
    </div>
  );
}
