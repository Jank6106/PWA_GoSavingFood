import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  Heart,
  MapPin,
  Share2,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { MerchantReviewsView } from '../components/MerchantReviewsView';
import type { Merchant, SurpriseBag } from '../../../shared/types/customer.types';

interface MerchantDetailPageProps {
  merchant: Merchant | null;
  bags: SurpriseBag[];
  onBack: () => void;
  onOpenBag: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => void;
  onOpenReviews?: (merchantId: string) => void;
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80';

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

  const coverUrl = merchant.banner || merchant.logo || DEFAULT_COVER;
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

        {/* Floating Brand Logo Badge (Avatar tràn viền) */}
        <div className="customer-store-floating-logo">
          {merchant.logo ? (
            <img src={merchant.logo} alt={merchant.name} />
          ) : (
            <div className="customer-store-logo-placeholder">
              <Store size={36} color="var(--color-primary)" />
            </div>
          )}
        </div>
      </section>

      {/* 2. Store Info Section */}
      <section className="customer-store-info-section">
        <h1 className="customer-store-title">{merchant.name}</h1>

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


