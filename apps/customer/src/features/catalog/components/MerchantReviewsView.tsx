import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ShoppingBag, Star, X } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import type { Merchant } from '../../../shared/types/customer.types';

interface MerchantReviewsViewProps {
  merchant: Merchant | null;
  onBack: () => void;
}

type FilterTab = 'recommended' | 'latest' | 'highest' | 'lowest';

interface ReviewItem {
  id: string;
  userName: string;
  rating: number;
  date: string;
  tags: string[];
  comment: string;
  bagName?: string;
  photos?: string[];
}

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    userName: 'shirley',
    rating: 5,
    date: '15/05/2026 18:50',
    tags: ['Số lượng đầy đặn', 'Chất lượng tươi ngon', 'Đáng giá tiền'],
    comment:
      'Siêu hời, cực kỳ đáng tiền! Nhân viên quán rất dễ thương và thân thiện. Bánh nhận được toàn vị mình thích. Rất hài lòng và ủng hộ quán dài dài! 🥰',
    bagName: 'Túi bánh gia đình 🥐🥖',
    photos: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'rev-2',
    userName: 'Minh Anh',
    rating: 5,
    date: 'Hôm qua 19:30',
    tags: ['Đóng gói cẩn thận', 'Bánh còn ấm giòn', 'Ngon bất ngờ'],
    comment:
      'Lần đầu mua túi bất ngờ trên GoSavingFood mà ưng ý quá. Nhận được 4 loại bánh khác nhau, bánh mềm thơm ngát. Sẽ giới thiệu cho bạn bè cùng giải cứu!',
    bagName: 'Túi bánh tươi chọn lọc 🥐',
    photos: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'rev-3',
    userName: 'Hoàng Nam',
    rating: 5,
    date: '30/09/2026 20:15',
    tags: ['Số lượng đầy đặn', 'Thân thiện & nhanh chóng', 'Đáng giá tiền'],
    comment:
      'Lấy đồ cực nhanh, quét mã là nhân viên đưa túi ngay. Đồ ăn chất lượng tương đương giá gốc 100k mà mua có hơn 30k. Quá tuyệt vời!',
    bagName: 'Túi thực phẩm xanh 🥗',
  },
  {
    id: 'rev-4',
    userName: 'Thu Trang',
    rating: 4,
    date: '28/09/2026 19:00',
    tags: ['Chất lượng tốt', 'Đáng trải nghiệm'],
    comment:
      'Đồ ăn tươi ngon, đóng hộp sạch sẽ. Giờ nhận hơi muộn một chút nhưng hoàn toàn xứng đáng với mức giá này.',
    bagName: 'Túi bánh gia đình 🥐🥖',
  },
  {
    id: 'rev-5',
    userName: 'Tuấn Kiệt',
    rating: 5,
    date: '25/09/2026 18:40',
    tags: ['Số lượng đầy đặn', 'Đáng giá tiền', 'Ủng hộ môi trường'],
    comment:
      'Chủ quán rất nhiệt tình giải thích về việc giảm lãng phí thức ăn. Ủng hộ tinh thần bảo vệ môi trường của app và quán!',
    bagName: 'Túi cứu trợ đặc biệt 🍱',
  },
  {
    id: 'rev-6',
    userName: 'Linh Chi',
    rating: 4,
    date: '22/09/2026 20:30',
    tags: ['Ngon miệng', 'Tiết kiệm'],
    comment:
      'Bánh bông lan và bánh mì phô mai đều ngon. Sẽ canh giờ mua tiếp vào các ngày sau.',
    bagName: 'Túi bánh tươi chọn lọc 🥐',
  },
];

