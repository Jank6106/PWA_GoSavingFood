import { Sparkles, ShoppingBag, TicketPercent, Globe2 } from 'lucide-react';
import type { Banner } from '../../../shared/types/customer.types';

interface HomeBannerProps {
  banners: Banner[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

const bannerIcons: Record<string, typeof ShoppingBag> = {
  bag: ShoppingBag,
  ticket: TicketPercent,
  globe: Globe2,
  salad: ShoppingBag,
};

export function HomeBanner({ banners, currentIndex, onSelectIndex }: HomeBannerProps) {
  if (!banners.length) return null;
  const currentBanner = banners[currentIndex] ?? banners[0];
  const IconComponent = bannerIcons[currentBanner.icon] ?? ShoppingBag;

  return (
    <div className="customer-banner-bleed">
      <section className={`customer-campaign is-${currentBanner.accent}`}>
        <div className="customer-campaign-ambient" aria-hidden="true" />
        <div className="customer-campaign-content">
          <span className="customer-campaign-eyebrow">
            <Sparkles size={13} />
            {currentBanner.eyebrow}
          </span>
          <h1>{currentBanner.title}</h1>
          <p>{currentBanner.description}</p>
        </div>
        <div className="customer-campaign-graphic" aria-hidden="true">
          <div className="customer-campaign-graphic-badge">
            <IconComponent size={64} strokeWidth={1.4} />
          </div>
        </div>
        <div className="customer-campaign-dots" role="tablist" aria-label="Danh sách banner">
          {banners.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === currentIndex ? 'is-active' : ''}
              onClick={() => onSelectIndex(index)}
              aria-label={`Chuyển tới banner ${index + 1}`}
              aria-selected={index === currentIndex}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
