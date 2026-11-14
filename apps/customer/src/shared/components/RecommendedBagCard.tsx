import { useMemo } from 'react';
import { Clock3, Star } from 'lucide-react';
import type { SurpriseBag } from '../types/customer.types';
import { getBagTimingInfo } from '../utils/bagTiming';

interface RecommendedBagCardProps {
  bag: SurpriseBag;
  distanceLabel?: string;
  onOpen: (bag: SurpriseBag) => void;
}

export function RecommendedBagCard({
  bag,
  distanceLabel = '0.8 km',
  onOpen,
}: RecommendedBagCardProps) {
  const discount = Math.round((1 - bag.discountPrice / bag.originalPrice) * 100);
  const rating = (bag.rating || 4.7).toFixed(1);
  const timing = getBagTimingInfo(bag);

  // Deterministic review count for realistic display like in reference
  const reviewCount = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < bag.id.length; i++) {
      hash = (hash * 31 + bag.id.charCodeAt(i)) % 80;
    }
    return hash > 5 ? hash : hash + 6;
  }, [bag.id]);

  return (
    <article
      className="customer-recommended-item"
      onClick={() => onOpen(bag)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(bag);
        }
      }}
    >
      <div className="customer-recommended-media">
        <img
          src={bag.imageUrl}
          alt={bag.name}
          className="customer-recommended-thumb"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300';
          }}
        />
      </div>

      <div className="customer-recommended-body">
        <div className="customer-recommended-top">
          <h3 className="customer-recommended-merchant" title={bag.merchantName}>
            {bag.merchantName}
          </h3>
          <h4 className="customer-recommended-name" title={bag.name}>
            {bag.name}
          </h4>
          {discount > 0 && (
            <span className="customer-recommended-badge">
              -{discount}%
            </span>
          )}
        </div>

        <div className="customer-recommended-bottom">
          <div className="customer-recommended-meta">
            <div className="customer-recommended-time">
              <Clock3 size={13} strokeWidth={2} />
              <span>
                {timing.phase === 'upcoming'
                  ? `Sắp mở (${bag.pickupStart || '18:30'})`
                  : bag.bagType === 'shelf_life' && bag.expiryDate
                  ? `HSD: ${bag.expiryDate.split('-').reverse().slice(0, 2).join('/')} (${bag.pickupStart}–${bag.pickupEnd})`
                  : `Hôm nay ${bag.pickupStart || '18:30'} – ${bag.pickupEnd || '20:30'}`}
              </span>
            </div>
            <div className="customer-recommended-rating">
              <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
              <span>
                {rating} ({reviewCount}) – {distanceLabel}
              </span>
            </div>
          </div>

          <div className="customer-recommended-pricing">
            <span className="customer-recommended-price-old">
              {bag.originalPrice.toLocaleString('vi-VN')}đ
            </span>
            <strong className="customer-recommended-price-new">
              {bag.discountPrice.toLocaleString('vi-VN')}đ
            </strong>
          </div>
        </div>
      </div>
    </article>
  );
}
