import { Clock3, MapPin, Plus } from 'lucide-react';
import { Badge, Button } from '@gosavingfood/ui';
import type { SurpriseBag } from '../types/customer.types';
import { PriceDisplay } from './PriceDisplay';

interface BagCardProps {
  bag: SurpriseBag;
  compact?: boolean;
  distanceLabel?: string;
  onOpen: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => void;
}

export function BagCard({ bag, compact = false, distanceLabel = '0,8 km', onOpen, onAdd }: BagCardProps) {
  const discount = Math.round((1 - bag.discountPrice / bag.originalPrice) * 100);
  return (
    <article className={`customer-bag-card ${compact ? 'is-compact' : ''}`}>
      <button type="button" className="customer-bag-image" onClick={() => onOpen(bag)}>
        <img src={bag.imageUrl} alt="" />
        <Badge variant="error">-{discount}%</Badge>
        <span className="customer-distance"><MapPin size={12} /> {distanceLabel}</span>
      </button>
      <div className="customer-bag-content">
        <span className="customer-bag-merchant">{bag.merchantName}</span>
        <button type="button" className="customer-bag-title" onClick={() => onOpen(bag)}>{bag.name}</button>
        <div className="customer-pickup-line"><Clock3 size={14} /> {bag.pickupStart}–{bag.pickupEnd}</div>
        <div className="customer-bag-footer">
          <PriceDisplay original={bag.originalPrice} current={bag.discountPrice} />
          <Button size="sm" onClick={() => onAdd(bag)} aria-label={`Thêm ${bag.name}`}><Plus size={17} /></Button>
        </div>
        <small className="customer-stock">Chỉ còn {bag.quantity} túi</small>
      </div>
    </article>
  );
}
