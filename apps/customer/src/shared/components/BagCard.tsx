import { useState } from 'react';
import { Check, Clock3, MapPin, Plus } from 'lucide-react';
import type { SurpriseBag } from '../types/customer.types';
import { getBagTimingInfo } from '../utils/bagTiming';
import { optimizeImageUrl } from '../../services/customer.service';
import { PriceDisplay } from './PriceDisplay';

interface BagCardProps {
  bag: SurpriseBag;
  compact?: boolean;
  distanceLabel?: string;
  onOpen: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => boolean | void;
}

export function BagCard({ bag, compact = false, distanceLabel = '0,8 km', onOpen, onAdd }: BagCardProps) {
  const [added, setAdded] = useState(false);
  const discount = Math.round((1 - bag.discountPrice / bag.originalPrice) * 100);
  const timing = getBagTimingInfo(bag);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!timing.canOrder) {
      alert(timing.detailMessage);
      return;
    }
    const res = onAdd(bag);
    if (res !== false) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1200);
    }
  };
  return (
    <article
      className={`customer-bag-card ${compact ? 'is-compact' : ''}`}
      onClick={() => onOpen(bag)}
    >
      <div className="customer-bag-media">
        <img src={optimizeImageUrl(bag.imageUrl, 480, 75)} alt={bag.name} className="customer-bag-photo" loading="lazy" />
      </div>

      <div className="customer-bag-top-badges">
        <span className="customer-discount-tag">-{discount}%</span>
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
              {distanceLabel && (
                <span className="customer-bag-distance">
                  • <MapPin size={10} /> {distanceLabel}
                </span>
              )}
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
            aria-label={timing.canOrder ? `Thêm ${bag.name}` : timing.badgeLabel}
            title={timing.canOrder ? `Thêm ${bag.name}` : timing.detailMessage}
            style={!timing.canOrder ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            {added ? (
              <Check size={16} strokeWidth={3} />
            ) : !timing.canOrder ? (
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
