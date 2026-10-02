import { useState } from 'react';
import { Check, Clock3, MapPin, Plus } from 'lucide-react';
import type { SurpriseBag } from '../types/customer.types';
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

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        <img src={bag.imageUrl} alt={bag.name} className="customer-bag-photo" loading="lazy" />
      </div>

      <div className="customer-bag-top-badges">
        <span className="customer-discount-tag">-{discount}%</span>
        <span className="customer-distance-tag">
          <MapPin size={11} /> {distanceLabel}
        </span>
      </div>

      <div className="customer-bag-overlay">
        <div className="customer-bag-info">
          <span className="customer-bag-merchant">{bag.merchantName}</span>
          <h3 className="customer-bag-title">{bag.name}</h3>
          <div className="customer-bag-meta-row">
            <span className="customer-bag-time">
              <Clock3 size={11} /> {bag.pickupStart}–{bag.pickupEnd}
            </span>
            <span className="customer-bag-stock">Còn {bag.quantity} túi</span>
          </div>
        </div>

        <div className="customer-bag-bottom-row">
          <PriceDisplay original={bag.originalPrice} current={bag.discountPrice} />
          <button
            type="button"
            className={`customer-bag-add-btn ${added ? 'is-added' : ''}`}
            onClick={handleAdd}
            aria-label={`Thêm ${bag.name}`}
          >
            {added ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={2.8} />}
          </button>
        </div>
      </div>
    </article>
  );
}
