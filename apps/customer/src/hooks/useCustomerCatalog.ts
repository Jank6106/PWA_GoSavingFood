import type { StoreRow } from '../shared/types/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { customerService } from '../services/customer.service';
import { supabase } from '../services/supabase';
import { isBagVisibleOnMarket } from '../shared/utils/bagTiming';
import type { Banner, Brand, Category, Merchant, SurpriseBag } from '../shared/types/customer.types';

interface CatalogState {
  banners: Banner[];
  categories: Category[];
  brands: Brand[];
  merchants: Merchant[];
  bags: SurpriseBag[];
}

const CATALOG_CACHE_KEY = 'gsf_customer_catalog_cache_v5';
const CATALOG_TIMESTAMP_KEY = 'gsf_customer_catalog_cached_at_v5';
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
          merchants: (parsed.merchants || []).filter((m: Merchant) => !m.id?.startsWith('store-hn-')),
          bags: (parsed.bags || []).filter((b: SurpriseBag) => !b.id?.startsWith('bag-hn-') && isBagVisibleOnMarket(b)),
        };
      }
    }
  } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
  const staticHome = customerService.getStaticHome();
  return {
    ...staticHome,
    bags: staticHome.bags.filter(isBagVisibleOnMarket),
  };
}

export function useCustomerCatalog(coords?: { lat: number; lng: number }) {
  const [catalog, setCatalog] = useState<CatalogState>(getInitialCatalog);
  const catalogRef = useRef<CatalogState>(catalog);
  useEffect(() => { catalogRef.current = catalog; }, [catalog]);

  const [isLoading, setIsLoading] = useState(() => {
    const init = getInitialCatalog();
    return init.merchants.length === 0 && init.bags.length === 0;
  });
  const [error, setError] = useState<string | null>(null);

  const lastFetchTimeRef = useRef<number>(0);
  const prevCoordsRef = useRef<{ lat: number; lng: number } | undefined>(undefined);

  const coordsRef = useRef(coords);
  useEffect(() => { coordsRef.current = coords; }, [coords]);
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
      } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
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
      const data = await customerService.getHome(coordsRef.current);
      setCatalog(data);
      try {
        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CATALOG_TIMESTAMP_KEY, String(Date.now()));
      } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
      setError(null);
    } catch {
      if (!hasData) {
        setError('Không thể tải dữ liệu khám phá.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  }, [coords, fetchCatalog]);

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
        (payload) => {
          if (payload.eventType === 'DELETE' && payload.old?.id) {
            setCatalog((current) => {
              const updated = {
                ...current,
                bags: current.bags.filter((b) => b.id !== payload.old.id),
              };
              try {
                localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(updated));
              } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
              return updated;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            if (
              payload.new.is_available === false ||
              payload.new.deleted_at != null
            ) {
              setCatalog((current) => {
                const updated = {
                  ...current,
                  bags: current.bags.filter((b) => b.id !== payload.new.id),
                };
                try {
                  localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(updated));
                } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
                return updated;
              });
            } else if (payload.new.quantity != null) {
              // Cập nhật số lượng túi thay vì xóa khỏi danh mục khi số lượng về 0
              setCatalog((current) => {
                const updated = {
                  ...current,
                  bags: current.bags.map((b) =>
                    b.id === payload.new.id
                      ? {
                          ...b,
                          quantity: Number(payload.new.quantity),
                          isAvailable: (payload.new.is_available as boolean | undefined) ?? b.isAvailable,
                        }
                      : b
                  ),
                };
                try {
                  localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(updated));
                } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
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
        (payload) => {
          const nextStore = payload.new as Partial<StoreRow>;
          if (nextStore && nextStore.id) {
            setCatalog((current) => {
              const nextIsOpen = (nextStore.is_open as boolean | undefined) ?? true;
              const updatedMerchants = current.merchants.map((m) =>
                m.id === nextStore.id ? { ...m, isOpen: nextIsOpen } : m
              );
              const nextCatalog = { ...current, merchants: updatedMerchants };
              try {
                localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(nextCatalog));
              } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
              return nextCatalog;
            });
          }
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
