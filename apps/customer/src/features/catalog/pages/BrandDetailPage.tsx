import { Star, Store } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { MerchantCard, ScreenHeader, SectionHeading } from '../../../shared/components';
import type { Brand, Merchant } from '../../../shared/types/customer.types';

interface BrandDetailPageProps {
  brand: Brand | null;
  stores: Merchant[];
  onBack: () => void;
  onOpenMerchant: (merchant: Merchant) => void;
}

const isMediaUrl = (url?: string | null) =>
  Boolean(url && (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')));

export function BrandDetailPage({ brand, stores, onBack, onOpenMerchant }: BrandDetailPageProps) {
  if (!brand)
    return (
      <div className="customer-screen">
        <ScreenHeader title="Thương hiệu" onBack={onBack} />
        <EmptyState title="Không tìm thấy thương hiệu" />
      </div>
    );

  const hasLogoImage = isMediaUrl(brand.logo);

  return (
    <div className="customer-screen">
      <ScreenHeader title="Thương hiệu" onBack={onBack} />
      <section className="customer-brand-hero">
        <div className="customer-brand-logo-large">
          {hasLogoImage ? (
            <img src={brand.logo} alt={brand.name} />
          ) : (
            <Store size={40} />
          )}
        </div>
        <div>
          <h1>{brand.name}</h1>
          <p>{brand.description}</p>
          <span>
            {(brand.totalRatings ?? 0) > 0 || brand.rating > 0 ? (
              <>
                <Star size={15} fill="currentColor" /> {brand.rating.toFixed(1)}
              </>
            ) : (
              'Thương hiệu mới'
            )}
            {' · '}
            {brand.totalStores} cửa hàng
          </span>
        </div>
      </section>
      <div className="customer-sustainability-banner">
        <span>🌿</span>
        <div>
          <strong>Cùng {brand.name} giảm lãng phí</strong>
          <p>{brand.sustainabilityMessage}</p>
        </div>
      </div>
      <SectionHeading icon="📍" title="Cửa hàng gần bạn" subtitle="Sắp xếp theo khoảng cách" />
      <div className="customer-merchant-list">
        {stores.map((store) => (
          <MerchantCard
            key={store.id}
            merchant={store}
            detail={store.address}
            meta={`${store.isOpen ? 'Đang mở' : 'Đã đóng'} · ${store.distance.toLocaleString('vi-VN')} km`}
            showArrow={false}
            onClick={onOpenMerchant}
          />
        ))}
      </div>
    </div>
  );
}
