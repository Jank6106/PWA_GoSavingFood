import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Clock,
  Heart,
  MapPin,
  Share2,
  ShoppingBag,
  Star,
} from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { MerchantReviewsView } from '../components/MerchantReviewsView';
import type { CustomerReview, Merchant, SurpriseBag } from '../../../shared/types/customer.types';
import { customerService, optimizeImageUrl } from '../../../services/customer.service';

interface MerchantDetailPageProps {
  merchant: Merchant | null;
  bags: SurpriseBag[];
  onBack: () => void;
  onOpenBag: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => void;
  onOpenReviews?: (merchantId: string) => void;
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80';

const DEFAULT_LOGO =
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80';

const COMMUNITY_PHOTOS = [
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300&auto=format&fit=crop&q=80',
];

const formatDistance = (dist?: number) => {
  if (dist === undefined || dist === null) return '0.5 km';
  const meters = dist < 50 ? dist * 1000 : dist;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export function MerchantDetailPage({
  merchant,
  bags,
  onBack,
  onOpenBag,
  onOpenReviews,
}: MerchantDetailPageProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAllAbout, setShowAllAbout] = useState(false);
  const [viewingAllReviews, setViewingAllReviews] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);

  useEffect(() => {
    if (merchant?.id) {
      void customerService.getStoreReviews(merchant.id).then((data) => {
        if (data && data.length > 0) setReviews(data);
      });
    }
  }, [merchant?.id]);

  const handleOpenReviews = () => {
    if (onOpenReviews && merchant) {
      onOpenReviews(merchant.id);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setViewingAllReviews(true);
    }
  };

  if (!merchant) {
    return (
      <div className="customer-screen">
        <div className="customer-screen-header">
          <button type="button" className="customer-round-button" onClick={onBack}>
            <ChevronLeft size={20} />
          </button>
          <h1>Cửa hàng</h1>
        </div>
        <EmptyState title="Không tìm thấy cửa hàng" />
      </div>
    );
  }

