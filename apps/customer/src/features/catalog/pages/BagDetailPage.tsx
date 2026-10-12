import { useEffect, useMemo, useState } from 'react';
import { Clock3, ShoppingBag, Star, Store } from 'lucide-react';
import { Badge, Button, Dialog, EmptyState } from '@gosavingfood/ui';
import { PriceDisplay, QuantityStepper, ScreenHeader, StickyActions } from '../../../shared/components';
import { customerService } from '../../../services/customer.service';
import type { CustomerReview, Merchant, SurpriseBag } from '../../../shared/types/customer.types';

const isMediaUrl = (url?: string | null) =>
  Boolean(url && (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')));

interface BagDetailPageProps {
  bag: SurpriseBag | null;
  merchant: Merchant | null;
  isAuthenticated?: boolean;
  isLoading?: boolean;
  onBack: () => void;
  onMerchant: () => void;
  onAdd: (bag: SurpriseBag, quantity: number) => boolean | void;
  onBuyNow: (bag: SurpriseBag, quantity: number) => void;
  onRequireAuth?: (action?: 'add_to_cart' | 'buy_now', bag?: SurpriseBag, quantity?: number) => void;
}

export function BagDetailPage({
  bag,
  merchant,
  isAuthenticated = false,
  isLoading = false,
  onBack,
  onMerchant,
  onAdd,
  onBuyNow,
  onRequireAuth,
}: BagDetailPageProps) {
  const [quantity, setQuantity] = useState(1);
  const [isQuantityOpen, setIsQuantityOpen] = useState(false);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (bag?.merchantId) {
      void customerService.getStoreReviews(bag.merchantId).then((data) => {
        if (data && data.length > 0) setReviews(data);
      });
    }
  }, [bag?.merchantId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const countdown = useMemo(() => {
    if (!bag || now === 0) return '--:--:--';
    const remaining = Math.max(0, new Date(bag.expiresAt || (now + 86400000)).getTime() - now);
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }, [bag, now]);
  if (isLoading && !bag) {
    return (
      <div className="customer-detail-screen">
        <div className="customer-detail-hero" style={{ background: '#f1f5f9' }}>
          <div className="customer-detail-header">
            <ScreenHeader title="Chi tiết túi" onBack={onBack} />
          </div>
          <div className="customer-skeleton" style={{ width: '100%', height: '240px' }} />
        </div>
        <div className="customer-detail-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1.25rem' }}>
          <div className="customer-skeleton" style={{ width: '35%', height: '16px', borderRadius: '4px' }} />
          <div className="customer-skeleton" style={{ width: '75%', height: '26px', borderRadius: '6px' }} />
          <div className="customer-skeleton" style={{ width: '45%', height: '24px', borderRadius: '6px' }} />
          <div className="customer-skeleton" style={{ width: '100%', height: '70px', borderRadius: '12px', marginTop: '0.5rem' }} />
          <div className="customer-skeleton" style={{ width: '100%', height: '100px', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }
  if (!bag) return <div className="customer-screen"><ScreenHeader title="Chi tiết túi" onBack={onBack} /><EmptyState title="Không tìm thấy túi" /></div>;
  const discount = Math.round((1 - bag.discountPrice / bag.originalPrice) * 100);
  return (
    <div className="customer-detail-screen">
      <div className="customer-detail-hero"><img src={bag.imageUrl} alt={bag.name} /><div className="customer-detail-header"><ScreenHeader title="Chi tiết túi" onBack={onBack} /></div><Badge variant="error">Giảm {discount}%</Badge></div>
      <div className="customer-detail-content">
        <div className="customer-detail-title"><div><span>{bag.merchantName}</span><h1>{bag.name}</h1></div><PriceDisplay original={bag.originalPrice} current={bag.discountPrice} className="customer-detail-price" /></div>
        <div className="customer-countdown"><Clock3 size={20} /><span>Hết hạn sau</span><strong>{countdown}</strong></div>
        {merchant && (
          <button type="button" className="customer-merchant-profile" onClick={onMerchant}>
            <span>
              {isMediaUrl(merchant.logo) ? (
                <img src={merchant.logo} alt={merchant.name} />
              ) : (
                <Store size={22} />
              )}
            </span>
            <div>
              <strong>{merchant.name}</strong>
              <small>
                {merchant.totalRatings > 0 ? (
                  <>
                    <Star size={13} fill="currentColor" /> {merchant.rating.toFixed(1)} ({merchant.totalRatings})
                  </>
                ) : (
                  <span>Quán mới</span>
                )}
                {' · '}
                {merchant.distance >= 1000
                  ? `${(merchant.distance / 1000).toFixed(1)} km`
                  : `${merchant.distance} m`}
              </small>
            </div>
            <em>Xem shop</em>
          </button>
        )}
        <section className="customer-copy-section">
          <h2>Trong túi có gì?</h2>
          <p>{bag.description}</p>
          <div className="customer-pickup-box">
            <span>Khung giờ nhận</span>
            <strong>{bag.pickupStart} – {bag.pickupEnd}</strong>
            <small>Vui lòng đến đúng giờ để món ăn vẫn ngon nhất.</small>
          </div>
        </section>

        {reviews.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '15px' }}>Đánh giá gần đây từ khách hàng</strong>
              <small style={{ color: 'var(--color-text-muted)' }}>{reviews.length} nhận xét</small>
            </div>
            {reviews.slice(0, 2).map((rev) => (
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
        )}
      </div>
      <StickyActions>
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            if (!isAuthenticated) {
              onRequireAuth?.('add_to_cart', bag, 1);
              return;
            }
            setIsQuantityOpen(true);
          }}
        >
          <ShoppingBag size={19} /> Thêm vào giỏ
        </Button>
        <Button
          size="lg"
          onClick={() => {
            if (!isAuthenticated) {
              onRequireAuth?.('buy_now', bag, 1);
              return;
            }
            onBuyNow(bag, 1);
          }}
        >
          Mua ngay
        </Button>
      </StickyActions>
      <Dialog isOpen={isQuantityOpen} onClose={() => setIsQuantityOpen(false)} title="Chọn số lượng" footer={<Button fullWidth size="lg" onClick={() => { onAdd(bag, quantity); setIsQuantityOpen(false); }}>Thêm {quantity} túi · {(bag.discountPrice * quantity).toLocaleString('vi-VN')}đ</Button>}><div className="customer-quantity-modal"><img src={bag.imageUrl} alt="" /><div><strong>{bag.name}</strong><small>Tối đa {Math.min(bag.quantity, bag.maxQuantity)} túi</small></div><QuantityStepper value={quantity} min={1} max={Math.min(bag.quantity, bag.maxQuantity)} onChange={setQuantity} /></div></Dialog>
    </div>
  );
}
