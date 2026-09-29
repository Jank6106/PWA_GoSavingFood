import { Clock3, MapPin, Phone, Star, Store } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { BagCard, ScreenHeader, SectionHeading } from '../../../shared/components';
import type { Merchant, SurpriseBag } from '../../../shared/types/customer.types';

interface MerchantDetailPageProps {
  merchant: Merchant | null;
  bags: SurpriseBag[];
  onBack: () => void;
  onOpenBag: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => void;
}

const isMediaUrl = (url?: string | null) =>
  Boolean(url && (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')));

export function MerchantDetailPage({ merchant, bags, onBack, onOpenBag, onAdd }: MerchantDetailPageProps) {
  if (!merchant)
    return (
      <div className="customer-screen">
        <ScreenHeader title="Cửa hàng" onBack={onBack} />
        <EmptyState title="Không tìm thấy cửa hàng" />
      </div>
    );

  const hasCover = isMediaUrl(merchant.banner);

  return (
    <div className="customer-detail-screen">
      <section className={`customer-merchant-hero ${hasCover ? 'has-cover' : ''}`}>
        {hasCover && (
          <img
            className="customer-merchant-hero-cover"
            src={merchant.banner}
            alt={merchant.name}
          />
        )}
        <ScreenHeader title="Cửa hàng" onBack={onBack} />
        <div>
          <span className="customer-merchant-hero-logo">
            {isMediaUrl(merchant.logo) ? (
              <img src={merchant.logo} alt={merchant.name} />
            ) : (
              <Store size={36} />
            )}
          </span>
          <h1>{merchant.name}</h1>
          <p>{merchant.description}</p>
          <div>
            <strong>
              <Star size={15} fill="currentColor" /> {merchant.rating}
            </strong>
            <strong>{merchant.distance.toLocaleString('vi-VN')} km</strong>
            <strong>{bags.length} túi</strong>
          </div>
        </div>
      </section>
      <div className="customer-detail-content">
        <div className="customer-store-facts">
          <span>
            <MapPin size={17} /> {merchant.address}
          </span>
          <span>
            <Clock3 size={17} /> {merchant.openingHours}
          </span>
          <span>
            <Phone size={17} /> {merchant.phone}
          </span>
        </div>
        <SectionHeading icon="🎁" title="Túi đang bán" subtitle="Nhận trực tiếp tại cửa hàng" />
        {bags.length ? (
          <div className="customer-bag-grid">
            {bags.map((bag) => (
              <BagCard key={bag.id} bag={bag} onOpen={onOpenBag} onAdd={onAdd} />
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có túi hôm nay" />
        )}
      </div>
    </div>
  );
}

