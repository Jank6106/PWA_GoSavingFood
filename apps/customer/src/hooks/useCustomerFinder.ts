import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { SurpriseBag, Merchant } from '../shared/types/customer.types';
import type { FinderResponse } from '../shared/types/finder.types';
import {
  searchCustomerCatalog,
  filterCustomerCatalog,
  filterCatalogWithConstraints,
  isCustomerFinderApiEnabled,
} from '../services/customer-finder.service';

export interface UseCustomerFinderProps {
  bags: SurpriseBag[];
  merchants: Merchant[];
  coords?: { lat: number; lng: number } | null;
}

export interface UseCustomerFinderReturn {
  apiEnabled: boolean;
  query: string;
  setQuery: (q: string) => void;
  response: FinderResponse | null;
  isLoading: boolean;
  error: string | null;
  search: (queryOverride?: string) => Promise<void>;
  searchLocal: (queryOverride?: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook điều phối tìm kiếm và lọc túi bất ngờ theo ngôn ngữ tự nhiên
 * Hỗ trợ chế độ AI hoặc Bộ lọc cục bộ, tự động hủy request cũ và cập nhật
 * tính khả dụng khi danh mục dữ liệu thay đổi mà không gọi lại mạng.
 */
export function useCustomerFinder({
  bags,
  merchants,
  coords,
}: UseCustomerFinderProps): UseCustomerFinderReturn {
  const [query, setQuery] = useState<string>('');
  const [rawResponse, setRawResponse] = useState<FinderResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState<number>(0);

  const activeAbortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Lưu references dữ liệu mới nhất trong effect để tránh lỗi accessing refs during render
  const bagsRef = useRef<SurpriseBag[]>(bags);
  const merchantsRef = useRef<Merchant[]>(merchants);
  const coordsRef = useRef<{ lat: number; lng: number } | null | undefined>(coords);

  useEffect(() => {
    bagsRef.current = bags;
    merchantsRef.current = merchants;
    coordsRef.current = coords;
  }, [bags, merchants, coords]);

  // Cleanup khi unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
    };
  }, []);

  // Revalidate theo giờ khi focus/visibility hoặc bounded interval (30s) để loại bỏ món hết hạn
  useEffect(() => {
    const handleRevalidate = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      setTick((t) => t + 1);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleRevalidate);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleRevalidate);
    }
    const intervalId = setInterval(handleRevalidate, 30000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleRevalidate);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleRevalidate);
      }
      clearInterval(intervalId);
    };
  }, []);

  /**
   * Thực hiện tìm kiếm (mặc định qua AI nếu được kích hoạt, hoặc fallback sang local)
   * Luôn huỷ request đang chờ trước đó để tránh race-conditions.
   * Khi resolve, re-evaluate lại với bagsRef/merchantsRef mới nhất để tránh đề xuất stock cũ.
   */
  const search = useCallback(
    async (queryOverride?: string): Promise<void> => {
      const targetQuery = queryOverride !== undefined ? queryOverride : query;

      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      const controller = new AbortController();
      activeAbortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const res = await searchCustomerCatalog(
          {
            query: targetQuery,
            bags: bagsRef.current,
            merchants: merchantsRef.current,
            coords: coordsRef.current,
            now: new Date(),
          },
          { signal: controller.signal }
        );

        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        // Re-run với bagsRef/merchantsRef/coordsRef mới nhất phòng trường hợp catalog đổi trong lúc await
        const fresh = filterCatalogWithConstraints(
          res.constraints,
          {
            query: targetQuery,
            bags: bagsRef.current,
            merchants: merchantsRef.current,
            coords: coordsRef.current,
            now: new Date(),
          },
          res.mode,
          res.warnings
        );

        setRawResponse({ ...fresh, model: res.model });
        setIsLoading(false);
      } catch (err: unknown) {
        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tìm kiếm';
        setError(message);
        setIsLoading(false);
      } finally {
        if (activeAbortRef.current === controller) {
          activeAbortRef.current = null;
        }
      }
    },
    [query]
  );

  /**
   * Tìm kiếm cục bộ thuần (Bộ lọc) không qua mạng, phục vụ fallback UI khi AI lỗi
   */
  const searchLocal = useCallback(
    async (queryOverride?: string): Promise<void> => {
      const targetQuery = queryOverride !== undefined ? queryOverride : query;

      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      const controller = new AbortController();
      activeAbortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const res = filterCustomerCatalog({
          query: targetQuery,
          bags: bagsRef.current,
          merchants: merchantsRef.current,
          coords: coordsRef.current,
          now: new Date(),
        });

        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        setRawResponse(res);
        setIsLoading(false);
      } catch (err: unknown) {
        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lọc danh mục';
        setError(message);
        setIsLoading(false);
      } finally {
        if (activeAbortRef.current === controller) {
          activeAbortRef.current = null;
        }
      }
    },
    [query]
  );

  /**
   * Đặt lại trạng thái ban đầu
   */
  const reset = useCallback((): void => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    setQuery('');
    setRawResponse(null);
    setIsLoading(false);
    setError(null);
  }, []);

  /**
   * Kết quả phản hồi hiển thị: tự động đồng bộ khi bags, merchants, coords hoặc tick thay đổi
   * Không gọi setState trong effect giúp loại bỏ nguy cơ cascading render.
   */
  const response = useMemo<FinderResponse | null>(() => {
    if (!rawResponse) return null;
    void tick; // Tham chiếu tick để recompute khi tab focus hoặc interval 30s
    return { ...filterCatalogWithConstraints(
      rawResponse.constraints,
      {
        query,
        bags,
        merchants,
        coords,
        now: new Date(),
      },
      rawResponse.mode,
      rawResponse.warnings
    ), model: rawResponse.model };
  }, [rawResponse, bags, merchants, coords, query, tick]);

  return {
    apiEnabled: isCustomerFinderApiEnabled(),
    query,
    setQuery,
    response,
    isLoading,
    error,
    search,
    searchLocal,
    reset,
  };
}
