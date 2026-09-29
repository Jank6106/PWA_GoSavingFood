import { ArrowRight, Coffee, Croissant, MapPin, Salad, Store, UtensilsCrossed } from 'lucide-react';
import type { Merchant } from '../types/customer.types';

interface MerchantCardProps {
  merchant: Merchant;
  detail?: string;
  meta?: string;
  showArrow?: boolean;
  onClick: (merchant: Merchant) => void;
}

const isMediaUrl = (url?: string | null) =>
  Boolean(url && (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')));

const getMerchantIcon = (merchant: Merchant) => {
  const name = merchant.name.toLowerCase();
  if (name.includes('baguette') || name.includes('bánh')) return Croissant;
  if (name.includes('coffee') || name.includes('cà phê') || name.includes('trà')) return Coffee;
  if (name.includes('bowl') || name.includes('salad') || name.includes('green')) return Salad;
  if (name.includes('bếp') || name.includes('cơm')) return UtensilsCrossed;
  return Store;
};

export function MerchantCard({ merchant, detail, meta, showArrow = true, onClick }: MerchantCardProps) {
  const Icon = getMerchantIcon(merchant);
  const hasLogoImage = isMediaUrl(merchant.logo);

  return (
    <button type="button" className="customer-merchant-card" onClick={() => onClick(merchant)}>
      <span className="customer-merchant-logo">
        {hasLogoImage ? (
          <img src={merchant.logo} alt={merchant.name} />
        ) : (
          <Icon size={24} strokeWidth={1.8} />
        )}
      </span>
      <span>
        <strong>{merchant.name}</strong>
        <small><MapPin size={12} /> {detail ?? `★ ${merchant.rating} · ${merchant.distance.toLocaleString('vi-VN')} km`}</small>
        {meta && <em>{meta}</em>}
      </span>
      {showArrow && <ArrowRight size={18} />}
    </button>
  );
}
