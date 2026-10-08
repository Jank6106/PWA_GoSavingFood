import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { customerService } from '../services/customer.service';
import { supabase } from '../services/supabase';
import type { Banner, Brand, Category, Merchant, SurpriseBag } from '../shared/types/customer.types';

interface CatalogState {
  banners: Banner[];
  categories: Category[];
  brands: Brand[];
  merchants: Merchant[];
  bags: SurpriseBag[];
}

const CATALOG_CACHE_KEY = 'gsf_customer_catalog_cache_v4';
const CATALOG_TIMESTAMP_KEY = 'gsf_customer_catalog_cached_at_v4';
const CATALOG_TTL_MS = 3 * 60 * 1000; // 3 phút

function getInitialCatalog(): CatalogState {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (Array.isArray(parsed.merchants) || Array.isArray(parsed.bags))) {
        return {
          banners: parsed.banners?.length ? parsed.banners : customerService.getStaticHome().banners,
          categories: parsed.categories?.length ? parsed.categories : customerService.getStaticHome().categories,
          brands: parsed.brands || [],
          merchants: (parsed.merchants || []).filter((m: any) => !m.id?.startsWith('store-hn-')),
          bags: (parsed.bags || []).filter((b: any) => !b.id?.startsWith('bag-hn-')),
        };
      }
    }
  } catch {}
  return customerService.getStaticHome();
}

export function useCustomerCatalog(coords?: { lat: number; lng: number }) {
  const [catalog, setCatalog] = useState<CatalogState>(getInitialCatalog);
  const catalogRef = useRef<CatalogState>(catalog);
  catalogRef.current = catalog;

  const [isLoading, setIsLoading] = useState(() => {
    const init = getInitialCatalog();
    return init.merchants.length === 0 && init.bags.length === 0;
  });
  const [error, setError] = useState<string | null>(null);

  const lastFetchTimeRef = useRef<number>(0);
  const prevCoordsRef = useRef<{ lat: number; lng: number } | undefined>(undefined);

  const fetchCatalog = useCallback(async (isInitial = false) => {
    const now = Date.now();
    const hasData = catalogRef.current.merchants.length > 0 || catalogRef.current.bags.length > 0;

    // 1. Áp dụng TTL: Nếu vừa mở app và cache còn mới trong vòng 3 phút thì không fetch lại ngay
    if (isInitial && hasData) {
      try {
        const cachedAt = Number(localStorage.getItem(CATALOG_TIMESTAMP_KEY) || '0');
        if (now - cachedAt < CATALOG_TTL_MS) {
          setIsLoading(false);
          return;
        }
      } catch {}
    }

    // Tránh duplicate API calls quá dồn dập
    if (!isInitial && now - lastFetchTimeRef.current < 400) {
      return;
    }
    lastFetchTimeRef.current = now;

    // Nếu đã có data thì không bật lại skeleton để tránh giật màn hình (Stale-While-Revalidate)
    if (!hasData) {
      setIsLoading(true);
    }

    try {
      const data = await customerService.getHome(coords);
      setCatalog(data);
      try {
        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CATALOG_TIMESTAMP_KEY, String(Date.now()));
      } catch {}
      setError(null);
    } catch {
      if (!hasData) {
        setError('Không thể tải dữ liệu khám phá.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [coords?.lat, coords?.lng]);

  // Kích hoạt nạp dữ liệu ban đầu hoặc khi tọa độ thay đổi đáng kể (> 500m)
  useEffect(() => {
    const prev = prevCoordsRef.current;
    if (prev && coords) {
      const latDiff = Math.abs(prev.lat - coords.lat);
      const lngDiff = Math.abs(prev.lng - coords.lng);
      // Nếu dịch chuyển nhỏ hơn ~500m thì không cần refetch lại toàn bộ
      if (latDiff < 0.005 && lngDiff < 0.005) {
        return;
      }
    }
    prevCoordsRef.current = coords;
    void fetchCatalog(true);
  }, [coords?.lat, coords?.lng, fetchCatalog]);

  // Đồng bộ khi user quay lại tab Customer app (sau khi chuyển tab > 5s)
  useEffect(() => {
    const handleFocus = () => {
      if (Date.now() - lastFetchTimeRef.current > 5000) {
        void fetchCatalog(false);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchTimeRef.current > 5000) {
        void fetchCatalog(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchCatalog]);

  // Đồng bộ Realtime từ Supabase tách biệt (chỉ subscribe 1 lần duy nhất)
  useEffect(() => {
    const channel = supabase
      .channel('catalog-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'surprise_bags' },
        (payload: any) => {
          if (payload.eventType === 'DELETE' && payload.old?.id) {
            setCatalog((current) => {
              const updated = {
                ...current,
                bags: current.bags.filter((b) => b.id !== payload.old.id),
              };
              try {
                localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            if (payload.new.is_available === false || payload.new.deleted_at != null) {
              setCatalog((current) => {
                const updated = {
                  ...current,
                  bags: current.bags.filter((b) => b.id !== payload.new.id),
                };
                try {
                  localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }
          }
          // Đồng bộ nền lại để có thông tin chi tiết nhất
          lastFetchTimeRef.current = 0;
          void fetchCatalog(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stores' },
        () => {
          lastFetchTimeRef.current = 0;
          void fetchCatalog(false);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchCatalog]);

  return useMemo(
    () => ({ ...catalog, isLoading, error, refetch: () => fetchCatalog(false) }),
    [catalog, error, isLoading, fetchCatalog]
  );
}
