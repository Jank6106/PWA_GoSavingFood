import { ArrowRight, MapPin } from 'lucide-react';
import type { Merchant } from '../types/customer.types';

interface MerchantCardProps {
  merchant: Merchant;
  detail?: string;
  meta?: string;
  showArrow?: boolean;
  onClick: (merchant: Merchant) => void;
}

export function MerchantCard({ merchant, detail, meta, showArrow = true, onClick }: MerchantCardProps) {
  return (
    <button type="button" className="customer-merchant-card" onClick={() => onClick(merchant)}>
      <span className="customer-merchant-logo">{merchant.logo}</span>
      <span>
        <strong>{merchant.name}</strong>
        <small><MapPin size={12} /> {detail ?? `★ ${merchant.rating} · ${merchant.distance.toLocaleString('vi-VN')} km`}</small>
        {meta && <em>{meta}</em>}
      </span>
      {showArrow && <ArrowRight size={18} />}
    </button>
  );
}
