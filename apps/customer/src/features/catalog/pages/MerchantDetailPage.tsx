import { useEffect, useState } from 'react';
import { Clock3, MapPin, Phone, Star, Store } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { BagCard, ScreenHeader, SectionHeading } from '../../../shared/components';
import { customerService } from '../../../services/customer.service';
import type { CustomerReview, Merchant, SurpriseBag } from '../../../shared/types/customer.types';

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
  const [reviews, setReviews] = useState<CustomerReview[]>([]);

  useEffect(() => {
    if (merchant?.id) {
      void customerService.getStoreReviews(merchant.id).then((data) => {
        if (data && data.length > 0) setReviews(data);
      });
    }
  }, [merchant?.id]);

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
              {merchant.totalRatings > 0 ? (
                <>
                  <Star size={15} fill="currentColor" /> {merchant.rating.toFixed(1)} ({merchant.totalRatings})
                </>
              ) : (
                'Quán mới'
              )}
            </strong>
            <strong>
              {merchant.distance >= 1000
                ? `${(merchant.distance / 1000).toFixed(1)} km`
                : `${merchant.distance} m`}
            </strong>
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

        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SectionHeading
            icon="⭐"
            title="Đánh giá từ khách hàng"
            subtitle={reviews.length > 0 ? `${reviews.length} nhận xét thực tế từ cộng đồng` : 'Chưa có nhận xét nào'}
          />
          {reviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reviews.map((rev) => (
                <section key={rev.id} className="customer-review-card">
                  <div>
                    <span className="customer-review-avatar">{rev.avatar || 'K'}</span>
                    <div>
                      <strong>{rev.customerName}</strong>
                      <span>{'★'.repeat(Math.min(5, Math.max(1, rev.rating)))}{'☆'.repeat(5 - Math.min(5, Math.max(1, rev.rating)))}</span>
                    </div>
                    <small>{rev.timeAgo || 'Gần đây'}</small>
                  </div>
                  {rev.comment && <p>{rev.comment}</p>}
                </section>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '18px 16px',
                background: '#ffffff',
                border: '1px dashed #dce5df',
                borderRadius: '16px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
              }}
            >
              🌱 Chưa có đánh giá nào cho cửa hàng này. Hãy là người đầu tiên giải cứu túi thực phẩm và để lại nhận xét nhé!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

