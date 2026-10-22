import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Clock3,
  Heart,
  MapPin,
  Share2,
  ShoppingBag,
  Star,
} from 'lucide-react';
import { Button, Dialog, EmptyState } from '@gosavingfood/ui';
import { QuantityStepper } from '../../../shared/components';
import { calculateDistanceKm } from '../../../services/mapbox.service';
import { customerService } from '../../../services/customer.service';
import { getBagTimingInfo } from '../../../shared/utils/bagTiming';
import type { CustomerReview, Merchant, SurpriseBag } from '../../../shared/types/customer.types';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80';

interface BagDetailPageProps {
  bag: SurpriseBag | null;
  merchant: Merchant | null;
  userCoords?: { lat: number; lng: number } | null;
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
  userCoords,
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
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

  // Tính toán thời điểm hết hạn thực tế từ backend hoặc khung giờ pickupEnd của hôm nay
  const targetExpiryMs = useMemo(() => {
    if (!bag) return 0;
    // 1. Nếu backend có expiresAt hợp lệ trong vòng 36h tới (không phải mock +7 ngày)
    if (bag.expiresAt) {
      const expMs = new Date(bag.expiresAt).getTime();
      const diff = expMs - Date.now();
      if (!isNaN(expMs) && diff > 0 && diff < 36 * 3600 * 1000) {
        return expMs;
      }
    }

    // 2. Tính thời điểm hết hạn theo giờ kết thúc nhận (pickupEnd) của ngày hôm nay
    if (bag.pickupEnd) {
      const parts = bag.pickupEnd.split(':');
      const endH = parseInt(parts[0], 10);
      const endM = parseInt(parts[1], 10) || 0;
      if (!isNaN(endH)) {
        const todayEnd = new Date();
        todayEnd.setHours(endH, endM, 0, 0);
        return todayEnd.getTime();
      }
    }

    return 0;
  }, [bag?.expiresAt, bag?.pickupEnd]);

  const countdown = useMemo(() => {
    if (!bag || now === 0 || !targetExpiryMs) return '--:--:--';
    const remaining = targetExpiryMs - now;
    if (remaining <= 0) {
      return 'Đã hết hạn';
    }
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }, [bag, now, targetExpiryMs]);

  const timing = useMemo(() => getBagTimingInfo(bag), [bag, now]);

  // Tính khoảng cách thực tế từ vị trí đã xác nhận trên Map tới tọa độ của quán
  const distanceFormatted = useMemo(() => {
    if (
      userCoords?.lat != null &&
      userCoords?.lng != null &&
      merchant?.latitude != null &&
      merchant?.longitude != null
    ) {
      const km = calculateDistanceKm(
        [userCoords.lng, userCoords.lat],
        [merchant.longitude, merchant.latitude]
      );
      if (km < 1) {
        return `${Math.round(km * 1000)} m`;
      }
      return `${km.toFixed(1)} km`;
    }
    if (merchant?.distance != null && merchant.distance > 0) {
      const m = merchant.distance < 50 ? merchant.distance * 1000 : merchant.distance;
      if (m < 1000) return `${Math.round(m)} m`;
      return `${(m / 1000).toFixed(1)} km`;
    }
    return null;
  }, [userCoords, merchant?.latitude, merchant?.longitude, merchant?.distance]);

  const handleToggleFavorite = () => {
    setIsFavorite((prev) => {
      const next = !prev;
      setToastMsg(next ? 'Đã thêm túi vào danh sách yêu thích!' : 'Đã bỏ yêu thích túi');
      setTimeout(() => setToastMsg(null), 2500);
      return next;
    });
  };

