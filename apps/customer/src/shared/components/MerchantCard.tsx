import { useState } from 'react';
import { Clock, MapPin, Navigation, Star, Tag } from 'lucide-react';
import type { Merchant } from '../types/customer.types';
import { optimizeImageUrl } from '../../services/customer.service';

interface MerchantCardProps {
  merchant: Merchant;
  detail?: string;
  meta?: string;
  showArrow?: boolean;
  onClick: (merchant: Merchant) => void;
}

const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80';

const formatDistance = (dist?: number) => {
  if (dist === undefined || dist === null) return null;
  const meters = dist < 50 ? dist * 1000 : dist;
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export function MerchantCard({ merchant, meta, onClick }: MerchantCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const rawSrc = merchant.banner || merchant.logo;
  const imageSrc = !imgFailed && rawSrc ? optimizeImageUrl(rawSrc, 1000, 80) : DEFAULT_BANNER;
  const distanceText = formatDistance(merchant.distance);
  const isOpen = merchant.isOpen ?? true;

  return (
    <article
      className="customer-merchant-card"
      onClick={() => onClick(merchant)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(merchant);
        }
      }}
    >
      {/* Full-bleed background image with smooth hover scale */}
      <div className="customer-merchant-card-media">
        <img
          src={imageSrc}
          alt={merchant.name}
          className="customer-merchant-card-img"
          loading="lazy"
          onError={(e) => {
            if (!imgFailed) {
              setImgFailed(true);
            } else {
              (e.currentTarget as HTMLImageElement).src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%232e5b3f"/></svg>';
            }
          }}
        />
        <div className="customer-merchant-card-scrim" />
      </div>

      {/* Floating content overlay */}
      <div className="customer-merchant-card-overlay">
        {/* Top: Status & Distance */}
        <div className="customer-merchant-card-top">
          <span className={`customer-merchant-status-badge ${isOpen ? 'is-open' : 'is-closed'}`}>
            <span className="customer-merchant-status-dot" />
            {isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
          </span>

          {distanceText && (
            <span className="customer-merchant-distance-badge">
              <Navigation size={11} strokeWidth={2.2} />
              <span>Cách {distanceText}</span>
            </span>
          )}
        </div>

        {/* Bottom: Store info with guaranteed legibility */}
        <div className="customer-merchant-card-bottom">
          <h3 className="customer-merchant-card-title">{merchant.name}</h3>

          <div className="customer-merchant-card-address">
            <MapPin size={12} strokeWidth={2} className="customer-merchant-card-pin" />
            <span>{merchant.address}</span>
          </div>

          <div className="customer-merchant-card-meta-row">
            {merchant.rating > 0 && (
              <span className="customer-merchant-chip chip-rating">
                <Star size={11} fill="#FBBF24" color="#FBBF24" />
                <strong>{merchant.rating.toFixed(1)}</strong>
                {merchant.totalRatings ? <span>({merchant.totalRatings})</span> : null}
              </span>
            )}

            {merchant.openingHours && (
              <span className="customer-merchant-chip chip-hours">
                <Clock size={11} strokeWidth={1.8} />
                <span>{merchant.openingHours}</span>
              </span>
            )}

            {meta && (
              <span className="customer-merchant-chip chip-deal">
                <Tag size={11} strokeWidth={2} />
                <span>{meta}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

