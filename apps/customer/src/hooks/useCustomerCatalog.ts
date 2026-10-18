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

const CATALOG_CACHE_KEY = 'gsf_customer_catalog_cache';

function getInitialCatalog(coords?: { lat: number; lng: number }): CatalogState {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.bags) && parsed.bags.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return customerService.getStaticHome(coords);
}

export function useCustomerCatalog(coords?: { lat: number; lng: number }) {
  const [catalog, setCatalog] = useState<CatalogState>(() => getInitialCatalog(coords));
  const [isLoading, setIsLoading] = useState(() => getInitialCatalog(coords).bags.length === 0);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const fetchCatalog = useCallback(async (isInitial = false) => {
    // Tránh duplicate API calls liên tiếp trong 1.5 giây
    const now = Date.now();
    if (!isInitial && now - lastFetchTimeRef.current < 1500) {
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

    // 1. Đồng bộ khi user quay lại tab Customer app (chỉ re-fetch khi đã rời tab hơn 3 phút)
    const handleFocus = () => {
      if (Date.now() - lastFetchTimeRef.current > 180000) {
        void fetchCatalog(false);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchTimeRef.current > 180000) {
        void fetchCatalog(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // 2. Đồng bộ realtime từ Supabase khi có thay đổi trên bảng surprise_bags, stores hoặc banners
    const channel = supabase
      .channel('catalog-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'surprise_bags' },
        () => {
          void fetchCatalog(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stores' },
        () => {
          void fetchCatalog(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banners' },
        () => {
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

