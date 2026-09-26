import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, MapPin, Search, Sparkles } from 'lucide-react';
import { Chip, ErrorState, Skeleton } from '@gosavingfood/ui';
import { BagCard, MerchantCard, SectionHeading } from '../../../shared/components';
import type { Banner, Brand, Category, Merchant, SurpriseBag } from '../../../shared/types/customer.types';

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
  const [category, setCategory] = useState('all');

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
    return <div className="customer-screen customer-loading-grid"><Skeleton height={168} /><Skeleton height={48} /><Skeleton height={240} /></div>;
  }

  if (error) return <ErrorState message={error} />;
  const banner = banners[bannerIndex];

  return (
    <div className="customer-screen customer-home-screen">
      {banner && (
        <section className={`customer-campaign is-${banner.accent}`}>
          <div>
            <span><Sparkles size={14} /> {banner.eyebrow}</span>
            <h1>{banner.title}</h1>
            <p>{banner.description}</p>
          </div>
          <div className="customer-campaign-icon">{banner.icon}</div>
          <div className="customer-campaign-dots">
            {banners.map((item, index) => <button key={item.id} type="button" className={index === bannerIndex ? 'is-active' : ''} onClick={() => setBannerIndex(index)} aria-label={`Banner ${index + 1}`} />)}
          </div>
        </section>
      )}

      <button type="button" className="customer-search-trigger" onClick={onSearch}>
        <Search size={19} />
        <span>Tìm cửa hàng hoặc túi thực phẩm...</span>
      </button>

      <div className="customer-category-track">
        {categories.map((item) => (
          <Chip key={item.id} selected={category === item.id} onClick={() => setCategory(item.id)}>
            {item.icon} {item.label}
          </Chip>
        ))}
      </div>

      <button type="button" className="customer-location-card" onClick={onLocation}>
        <span className="customer-location-pin"><MapPin size={20} /></span>
        <span><small>Đang khám phá quanh</small><strong>{location}</strong></span>
        <ArrowRight size={18} />
      </button>

      <section className="customer-content-section">
        <SectionHeading icon="🎁" title="Túi bất ngờ" subtitle="Ngon, tiết kiệm và thân thiện môi trường" actionLabel="Xem tất cả" onAction={onViewAll} />
        <div className="customer-horizontal-list">
          {visibleBags.map((bag) => <BagCard key={bag.id} bag={bag} compact onOpen={onOpenBag} onAdd={onAdd} />)}
        </div>
      </section>

      <section className="customer-content-section">
        <SectionHeading icon="⭐" title="Thương hiệu nổi bật" subtitle="Đối tác được yêu thích gần bạn" />
        <div className="customer-brand-track">
          {brands.map((brand) => (
            <button key={brand.id} type="button" onClick={() => onOpenBrand(brand)}>
              <span>{brand.logo}</span><strong>{brand.name}</strong><small>★ {brand.rating}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="customer-content-section">
        <SectionHeading icon="⚡" title="Giải cứu cấp tốc" subtitle="Sắp hết giờ nhận hôm nay" />
        <div className="customer-merchant-list">
          {merchants.map((merchant) => {
            const merchantBag = bags.find((bag) => bag.merchantId === merchant.id);
            return (
              <MerchantCard key={merchant.id} merchant={merchant} detail={`★ ${merchant.rating} · ${merchant.distance.toLocaleString('vi-VN')} km`} meta={merchantBag ? `Từ ${merchantBag.discountPrice.toLocaleString('vi-VN')}đ` : undefined} onClick={onOpenMerchant} />
            );
          })}
        </div>
      </section>
    </div>
  );
}
