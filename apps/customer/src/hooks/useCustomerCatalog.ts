import { useEffect, useMemo, useState } from 'react';
import { customerService } from '../services/customer.service';
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

  useEffect(() => {
    let active = true;
    customerService
      .getHome()
      .then((data) => active && setCatalog(data))
      .catch(() => active && setError('Không thể tải dữ liệu khám phá.'))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({ ...catalog, isLoading, error }),
    [catalog, error, isLoading]
  );
}
