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

const CATALOG_CACHE_KEY = 'gsf_customer_catalog_cache_v3';

function getInitialCatalog(): CatalogState {
  try {
    // Xóa sạch cache cũ nếu chứa mock data cũ
    localStorage.removeItem('gsf_customer_catalog_cache');
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.bags)) {
        parsed.bags = parsed.bags.filter((b: any) => !b.id?.startsWith('bag-hn-'));
        parsed.merchants = (parsed.merchants || []).filter((m: any) => !m.id?.startsWith('store-hn-'));
        return parsed;
      }
    }
  } catch {}
  return customerService.getStaticHome();
}

export function useCustomerCatalog(coords?: { lat: number; lng: number }) {
  const [catalog, setCatalog] = useState<CatalogState>(() => getInitialCatalog());
  const [isLoading, setIsLoading] = useState(() => getInitialCatalog().bags.length === 0);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const fetchCatalog = useCallback(async (isInitial = false) => {
    // Tránh duplicate API calls quá dồn dập
    const now = Date.now();
    if (!isInitial && now - lastFetchTimeRef.current < 400) {
      return;
    }
    lastFetchTimeRef.current = now;

    try {
      const data = await customerService.getHome(coords);
      setCatalog(data);
      try {
        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data));
      } catch {}
      setError(null);
    } catch {
      if (isInitial && catalog.bags.length === 0) {
        setError('Không thể tải dữ liệu khám phá.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [coords?.lat, coords?.lng, catalog.bags.length]);

  useEffect(() => {
    void fetchCatalog(true);

    // 1. Đồng bộ khi user quay lại tab Customer app (sau khi chuyển tab > 3s)
    const handleFocus = () => {
      if (Date.now() - lastFetchTimeRef.current > 3000) {
        lastFetchTimeRef.current = 0;
        void fetchCatalog(false);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchTimeRef.current > 3000) {
        lastFetchTimeRef.current = 0;
        void fetchCatalog(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // 2. Đồng bộ realtime từ Supabase khi có thay đổi trên bảng surprise_bags hoặc stores
    const channel = supabase
      .channel('catalog-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'surprise_bags' },
        (payload: any) => {
          // Xử lý tức thì 0ms trên giao diện khi túi bị xóa hoặc gỡ kệ
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

          // Đồng bộ nền toàn bộ danh mục ngay lập tức
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
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      void supabase.removeChannel(channel);
    };
  }, [fetchCatalog]);

  return useMemo(
    () => ({ ...catalog, isLoading, error, refetch: () => fetchCatalog(false) }),
    [catalog, error, isLoading, fetchCatalog]
  );
}

