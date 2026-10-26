import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  ChevronsDown,
  Gift,
  MapPin,
  Search,
} from 'lucide-react';
import { ErrorState, Skeleton } from '@gosavingfood/ui';
import { BagCard, MerchantCard, SectionHeading } from '../../../shared/components';
import { isBagVisibleOnMarket } from '../../../shared/utils/bagTiming';
import { BrandMarquee, CategoryBar, HomeBanner } from '../components';
import type { Banner, Brand, Category, FoodCategory, Merchant, SurpriseBag } from '../../../shared/types/customer.types';

interface HomePageProps {
  banners: Banner[];
  categories: Category[];
  brands: Brand[];
  merchants: Merchant[];
  bags: SurpriseBag[];
  isLoading: boolean;
  error: string | null;
  location: string;
  onSearch: () => void;
  onLocation: () => void;
  onOpenBag: (bag: SurpriseBag) => void;
  onOpenMerchant: (merchant: Merchant) => void;
  onOpenBrand: (brand: Brand) => void;
  onAdd: (bag: SurpriseBag) => void;
  onViewAll: () => void;
}

export function HomePage({
  banners,
  categories,
  brands,
  merchants,
  bags,
  isLoading,
  error,
  location,
  onSearch,
  onLocation,
  onOpenBag,
  onOpenMerchant,
  onOpenBrand,
  onAdd,
  onViewAll,
}: HomePageProps) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [category, setCategory] = useState<string>('all');

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(
      () => setBannerIndex((current) => (current + 1) % banners.length),
      4000
    );
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const visibleBags = useMemo(
    () => bags.filter((bag) => isBagVisibleOnMarket(bag) && (category === 'all' || bag.category === category)),
    [bags, category]
  );

  const [visibleMerchantCount, setVisibleMerchantCount] = useState(10);

  const sortedMerchants = useMemo(() => {
    const getMeters = (d?: number) => {
      if (d === undefined || d === null) return 999999;
      return d < 50 ? d * 1000 : d;
    };
    return [...merchants].sort((a, b) => getMeters(a.distance) - getMeters(b.distance));
  }, [merchants]);

  const displayedMerchants = useMemo(
    () => sortedMerchants.slice(0, visibleMerchantCount),
    [sortedMerchants, visibleMerchantCount]
  );
  const hasMoreMerchants = sortedMerchants.length > visibleMerchantCount;

  if (error && bags.length === 0 && merchants.length === 0) {
    return <ErrorState message={error} />;
  }

  const isBagsLoading = isLoading && bags.length === 0;
  const isMerchantsLoading = isLoading && merchants.length === 0;
  const isBrandsLoading = isLoading && brands.length === 0;

  return (
    <div className="customer-screen customer-home-screen">
      {/* KHỐI 1: TỔNG HỢP BANNER + TÌM KIẾM + DANH MỤC + ĐỊA ĐIỂM TRONG 1 KHỐI DUY NHẤT (DESKTOP) */}
      <section className="customer-home-top-unified-block">
        <HomeBanner
          banners={banners}
          currentIndex={bannerIndex}
          onSelectIndex={setBannerIndex}
        />

        <button type="button" className="customer-search-trigger" onClick={onSearch}>
          <Search size={19} />
          <span>Tìm cửa hàng hoặc túi thực phẩm...</span>
        </button>

        <CategoryBar
          categories={categories}
          selectedCategory={category}
          onSelectCategory={(id: FoodCategory) => setCategory(id)}
        />

        <button type="button" className="customer-location-card" onClick={onLocation}>
          <span className="customer-location-pin"><MapPin size={20} /></span>
          <span><small>Đang khám phá quanh</small><strong>{location}</strong></span>
          <ArrowRight size={18} />
        </button>
      </section>

      <section className="customer-content-section customer-home-block customer-home-bags-section">
        <SectionHeading
          icon={<Gift size={24} strokeWidth={2.4} />}
          title="Túi bất ngờ"
          actionLabel={visibleBags.length > 0 ? "Xem tất cả" : undefined}
          onAction={visibleBags.length > 0 ? onViewAll : undefined}
        />
        {isBagsLoading ? (
          <div className="customer-horizontal-list">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="customer-bag-card is-compact"
                style={{
                  minWidth: 172,
                  width: 172,
                  height: 220,
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: 'var(--color-bg-subtle, #f3f4f6)',
                  pointerEvents: 'none',
                }}
              >
                <Skeleton height="100%" borderRadius="16px" />
              </div>
            ))}
          </div>
        ) : visibleBags.length > 0 ? (
          <div className="customer-horizontal-list">
            {visibleBags.map((bag) => (
              <BagCard key={bag.id} bag={bag} compact onOpen={onOpenBag} onAdd={onAdd} />
            ))}
          </div>
        ) : (
          <div style={{ padding: '12px 16px', color: 'var(--color-text-tertiary, #888)', fontSize: 13 }}>
            Hiện chưa có túi cứu trợ quanh khu vực này.
          </div>
        )}
      </section>

      <section className="customer-content-section customer-home-block customer-home-brands-section">
        <SectionHeading
          icon={<Award size={24} strokeWidth={2.4} />}
          title="Thương hiệu nổi bật"
        />
        {isBrandsLoading ? (
          <div style={{ height: 48, borderRadius: 12, overflow: 'hidden' }}>
            <Skeleton height="100%" borderRadius="12px" />
          </div>
        ) : (
          <BrandMarquee brands={brands} onOpenBrand={onOpenBrand} />
        )}
      </section>

      <section className="customer-content-section customer-home-block customer-home-merchants-section">
        <SectionHeading
          icon={<MapPin size={24} strokeWidth={2.4} />}
          title="Các cửa hàng gần bạn"
        />
        {isMerchantsLoading ? (
          <div className="customer-merchant-list">
            {[1, 2].map((idx) => (
              <div
                key={idx}
                className="customer-merchant-card"
                style={{
                  height: 160,
                  borderRadius: 18,
                  overflow: 'hidden',
                  border: 'none',
                  pointerEvents: 'none',
                }}
              >
                <Skeleton height="100%" borderRadius="18px" />
              </div>
            ))}
          </div>
        ) : displayedMerchants.length > 0 ? (
          <div className="customer-merchant-list">
            {displayedMerchants.map((merchant) => {
              const merchantBags = bags.filter((bag) => bag.merchantId === merchant.id);
              const lowestPrice =
                merchantBags.length > 0
                  ? Math.min(...merchantBags.map((b) => b.discountPrice))
                  : null;
              return (
                <MerchantCard
                  key={merchant.id}
                  merchant={merchant}
                  meta={lowestPrice ? `Từ ${lowestPrice.toLocaleString('vi-VN')}đ` : undefined}
                  onClick={onOpenMerchant}
                />
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '12px 16px', color: 'var(--color-text-tertiary, #888)', fontSize: 13 }}>
            Chưa tìm thấy cửa hàng đối tác quanh đây.
          </div>
        )}

        {hasMoreMerchants && (
          <div className="customer-merchant-load-more-wrap">
            <button
              type="button"
              className="customer-merchant-load-more-btn"
              onClick={() => setVisibleMerchantCount((prev) => prev + 10)}
            >
              <span>Xem thêm</span>
              <ChevronsDown size={20} strokeWidth={2.4} className="customer-load-more-icon" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
