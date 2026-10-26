import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Share2, Store } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { optimizeImageUrl } from '../../../services/customer.service';
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
  const [copied, setCopied] = useState(false);

  if (!brand)
    return (
      <div className="customer-screen">
        <header className="customer-screen-header">
          <button type="button" className="customer-round-button" onClick={onBack} aria-label="Quay lại">
            <ChevronLeft size={21} />
          </button>
          <div>
            <h1>Thương hiệu</h1>
          </div>
        </header>
        <EmptyState title="Không tìm thấy thương hiệu" />
      </div>
    );

  const hasLogoImage = isMediaUrl(brand.logo);
  const rawBanner =
    (brand as { banner?: string }).banner ||
    stores[0]?.banner ||
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900';
  const bannerImage = optimizeImageUrl(rawBanner, 800, 80);

  const handleShare = () => {
    if (navigator.share) {
      void navigator
        .share({
          title: brand.name,
          text: `Khám phá các ưu đãi và chi nhánh của ${brand.name} trên GoSavingFood!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate multi-paragraph description matching reference in Image 2
  const descriptionParagraphs = (() => {
    if (brand.description && brand.description.includes('\n')) {
      return brand.description.split('\n').filter(Boolean);
    }
    return [
      brand.description ||
        `${brand.name} là một trong những thương hiệu ẩm thực được đông đảo khách hàng tin tưởng và yêu thích, không ngừng mang đến những trải nghiệm ẩm thực chất lượng và tinh tế cho cộng đồng.`,
      `${brand.name} luôn kiên định với tôn chỉ sử dụng nguồn nguyên liệu tươi mới, an toàn vệ sinh thực phẩm theo các tiêu chuẩn nghiêm ngặt. Từng sản phẩm đều được chế biến và kiểm định kỹ lưỡng nhằm giữ trọn hương vị tươi ngon đặc trưng.`,
      `Đồng hành cùng GoSavingFood, ${brand.name} cam kết giảm thiểu lãng phí thực phẩm mỗi ngày. Mỗi phần ăn và túi bất ngờ được trao đi là một hành động thiết thực cùng chung tay bảo vệ môi trường và lan tỏa giá trị xanh bền vững.`,
    ];
  })();

  return (
    <div className="customer-brand-page-screen">
      {/* Top Hero Banner */}
      <div className="customer-brand-detail-hero">
        <img src={bannerImage} alt={brand.name} className="customer-brand-hero-cover" />
        <div className="customer-brand-hero-overlay" />

        <div className="customer-brand-hero-nav">
          <button
            type="button"
            className="customer-brand-nav-btn"
            onClick={onBack}
            aria-label="Quay lại"
          >
            <ChevronLeft size={24} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className="customer-brand-nav-btn"
            onClick={handleShare}
            aria-label="Chia sẻ thương hiệu"
          >
            <Share2 size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Floating Brand Logo Badge */}
        <div className="customer-brand-floating-logo">
          {hasLogoImage ? (
            <img src={optimizeImageUrl(brand.logo, 200, 80)} alt={brand.name} />
          ) : (
            <Store size={32} />
          )}
        </div>
      </div>

      {copied && (
        <div className="customer-brand-share-toast">
          Đã sao chép liên kết thương hiệu!
        </div>
      )}

      {/* Brand Information Body */}
      <div className="customer-brand-detail-body">
        <h1 className="customer-brand-title">{brand.name}</h1>

        <div className="customer-brand-description-section">
          {descriptionParagraphs.map((para, i) => (
            <p key={i} className="customer-brand-paragraph">
              {para}
            </p>
          ))}
        </div>

        {/* Store List Section */}
        <div className="customer-brand-stores-section">
          <div className="customer-brand-stores-header">
            <div className="customer-brand-stores-icon-wrap">
              <Store size={18} />
            </div>
            <div>
              <h3>Danh sách cửa hàng ({stores.length})</h3>
              <p>Hệ thống chi nhánh của {brand.name} trên GoSavingFood</p>
            </div>
          </div>

          {stores.length > 0 ? (
            <div className="customer-brand-stores-grid">
              {stores.map((store) => (
                <article
                  key={store.id}
                  className="customer-brand-store-card"
                  onClick={() => onOpenMerchant(store)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenMerchant(store);
                    }
                  }}
                >
                  <div className="customer-brand-store-media">
                    <img
                      src={store.logo || store.banner}
                      alt={store.name}
                      className="customer-brand-store-thumb"
                      loading="lazy"
                    />
                  </div>
                  <div className="customer-brand-store-content">
                    <div className="customer-brand-store-name-row">
                      <h4 className="customer-brand-store-name">{store.name}</h4>
                      <span
                        className={`customer-brand-store-tag ${
                          store.isOpen ? 'is-open' : 'is-closed'
                        }`}
                      >
                        {store.isOpen ? 'Đang mở' : 'Đã đóng'}
                      </span>
                    </div>
                    <p className="customer-brand-store-addr">
                      <MapPin size={12} />
                      <span>{store.address}</span>
                    </p>
                    <div className="customer-brand-store-meta">
                      <span className="customer-brand-store-time">
                        <Clock size={11} /> {store.openingHours}
                      </span>
                      <span className="customer-brand-store-rating">
                        ★ {store.rating} · Cách ~{(store.distance / 1000).toFixed(1)} km
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="customer-brand-store-arrow" />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Đang cập nhật chi nhánh"
              description={`Hiện tại các chi nhánh của ${brand.name} đang chuẩn bị ra mắt.`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
