import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Coffee,
  Croissant,
  Flame,
  Gift,
  Leaf,
  MapPin,
  Search,
  UtensilsCrossed,
} from 'lucide-react';
import { ErrorState, Skeleton } from '@gosavingfood/ui';
import { BagCard, MerchantCard, SectionHeading } from '../../../shared/components';
import { CategoryBar, HomeBanner } from '../components';
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
  hasCoords?: boolean;
  onRequestLocation?: () => void;
  onSearch: () => void;
  onLocation: () => void;
  onOpenBag: (bag: SurpriseBag) => void;
  onOpenMerchant: (merchant: Merchant) => void;
  onOpenBrand: (brand: Brand) => void;
  onAdd: (bag: SurpriseBag) => void;
  onViewAll: () => void;
}

const getBrandIcon = (brand: Brand) => {
  const catList = brand.categories.join(' ').toLowerCase();
  if (catList.includes('bánh')) return Croissant;
  if (catList.includes('uống') || catList.includes('cà phê') || catList.includes('coffee')) return Coffee;
  if (catList.includes('salad') || catList.includes('healthy') || catList.includes('xanh')) return Leaf;
  return UtensilsCrossed;
};

export function HomePage({
  banners,
  categories,
  brands,
  merchants,
  bags,
  isLoading,
  error,
  location,
  hasCoords,
  onRequestLocation,
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
  const [dismissedLocationPrompt, setDismissedLocationPrompt] = useState(false);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(
      () => setBannerIndex((current) => (current + 1) % banners.length),
      4000
    );
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const visibleBags = useMemo(
    () => bags.filter((bag) => category === 'all' || bag.category === category),
    [bags, category]
  );

  if (isLoading) {
    return (
      <div className="customer-screen customer-loading-grid">
        <Skeleton height={190} />
        <Skeleton height={48} />
        <Skeleton height={80} />
        <Skeleton height={240} />
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <div className="customer-screen customer-home-screen">
      {!hasCoords && !dismissedLocationPrompt && onRequestLocation && (
        <div className="customer-location-prompt-banner">
          <div className="customer-location-prompt-content">
            <span className="customer-location-prompt-icon">📍</span>
            <div>
              <strong>Bật định vị để khám phá quanh bạn</strong>
              <small>Xem món ăn & túi cứu trợ gần nhất theo vị trí thực tế</small>
            </div>
          </div>
          <div className="customer-location-prompt-actions">
            <button
              type="button"
              className="customer-location-prompt-btn"
              onClick={onRequestLocation}
            >
              Bật vị trí
            </button>
            <button
              type="button"
              className="customer-location-prompt-close"
              onClick={() => setDismissedLocationPrompt(true)}
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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

      <section className="customer-content-section">
        <SectionHeading
          icon={<Gift size={18} strokeWidth={2} />}
          title="Túi bất ngờ"
          subtitle="Ngon, tiết kiệm và thân thiện môi trường"
          actionLabel="Xem tất cả"
          onAction={onViewAll}
        />
        <div className="customer-horizontal-list">
          {visibleBags.map((bag) => (
            <BagCard key={bag.id} bag={bag} compact onOpen={onOpenBag} onAdd={onAdd} />
          ))}
        </div>
      </section>

      <section className="customer-content-section">
        <SectionHeading
          icon={<Award size={18} strokeWidth={2} />}
          title="Thương hiệu nổi bật"
          subtitle="Đối tác được yêu thích gần bạn"
        />
        <div className="customer-brand-track">
          {brands.map((brand) => {
            const BrandIcon = getBrandIcon(brand);
            const isImageLogo = Boolean(
              brand.logo &&
                (brand.logo.startsWith('http') ||
                  brand.logo.startsWith('data:') ||
                  brand.logo.startsWith('blob:'))
            );
            return (
              <button key={brand.id} type="button" onClick={() => onOpenBrand(brand)}>
                <span className="customer-brand-avatar">
                  {isImageLogo ? (
                    <img src={brand.logo} alt={brand.name} />
                  ) : (
                    <BrandIcon size={20} strokeWidth={1.9} />
                  )}
                </span>
                <strong>{brand.name}</strong>
                <small>{(brand.totalRatings ?? 0) > 0 || brand.rating > 0 ? `★ ${brand.rating.toFixed(1)}` : 'Mới'}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="customer-content-section">
        <SectionHeading
          icon={<Flame size={18} strokeWidth={2} />}
          title="Giải cứu cấp tốc"
          subtitle="Sắp hết giờ nhận hôm nay"
        />
        <div className="customer-merchant-list">
          {merchants.map((merchant) => {
            const merchantBag = bags.find((bag) => bag.merchantId === merchant.id);
            const distStr = merchant.distance >= 1000
              ? `${(merchant.distance / 1000).toFixed(1)} km`
              : `${merchant.distance} m`;
            const ratingStr = merchant.totalRatings > 0
              ? `★ ${merchant.rating.toFixed(1)} (${merchant.totalRatings})`
              : 'Mới';
            return (
              <MerchantCard
                key={merchant.id}
                merchant={merchant}
                detail={`${ratingStr} · ${distStr}`}
                meta={merchantBag ? `Từ ${merchantBag.discountPrice.toLocaleString('vi-VN')}đ` : undefined}
                onClick={onOpenMerchant}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
