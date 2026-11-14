import { useState } from 'react';
import { Check, Clock3, MapPin, Plus } from 'lucide-react';
import type { SurpriseBag } from '../types/customer.types';
import { getBagTimingInfo } from '../utils/bagTiming';
import { optimizeImageUrl } from '../../services/customer.service';
import { PriceDisplay } from './PriceDisplay';
import { calculateDiscountPercent, canOrderBag } from '../utils/customerDeals';

// Placeholder trung tính: biểu tượng túi giải cứu thực phẩm chuẩn nhận diện GoSavingFood,
// không thay thế bằng ảnh món ăn cụ thể không liên quan gây hiểu nhầm cho khách hàng.
const NEUTRAL_BAG_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#0f291e"/>
      <g fill="none" stroke="#6ee7b7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(176, 105)">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </g>
      <text x="200" y="175" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#a7d0b8" text-anchor="middle">Hình minh họa túi giải cứu</text>
    </svg>`
  );

interface BagCardProps {
  bag: SurpriseBag;
  compact?: boolean;
  distanceLabel?: string;
  onOpen: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => boolean | void;
}

export function BagCard({ bag, compact = false, distanceLabel = '', onOpen, onAdd }: BagCardProps) {
  const [added, setAdded] = useState(false);
  const timing = getBagTimingInfo(bag);

  // Tính phần trăm giảm giá: 0đ => 100% (không clamp 99), null nếu không có giảm giá hoặc giá không hợp lệ
  const discount = calculateDiscountPercent(bag.originalPrice, bag.discountPrice);

  // canOrderNow: chặn giá âm/NaN/Infinity, status expired/archive, listing expired,
  // và kiểm tra cả trường hợp shelf-life đã quá khung giờ nhận hôm nay.
  const canOrderNow = canOrderBag(bag, timing.canOrder);

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const latestTiming = getBagTimingInfo(bag);
    if (!canOrderBag(bag, latestTiming.canOrder)) {
      if (latestTiming.detailMessage) {
        alert(latestTiming.detailMessage);
      }
      return;
    }
    const res = onAdd(bag);
    if (res !== false) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1200);
    }
  };

  return (
    <article className={`customer-bag-card ${compact ? 'is-compact' : ''}`}>
      {/* Nút hành động mở chi tiết trải khắp thẻ (semantic button sibling, không bọc nút con) */}
      <button
        type="button"
        className="customer-bag-card-action"
        onClick={() => onOpen(bag)}
        aria-label={`Xem chi tiết túi ${bag.name} tại ${bag.merchantName}`}
      />

      <div className="customer-bag-media">
        <img
          src={optimizeImageUrl(bag.imageUrl, 480, 75)}
          alt={bag.name ? `Túi giải cứu ${bag.name}` : 'Túi giải cứu thực phẩm'}
          className="customer-bag-photo"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (!target.dataset.fallbackApplied) {
              target.dataset.fallbackApplied = 'true';
              target.src = NEUTRAL_BAG_PLACEHOLDER;
              target.alt = 'Hình minh họa túi giải cứu thực phẩm';
            }
          }}
        />
      </div>

      <div className="customer-bag-top-badges">
        <div className="customer-bag-top-badges-left">
          {discount !== null && (
            <span className="customer-discount-tag">-{discount}%</span>
          )}
          {bag.catalogSource === 'demo' && (
            <span className="customer-demo-tag" title="Dữ liệu thử nghiệm, không đại diện đối tác thật">
              Dữ liệu demo
            </span>
          )}
        </div>

        {timing.phase !== 'available' ? (
          <span
            className="customer-status-tag"
            style={{
              background:
                timing.badgeVariant === 'yellow'
                  ? '#fef08a'
                  : timing.badgeVariant === 'orange'
                  ? '#ffedd5'
                  : timing.badgeVariant === 'red'
                  ? '#fee2e2'
                  : '#e5e7eb',
              color:
                timing.badgeVariant === 'yellow'
                  ? '#854d0e'
                  : timing.badgeVariant === 'orange'
                  ? '#9a3412'
                  : timing.badgeVariant === 'red'
                  ? '#991b1b'
                  : '#374151',
              fontWeight: 600,
            }}
          >
            <Clock3 size={11} /> {timing.badgeLabel}
          </span>
        ) : (bag.bagType === 'shelf_life' && bag.expiryDate) ? (
          <span
            className="customer-status-tag"
            style={{ background: '#dcfce7', color: '#166534', fontWeight: 600 }}
          >
            <Clock3 size={11} /> {timing.badgeLabel}
          </span>
        ) : null}
      </div>

      <div className="customer-bag-overlay">
        <div className="customer-bag-info">
          <span className="customer-bag-merchant">{bag.merchantName}</span>
          <h3 className="customer-bag-title">{bag.name}</h3>
          <div className="customer-bag-meta-row">
            <div className="customer-bag-time-group">
              <span className="customer-bag-time">
                <Clock3 size={11} /> {bag.pickupStart}–{bag.pickupEnd}
              </span>
              {distanceLabel ? (
                <span className="customer-bag-distance">
                  • <MapPin size={10} /> {distanceLabel}
                </span>
              ) : null}
            </div>
            <span
              className="customer-bag-stock"
              style={bag.quantity <= 0 ? { color: '#ef4444', fontWeight: 700 } : undefined}
            >
              {bag.quantity > 0 ? `Còn ${bag.quantity} túi` : 'Hết hàng'}
            </span>
          </div>
        </div>

        <div className="customer-bag-bottom-row">
          <PriceDisplay original={bag.originalPrice} current={bag.discountPrice} />
          <button
            type="button"
            className={`customer-bag-add-btn ${added ? 'is-added' : ''}`}
            onClick={handleAdd}
            disabled={!canOrderNow}
            aria-label={canOrderNow ? `Thêm ${bag.name} vào giỏ hàng` : (timing.badgeLabel || 'Không thể đặt')}
            title={canOrderNow ? `Thêm ${bag.name} vào giỏ hàng` : (timing.detailMessage || 'Tạm thời không thể đặt')}
            style={!canOrderNow ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          >
            {added ? (
              <Check size={16} strokeWidth={3} />
            ) : !canOrderNow ? (
              <Clock3 size={15} strokeWidth={2.5} />
            ) : (
              <Plus size={16} strokeWidth={2.8} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
