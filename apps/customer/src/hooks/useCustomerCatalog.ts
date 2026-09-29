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

const emptyCatalog: CatalogState = {
  banners: [],
  categories: [],
  brands: [],
  merchants: [],
  bags: [],
};

export function useCustomerCatalog() {
  const [catalog, setCatalog] = useState<CatalogState>(emptyCatalog);
  const [isLoading, setIsLoading] = useState(true);
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
      const data = await customerService.getHome();
      setCatalog(data);
      setError(null);
    } catch {
      if (isInitial) {
        setError('Không thể tải dữ liệu khám phá.');
      }
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchCatalog(true);

    // 1. Đồng bộ khi user quay lại tab Customer app
    const handleFocus = () => {
      void fetchCatalog(false);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchCatalog(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // 2. Đồng bộ realtime từ Supabase khi có thay đổi trên bảng surprise_bags
    const channel = supabase
      .channel('catalog-surprise-bags')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'surprise_bags' },
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