  const handleShare = async () => {
    if (!bag) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: bag.name,
          text: `Giải cứu túi thực phẩm ${bag.name} tại ${bag.merchantName} với giá siêu hời trên GoSavingFood!`,
          url: window.location.href,
        });
      } catch {
        // Ignored
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setToastMsg('Đã sao chép liên kết sản phẩm!');
        setTimeout(() => setToastMsg(null), 2500);
      } catch {
        // Ignored
      }
    }
  };

  if (isLoading && !bag) {
    return (
      <div className="customer-product-screen">
        <div className="customer-product-hero" style={{ background: 'var(--color-bg-muted)' }}>
          <div className="customer-product-hero-nav">
            <button type="button" className="customer-product-round-btn" onClick={onBack}>
              <ChevronLeft size={22} />
            </button>
          </div>
          <div className="customer-skeleton" style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="customer-product-skeleton-body">
          <div className="customer-skeleton" style={{ width: '40%', height: '18px', borderRadius: '6px' }} />
          <div className="customer-skeleton" style={{ width: '80%', height: '28px', borderRadius: '8px' }} />
          <div className="customer-skeleton" style={{ width: '50%', height: '24px', borderRadius: '6px' }} />
          <div className="customer-skeleton" style={{ width: '100%', height: '90px', borderRadius: '14px', marginTop: '12px' }} />
        </div>
      </div>
    );
  }
  if (!bag) {
    return (
      <div className="customer-screen">
        <div className="customer-screen-header">
          <button type="button" className="customer-round-button" onClick={onBack}>
            <ChevronLeft size={20} />
          </button>
          <h1>Chi tiết túi</h1>
        </div>
        <EmptyState title="Không tìm thấy túi thực phẩm" />
      </div>
    );
  }

  const discountPercent =
    bag.originalPrice > bag.discountPrice
      ? Math.round(((bag.originalPrice - bag.discountPrice) / bag.originalPrice) * 100)
      : 0;

  const coverUrl = bag.imageUrl || merchant?.banner || merchant?.logo || DEFAULT_COVER;
  const merchantLogo = merchant?.logo || merchant?.banner || coverUrl;
  const totalReviews = merchant?.totalRatings || 175;
  const ratingValue = (bag.rating || merchant?.rating || 4.8).toFixed(1);

  return (
    <div className="customer-product-screen">
      {/* Toast Notification */}
      {toastMsg && <div className="customer-product-toast">{toastMsg}</div>}

      {/* 1. Edge-to-Edge Hero Image Section (Chỉ ảnh sản phẩm) */}
      <section className="customer-product-hero">
        <img
          src={coverUrl}
          alt={bag.name}
          className="customer-product-hero-img"
        />
        <div className="customer-product-hero-scrim" />

        {/* Floating Top Nav (Back, Favorite, Share) */}
        <div className="customer-product-hero-nav">
          <button
            type="button"
            className="customer-product-round-btn"
            onClick={onBack}
            aria-label="Quay lại"
          >
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>

          <div className="customer-product-hero-actions">
            <button
              type="button"
              className={`customer-product-round-btn ${isFavorite ? 'is-favorited' : ''}`}
              onClick={handleToggleFavorite}
              aria-label={isFavorite ? 'Bỏ thích' : 'Yêu thích'}
            >
              <Heart
                size={20}
                fill={isFavorite ? '#ef4444' : 'none'}
                color={isFavorite ? '#ef4444' : '#ffffff'}
              />
            </button>

            <button
              type="button"
              className="customer-product-round-btn"
              onClick={handleShare}
              aria-label="Chia sẻ"
            >
              <Share2 size={20} color="#ffffff" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Main Product Info & Details (Right Column on Desktop) */}
      <div className="customer-product-main-content">
        {/* Main Product Info & Price Card */}
        <section className="customer-product-info-card">
          <h1 className="customer-product-title">{bag.name}</h1>

          {/* Rating and Distance Row */}
          <div className="customer-product-meta-row">
            <div className="customer-product-rating-pill">
              <Star size={14} fill="var(--color-offer-accent)" color="var(--color-offer-accent)" />
              <strong>{ratingValue}</strong>
              <span>({totalReviews})</span>
            </div>
            {distanceFormatted && (
              <>
                <span className="customer-product-meta-dot">•</span>
                <span className="customer-product-distance">{distanceFormatted}</span>
              </>
            )}
          </div>

          {/* Price & Discount Row */}
          <div className="customer-product-price-row">
            <span className="customer-product-price">
              {bag.discountPrice.toLocaleString('vi-VN')}đ
            </span>
            {bag.originalPrice > bag.discountPrice && (
              <del className="customer-product-orig-price">
                {bag.originalPrice.toLocaleString('vi-VN')}đ
              </del>
            )}
            {discountPercent > 0 && (
              <span className="customer-product-discount-pill">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Urgency & Stock Banner */}
          <div className="customer-product-urgency-row">
            <div className="customer-product-stock-pill">
              <ShoppingBag size={14} strokeWidth={2.2} />
              <span>{bag.quantity > 0 ? `Còn ${bag.quantity} túi` : 'Hết hàng'}</span>
            </div>

            <div
              className="customer-product-countdown-pill"
              style={
                timing.phase === 'upcoming'
                  ? { background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' }
                  : timing.phase === 'order_closed'
                  ? { background: '#ffedd5', color: '#9a3412', border: '1px solid #fed7aa' }
                  : undefined
              }
            >
              <Clock3 size={14} strokeWidth={2.2} />
              <span>
                {timing.phase === 'upcoming' ? (
                  <>Sắp mở bán lúc <strong>{bag.pickupStart}</strong> hôm nay</>
                ) : timing.phase === 'order_closed' ? (
                  <strong style={{ color: '#c2410c' }}>Đã hết giờ nhận đơn</strong>
                ) : bag.bagType === 'shelf_life' && bag.expiryDate ? (
                  <>HSD đến: <strong>{bag.expiryDate.split('-').reverse().join('/')}</strong></>
                ) : countdown === 'Đã hết hạn' ? (
                  <strong style={{ color: '#dc2626' }}>Đã hết hạn nhận</strong>
                ) : (
                  <>Hết hạn sau: <strong>{countdown}</strong></>
                )}
              </span>
            </div>
          </div>
        </section>

        {/* 3. Section: Khung giờ nhận túi */}
        <section className="customer-store-section">
          <div className="customer-store-section-header">
            <h2 className="customer-store-section-title">Khung giờ nhận túi</h2>
          </div>

          <div className="customer-product-pickup-card">
            <div className="customer-product-pickup-icon">
              <Clock3 size={22} strokeWidth={2.2} />
            </div>
            <div className="customer-product-pickup-body">
              <div className="customer-product-pickup-time">
                {bag.bagType === 'shelf_life'
                  ? `Hàng ngày ${bag.pickupStart} – ${bag.pickupEnd} (HSD: ${bag.expiryDate ? bag.expiryDate.split('-').reverse().join('/') : 'Nhiều ngày'})`
                  : `Hôm nay ${bag.pickupStart} – ${bag.pickupEnd}`}
              </div>
              <p className="customer-product-pickup-desc">
                Vui lòng đến đúng giờ để lấy phần ăn tươi ngon nhất. Quét mã QR tại quán để nhận túi nhanh chóng.
              </p>
              {merchant?.address && (
                <div className="customer-product-pickup-addr">
                  <MapPin size={13} strokeWidth={2.2} />
                  <span>{merchant.address}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4. Section: Cửa hàng cung cấp */}
        {merchant && (
          <section className="customer-store-section">
            <div className="customer-store-section-header">
              <h2 className="customer-store-section-title">Cửa hàng cung cấp</h2>
            </div>

            <div
              className="customer-product-merchant-card"
              onClick={onMerchant}
              role="button"
              tabIndex={0}
            >
              <div className="customer-product-merchant-logo">
                <img
                  src={merchantLogo}
                  alt={merchant.name}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80';
                  }}
                />
              </div>
              <div className="customer-product-merchant-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <h3 className="customer-product-merchant-name">{merchant.name}</h3>
                  <span
                    className={`customer-merchant-status-badge ${merchant.isOpen !== false ? 'is-open' : 'is-closed'}`}
                    style={{ padding: '2px 8px', fontSize: 10 }}
                  >
                    <span className="customer-merchant-status-dot" style={{ width: 5, height: 5 }} />
                    {merchant.isOpen !== false ? 'Mở cửa' : 'Đóng cửa'}
                  </span>
                </div>
                <p className="customer-product-merchant-addr">
                  <MapPin size={13} strokeWidth={2.2} />
                  <span>{merchant.address}</span>
                </p>
                <div className="customer-product-merchant-meta">
                  <Star size={13} fill="var(--color-offer-accent)" color="var(--color-offer-accent)" />
                  <strong>{merchant.rating.toFixed(1)}</strong>
                  {distanceFormatted && <span>• {distanceFormatted}</span>}
                </div>
              </div>
              <button
                type="button"
                className="customer-store-view-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onMerchant();
                }}
              >
                Xem
              </button>
            </div>
          </section>
        )}

        {/* 5. Section: Mô tả túi hàng */}
        <section className="customer-store-section">
          <div className="customer-store-section-header">
            <h2 className="customer-store-section-title">Mô tả túi hàng</h2>
          </div>

          <div className="customer-product-description-wrap">
            <p className="customer-product-description">
              {bag.description || 'Chưa có thông tin mô tả cho túi hàng này.'}
            </p>
          </div>
        </section>

        {/* 6. Section: Đánh giá từ khách hàng */}
        {reviews.length > 0 && (
          <section className="customer-store-section">
            <div className="customer-store-section-header">
              <h2 className="customer-store-section-title">Đánh giá từ khách hàng ({reviews.length})</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reviews.slice(0, 3).map((rev) => {
                const isImageAvatar = Boolean(rev.avatar && (rev.avatar.startsWith('http') || rev.avatar.startsWith('data:')));
                const initial = rev.customerName?.trim().charAt(0).toUpperCase() || 'K';

                return (
                  <div
                    key={rev.id}
                    className="customer-review-card"
                    style={{
                      padding: '12px 14px',
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isImageAvatar ? '#f1f5f9' : 'linear-gradient(135deg, #166B4A, #10b981)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '13px',
                          }}
                        >
                          {isImageAvatar ? (
                            <img
                              src={rev.avatar}
                              alt={rev.customerName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>
                        <div>
                          <strong style={{ fontSize: '13.5px', color: '#1e293b', display: 'block', fontWeight: 700 }}>
                            {rev.customerName}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={12}
                                fill={s <= rev.rating ? '#f59e0b' : '#e2e8f0'}
                                color={s <= rev.rating ? '#f59e0b' : '#cbd5e1'}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <small style={{ color: '#94a3b8', fontSize: '11px', flexShrink: 0, fontWeight: 500 }}>
                        {rev.timeAgo || 'Gần đây'}
                      </small>
                    </div>
                    {rev.comment && (
                      <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5, paddingLeft: '42px' }}>
                        {rev.comment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* 8. Sticky Bottom Action Bar */}
      <footer className="customer-product-bottom-bar">
        {merchant?.isOpen === false ? (
          <div
            className="customer-product-bottom-banner customer-product-bottom-banner--closed"
            style={{ gridColumn: '1 / -1' }}
          >
            <span>⚠️ Quán hiện đang tạm đóng cửa — Chưa thể đặt hàng</span>
          </div>
        ) : !timing.canOrder ? (
          <div
            className={`customer-product-bottom-banner customer-product-bottom-banner--${timing.phase}`}
            style={{ gridColumn: '1 / -1' }}
          >
            <span>
              {timing.phase === 'upcoming' && `🟡 ${timing.detailMessage}`}
              {timing.phase === 'order_closed' && `🟠 ${timing.detailMessage}`}
              {timing.phase === 'sold_out' && `⚪ ${timing.detailMessage}`}
              {timing.phase === 'expired' && `🔴 ${timing.detailMessage}`}
            </span>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="lg"
              className="customer-product-btn-cart"
              onClick={() => {
                if (!isAuthenticated) {
                  onRequireAuth?.('add_to_cart', bag, 1);
                  return;
                }
                setIsQuantityOpen(true);
              }}
            >
              <span>Thêm vào giỏ</span>
            </Button>

            <Button
              size="lg"
              className="customer-product-btn-buy"
              onClick={() => {
                if (!isAuthenticated) {
                  onRequireAuth?.('buy_now', bag, 1);
                  return;
                }
                onBuyNow(bag, 1);
              }}
            >
              <span>Mua ngay</span>
            </Button>
          </>
        )}
      </footer>

      {/* Quantity Stepper Dialog */}
      <Dialog
        isOpen={isQuantityOpen}
        onClose={() => setIsQuantityOpen(false)}
        title="Chọn số lượng"
        footer={
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              onAdd(bag, quantity);
              setIsQuantityOpen(false);
            }}
          >
            Thêm {quantity} túi · {(bag.discountPrice * quantity).toLocaleString('vi-VN')}đ
          </Button>
        }
      >
        <div className="customer-quantity-modal">
          <img src={coverUrl} alt={bag.name} />
          <div>
            <strong>{bag.name}</strong>
            <small>Tối đa {Math.min(bag.quantity, bag.maxQuantity)} túi</small>
          </div>
          <QuantityStepper
            value={quantity}
            min={1}
            max={Math.min(bag.quantity, bag.maxQuantity)}
            onChange={setQuantity}
          />
        </div>
      </Dialog>
    </div>
  );
}