  if (viewingAllReviews) {
    return (
      <MerchantReviewsView
        merchant={merchant}
        onBack={() => {
          setViewingAllReviews(false);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      />
    );
  }

  const rawCover = merchant.banner || merchant.logo;
  const coverUrl = !coverFailed && rawCover ? optimizeImageUrl(rawCover, 1000, 80) : DEFAULT_COVER;
  const rawLogo = merchant.logo;
  const logoUrl = !logoFailed && rawLogo ? optimizeImageUrl(rawLogo, 300, 80) : DEFAULT_LOGO;
  const distanceFormatted = formatDistance(merchant.distance);
  const totalReviews = merchant.totalRatings || 92;
  const ratingValue = merchant.rating ? merchant.rating.toFixed(1) : '4.5';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: merchant.name,
          text: `Khám phá các túi thực phẩm bất ngờ tại ${merchant.name} trên GoSavingFood!`,
          url: window.location.href,
        });
      } catch {
        // Ignored
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setToastMsg('Đã sao chép liên kết cửa hàng!');
        setTimeout(() => setToastMsg(null), 2500);
      } catch {
        setToastMsg('Đã chia sẻ cửa hàng!');
        setTimeout(() => setToastMsg(null), 2500);
      }
    }
  };

  const handleToggleFavorite = () => {
    setIsFavorite((prev) => {
      const next = !prev;
      setToastMsg(next ? 'Đã thêm vào danh sách yêu thích!' : 'Đã bỏ yêu thích cửa hàng');
      setTimeout(() => setToastMsg(null), 2500);
      return next;
    });
  };

  const aboutParagraphs = useMemo(() => {
    const p1 =
      merchant.description ||
      `${merchant.name} là điểm đến ẩm thực quen thuộc và được tin yêu, luôn nỗ lực vì giá trị bền vững và thân thiện với môi trường.`;
    const p2 = `${merchant.name} hợp tác cùng GoSavingFood nhằm mang đến những phần ăn thơm ngon, chất lượng tuyệt hảo với mức giá siêu tiết kiệm, đồng thời chung tay giảm thiểu lãng phí thực phẩm trong cộng đồng.`;
    const p3 = `Các sản phẩm trong túi cứu trợ được chọn lọc cẩn thận mỗi ngày, bảo đảm tiêu chuẩn an toàn vệ sinh thực phẩm và hương vị tươi mới tuyệt hảo khi trao đến tay bạn.`;
    return [p1, p2, p3];
  }, [merchant]);

  return (
    <div className="customer-store-view">
      {/* Toast Notification */}
      {toastMsg && <div className="customer-store-toast">{toastMsg}</div>}

      {/* 1. Hero Cover Header */}
      <section className="customer-store-hero">
        <img
          src={coverUrl}
          alt={merchant.name}
          className="customer-store-hero-img"
          loading="lazy"
          onError={(e) => {
            if (!coverFailed) {
              setCoverFailed(true);
            } else {
              (e.currentTarget as HTMLImageElement).src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="100%" height="100%" fill="%231e3a29"/></svg>';
            }
          }}
        />
        <div className="customer-store-hero-scrim" />

        {/* Floating Nav Buttons */}
        <div className="customer-store-hero-nav">
          <button
            type="button"
            className="customer-store-circle-btn"
            onClick={onBack}
            aria-label="Quay lại"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>

          <div className="customer-store-hero-actions">
            <button
              type="button"
              className={`customer-store-circle-btn ${isFavorite ? 'is-fav' : ''}`}
              onClick={handleToggleFavorite}
              aria-label="Yêu thích"
            >
              <Heart
                size={20}
                fill={isFavorite ? '#ef4444' : 'none'}
                color={isFavorite ? '#ef4444' : '#ffffff'}
                strokeWidth={2.2}
              />
            </button>

            <button
              type="button"
              className="customer-store-circle-btn"
              onClick={handleShare}
              aria-label="Chia sẻ"
            >
              <Share2 size={19} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Floating Brand Logo Badge (Avatar tràn viền 1:1) */}
        <div className="customer-store-floating-logo">
          <img
            src={logoUrl}
            alt={merchant.name}
            loading="lazy"
            onError={(e) => {
              if (!logoFailed) {
                setLogoFailed(true);
              } else {
                (e.currentTarget as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="100%" height="100%" fill="%2322c55e"/></svg>';
              }
            }}
          />
        </div>
      </section>

      {/* 2. Store Info Section */}
      <section className="customer-store-info-section">
        <h1 className="customer-store-title">{merchant.name}</h1>

        <div style={{ marginTop: 6, marginBottom: 8 }}>
          <span className={`customer-merchant-status-badge ${merchant.isOpen !== false ? 'is-open' : 'is-closed'}`}>
            <span className="customer-merchant-status-dot" />
            {merchant.isOpen !== false ? 'Đang mở cửa' : 'Đã đóng cửa'}
          </span>
        </div>

        <div className="customer-store-address-row">
          <MapPin size={15} strokeWidth={2} className="customer-store-address-pin" />
          <span>{merchant.address}</span>
        </div>

        <div className="customer-store-meta-row">
          <Star size={16} fill="#f59e0b" color="#f59e0b" />
          <span>
            {ratingValue} ({totalReviews})
          </span>
          <span className="customer-store-meta-bullet">•</span>
          <span>{distanceFormatted}</span>
        </div>

        {merchant.isOpen === false && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 12,
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#991b1b',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Clock size={16} />
            <span>Cửa hàng hiện đang tạm đóng cửa. Quý khách vui lòng quay lại sau!</span>
          </div>
        )}
      </section>

      {/* 3. Lucky Bags List Section */}
      <section className="customer-store-bags-section">
        {bags.length > 0 ? (
          <div className="customer-store-bags-list">
            {bags.map((bag) => {
              const discountPercent =
                bag.originalPrice > bag.discountPrice
                  ? Math.round(((bag.originalPrice - bag.discountPrice) / bag.originalPrice) * 100)
                  : 0;

              return (
                <article
                  key={bag.id}
                  className="customer-store-bag-row"
                  onClick={() => onOpenBag(bag)}
                >
                  <div className="customer-store-bag-thumb-box">
                    <img src={bag.imageUrl} alt={bag.name} loading="lazy" />
                  </div>

                  <div className="customer-store-bag-info">
                    <h3 className="customer-store-bag-name">{bag.name}</h3>

                    <div className="customer-store-bag-stock">
                      <ShoppingBag size={12} strokeWidth={2.4} />
                      <span>Còn {bag.quantity} túi</span>
                    </div>

                    <div className="customer-store-bag-time">
                      <strong>Hôm nay</strong> {bag.pickupStart || '18:30'} - {bag.pickupEnd || '21:00'}
                    </div>

                    <div className="customer-store-bag-price-row">
                      <span className="customer-store-bag-price">
                        {bag.discountPrice.toLocaleString('vi-VN')}đ
                      </span>
                      {bag.originalPrice > bag.discountPrice && (
                        <del className="customer-store-bag-orig-price">
                          {bag.originalPrice.toLocaleString('vi-VN')}đ
                        </del>
                      )}
                      {discountPercent > 0 && (
                        <span className="customer-store-discount-pill">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="customer-store-view-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBag(bag);
                    }}
                  >
                    Xem
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="customer-store-empty-bags">
            <EmptyState title="Hôm nay chưa có túi bất ngờ" description="Vui lòng quay lại sau ít phút hoặc chọn cửa hàng khác!" />
          </div>
        )}
      </section>

      {/* 4. User Ratings Section */}
      <section className="customer-store-section">
        <div className="customer-store-section-header">
          <h2 className="customer-store-section-title">Đánh giá của khách hàng</h2>
          <button
            type="button"
            className="customer-store-link-btn"
            onClick={handleOpenReviews}
          >
            Xem tất cả
          </button>
        </div>

        <div
          className="customer-store-ratings-card is-interactive"
          onClick={handleOpenReviews}
          role="button"
          tabIndex={0}
        >
          <div className="customer-store-ratings-score">{ratingValue}</div>
          <div className="customer-store-ratings-detail">
            <div className="customer-store-stars-row">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={16} fill="var(--color-offer-accent)" color="var(--color-offer-accent)" />
              ))}
            </div>
            <div className="customer-store-ratings-count">
              Dựa trên {totalReviews} đánh giá
            </div>
          </div>
        </div>

        {reviews.length > 0 && (
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reviews.slice(0, 3).map((rev) => {
              const isImageAvatar = Boolean(rev.avatar && (rev.avatar.startsWith('http') || rev.avatar.startsWith('data:')));
              const initial = rev.customerName?.trim().charAt(0).toUpperCase() || 'K';

              return (
                <section
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
                  </div>
                  {rev.comment && (
                    <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5, paddingLeft: '42px' }}>
                      {rev.comment}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Rescued by the Community Section */}
      <section className="customer-store-section">
        <div className="customer-store-section-header">
          <h2 className="customer-store-section-title">Cộng đồng đã giải cứu</h2>
        </div>

        <div className="customer-store-community-grid">
          {COMMUNITY_PHOTOS.map((photoUrl, idx) => (
            <div key={idx} className="customer-store-community-item">
              <img src={photoUrl} alt={`Rescued meal ${idx + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      {/* 6. About Store Section */}
      <section className="customer-store-section">
        <div className="customer-store-section-header">
          <h2 className="customer-store-section-title">Giới thiệu cửa hàng</h2>
          <button
            type="button"
            className="customer-store-link-btn"
            onClick={() => setShowAllAbout((v) => !v)}
          >
            {showAllAbout ? 'Thu gọn' : 'Xem thêm'}
          </button>
        </div>

        <div className="customer-store-about-body">
          {(showAllAbout ? aboutParagraphs : aboutParagraphs.slice(0, 2)).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>
    </div>
  );
}