export function MerchantReviewsView({ merchant, onBack }: MerchantReviewsViewProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('recommended');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  if (!merchant) {
    return (
      <div className="customer-reviews-screen">
        <header className="customer-reviews-header">
          <button
            type="button"
            className="customer-reviews-back-btn"
            onClick={onBack}
            aria-label="Quay lại"
          >
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
          <h1 className="customer-reviews-title">Reviews</h1>
          <div className="customer-reviews-header-spacer" />
        </header>
        <EmptyState title="Không tìm thấy đánh giá cửa hàng" />
      </div>
    );
  }

  const totalReviews = merchant.totalRatings || 92;
  const ratingValue = merchant.rating ? merchant.rating.toFixed(1) : '4.5';

  // Tính toán breakdown tỉ lệ sao
  const breakdown = useMemo(() => {
    const star5 = Math.round(totalReviews * 0.75);
    const star4 = Math.round(totalReviews * 0.09);
    const star3 = Math.round(totalReviews * 0.09);
    const star2 = Math.round(totalReviews * 0.05);
    const star1 = Math.max(1, totalReviews - star5 - star4 - star3 - star2);

    return [
      { stars: 5, count: star5, pct: (star5 / totalReviews) * 100 },
      { stars: 4, count: star4, pct: (star4 / totalReviews) * 100 },
      { stars: 3, count: star3, pct: (star3 / totalReviews) * 100 },
      { stars: 2, count: star2, pct: (star2 / totalReviews) * 100 },
      { stars: 1, count: star1, pct: (star1 / totalReviews) * 100 },
    ];
  }, [totalReviews]);

  // Lọc và sắp xếp review theo tab
  const filteredReviews = useMemo(() => {
    const list = [...INITIAL_REVIEWS];
    switch (activeTab) {
      case 'latest':
        return list.reverse();
      case 'highest':
        return list.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return list.sort((a, b) => a.rating - b.rating);
      case 'recommended':
      default:
        return list;
    }
  }, [activeTab]);

  return (
    <div className="customer-reviews-screen">
      {/* 1. Header Bar */}
      <header className="customer-reviews-header">
        <button
          type="button"
          className="customer-reviews-back-btn"
          onClick={onBack}
          aria-label="Quay lại"
        >
          <ChevronLeft size={22} strokeWidth={2.4} />
        </button>
        <h1 className="customer-reviews-title">Đánh giá</h1>
        <div className="customer-reviews-header-spacer" />
      </header>

      {/* 2. Top Rating Card & Breakdown */}
      <section className="customer-reviews-card">
        <div className="customer-reviews-score-col">
          <div className="customer-reviews-big-score">{ratingValue}</div>
          <div className="customer-reviews-stars-row">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={16} fill="var(--color-offer-accent)" color="var(--color-offer-accent)" />
            ))}
          </div>
          <div className="customer-reviews-based-text">
            Dựa trên {totalReviews} đánh giá
          </div>
        </div>

        <div className="customer-reviews-breakdown-col">
          {breakdown.map((item) => (
            <div key={item.stars} className="customer-reviews-bar-row">
              <span className="customer-reviews-bar-label">
                {item.stars} <Star size={11} fill="var(--color-offer-accent)" color="var(--color-offer-accent)" />
              </span>
              <div className="customer-reviews-bar-track">
                <div
                  className="customer-reviews-bar-fill"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <span className="customer-reviews-bar-count">{item.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Filter Tabs Segmented Control */}
      <section className="customer-reviews-tabs-wrap">
        <div className="customer-reviews-segmented">
          <button
            type="button"
            className={`customer-reviews-tab ${activeTab === 'recommended' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('recommended')}
          >
            Đề xuất
          </button>
          <button
            type="button"
            className={`customer-reviews-tab ${activeTab === 'latest' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('latest')}
          >
            Mới nhất
          </button>
          <button
            type="button"
            className={`customer-reviews-tab ${activeTab === 'highest' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('highest')}
          >
            Sao cao nhất
          </button>
          <button
            type="button"
            className={`customer-reviews-tab ${activeTab === 'lowest' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('lowest')}
          >
            Sao thấp nhất
          </button>
        </div>
      </section>

      {/* 5. Reviews List */}
      <section className="customer-reviews-list-wrap">
        {filteredReviews.map((rev) => (
          <article key={rev.id} className="customer-review-entry">
            <div className="customer-review-entry-header">
              <div className="customer-review-avatar-wrap">
                <span className="customer-review-avatar-circle">
                  {rev.userName.slice(0, 1).toUpperCase()}
                </span>
                <div className="customer-review-user-info">
                  <span className="customer-review-username">{rev.userName}</span>
                  <div className="customer-review-user-stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={13}
                        fill={s <= rev.rating ? 'var(--color-offer-accent)' : 'none'}
                        color={s <= rev.rating ? 'var(--color-offer-accent)' : 'var(--color-border-subtle)'}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <time className="customer-review-date">{rev.date}</time>
            </div>

            {/* Praise Tag Pills */}
            {rev.tags.length > 0 && (
              <div className="customer-review-tags-row">
                {rev.tags.map((tag, idx) => (
                  <span key={idx} className="customer-review-tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Review Comment Text */}
            <p className="customer-review-comment">{rev.comment}</p>

            {/* Bag Purchased Pill */}
            {rev.bagName && (
              <div className="customer-review-bag-pill">
                <ShoppingBag size={12} strokeWidth={2.2} />
                <span>{rev.bagName}</span>
              </div>
            )}

            {/* Attached Photos */}
            {rev.photos && rev.photos.length > 0 && (
              <div className="customer-review-attached-photos">
                {rev.photos.map((p, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    className="customer-review-attached-photo-btn"
                    onClick={() => setActivePhoto(p)}
                  >
                    <img src={p} alt="Ảnh chụp thực tế đính kèm" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </section>

      {/* Lightbox / Photo Zoom Modal */}
      {activePhoto && (
        <div className="customer-reviews-lightbox" onClick={() => setActivePhoto(null)}>
          <button
            type="button"
            className="customer-reviews-lightbox-close"
            onClick={() => setActivePhoto(null)}
            aria-label="Đóng"
          >
            <X size={24} />
          </button>
          <img src={activePhoto} alt="Xem ảnh phóng to" />
        </div>
      )}
    </div>
  );
}
