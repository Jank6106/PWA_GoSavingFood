import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Carrot,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  Coffee,
  Croissant,
  Gift,
  Leaf,
  MapPin,
  Search,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { ErrorState, Skeleton } from '@gosavingfood/ui';
import { BagCard, MerchantCard, SectionHeading } from '../../../shared/components';
import { isBagVisibleOnMarket } from '../../../shared/utils/bagTiming';
import { BrandMarquee, HomeBanner } from '../components';
import { TodayDeals } from '../components/TodayDeals';
import type { Banner, Brand, Category, FoodCategory, Merchant, SurpriseBag } from '../../../shared/types/customer.types';

const categoryIcons: Record<string, typeof UtensilsCrossed> = {
  bakery: Croissant,
  meat: UtensilsCrossed,
  vegetarian: Leaf,
  beverage: Coffee,
  raw_food: Carrot,
  other: Sparkles,
};

interface CategoryBagRowProps {
  bags: SurpriseBag[];
  onOpenBag: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => void;
}

function CategoryBagRow({ bags, onOpenBag, onAdd }: CategoryBagRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    const timer = setTimeout(checkScroll, 150);
    const ro = new ResizeObserver(() => checkScroll());
    ro.observe(el);
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [bags]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.75, 280);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="customer-category-row-wrapper">
      <button
        type="button"
        className={`customer-category-nav-btn is-prev ${!canScrollLeft ? 'is-disabled' : ''}`}
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
        aria-label="Cuộn sang trái"
      >
        <ChevronLeft size={20} strokeWidth={2.4} />
      </button>

      <div ref={scrollRef} className="customer-horizontal-list customer-category-bag-list">
        {bags.map((bag) => (
          <BagCard key={bag.id} bag={bag} compact onOpen={onOpenBag} onAdd={onAdd} />
        ))}
      </div>

      <button
        type="button"
        className={`customer-category-nav-btn is-next ${!canScrollRight ? 'is-disabled' : ''}`}
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        aria-label="Cuộn sang phải"
      >
        <ChevronRight size={20} strokeWidth={2.4} />
      </button>
    </div>
  );
}

interface HomePageProps {
  banners: Banner[];
  categories: Category[];
  brands: Brand[];
  merchants: Merchant[];
  bags: SurpriseBag[];
  isLoading: boolean;
  error: string | null;
  location: string;
  onFinder?: () => void;
  onSearch: () => void;
  onLocation: () => void;
  onOpenBag: (bag: SurpriseBag) => void;
  onOpenMerchant: (merchant: Merchant) => void;
  onOpenBrand: (brand: Brand) => void;
  onAdd: (bag: SurpriseBag) => void;
  onViewAll: (categoryId?: FoodCategory) => void;
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
  onFinder,
  onSearch,
  onLocation,
  onOpenBag,
  onOpenMerchant,
  onOpenBrand,
  onAdd,
  onViewAll,
}: HomePageProps) {
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(
      () => setBannerIndex((current) => (current + 1) % banners.length),
      4000
    );
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.id !== 'all'),
    [categories]
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
  const hasAnyBags = bags.some(isBagVisibleOnMarket);

  return (
    <div className="customer-screen customer-home-screen">
      {/* KHỐI 1: TỔNG HỢP BANNER + TÌM KIẾM + TÌM MÓN THEO NHU CẦU + ĐỊA ĐIỂM TRONG 1 KHỐI DUY NHẤT (DESKTOP) */}
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

        {/* LỐI VÀO RÕ RÀNG: TÌM MÓN THEO NHU CẦU (FINDER) */}
        <button
          type="button"
          className="customer-finder-trigger"
          onClick={onFinder ?? onSearch}
          aria-label="Bạn muốn ăn gì hôm nay? Tìm theo ngân sách, số người, khu vực"
        >
          <span className="customer-finder-icon-wrap">
            <Sparkles size={18} strokeWidth={2.4} />
          </span>
          <span className="customer-finder-text">
            <span className="customer-finder-title">Bạn muốn ăn gì hôm nay?</span>
            <span className="customer-finder-desc">Theo ngân sách, số người, khung giờ nhận...</span>
          </span>
          <ArrowRight size={18} className="customer-finder-arrow" />
        </button>

        <button type="button" className="customer-location-card" onClick={onLocation}>
          <span className="customer-location-pin"><MapPin size={20} /></span>
          <span><small>Đang khám phá quanh</small><strong>{location}</strong></span>
          <ArrowRight size={18} />
        </button>
      </section>

      {/* KHỐI: HỜI NHẤT HÔM NAY (TODAY DEALS) */}
      <TodayDeals
        bags={bags}
        merchants={merchants}
        isLoading={isBagsLoading}
        onOpenBag={onOpenBag}
        onAdd={onAdd}
      />

      {/* TỪNG DANH MỤC THÀNH CÁC KHỐI DANH SÁCH RIÊNG BIỆT */}
      {isBagsLoading ? (
        <section className="customer-content-section customer-home-block customer-home-category-section">
          <SectionHeading
            icon={<Gift size={24} strokeWidth={2.4} />}
            title="Đang tải thực phẩm..."
          />
          <div className="customer-horizontal-list customer-category-bag-list">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="customer-bag-card is-compact"
                style={{
                  minWidth: 184,
                  width: 184,
                  height: 212,
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: 'var(--color-bg-subtle, #f3f4f6)',
                  pointerEvents: 'none',
                }}
              >
                <Skeleton height="100%" borderRadius="14px" />
              </div>
            ))}
          </div>
        </section>
      ) : (
        activeCategories.map((cat) => {
          const catBags = bags.filter((bag) => isBagVisibleOnMarket(bag) && bag.category === cat.id);
          const IconComponent = categoryIcons[cat.id] ?? Gift;

          if (catBags.length === 0) return null;

          return (
            <section
              key={cat.id}
              className={`customer-content-section customer-home-block customer-home-category-section customer-category-block-${cat.id}`}
            >
              <SectionHeading
                icon={<IconComponent size={24} strokeWidth={2.4} />}
                title={cat.label}
                actionLabel={catBags.length > 0 ? "Xem tất cả" : undefined}
                onAction={catBags.length > 0 ? () => onViewAll(cat.id) : undefined}
              />

              <CategoryBagRow
                bags={catBags}
                onOpenBag={onOpenBag}
                onAdd={onAdd}
              />
            </section>
          );
        })
      )}

      {!isBagsLoading && !hasAnyBags && (
        <section className="customer-content-section customer-home-block">
          <div style={{ padding: '20px 16px', color: 'var(--color-text-tertiary, #888)', fontSize: 13, textAlign: 'center' }}>
            Hiện chưa có túi giải cứu quanh khu vực này.
          </div>
        </section>
      )}

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
