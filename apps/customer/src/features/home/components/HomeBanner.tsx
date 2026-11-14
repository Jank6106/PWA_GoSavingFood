import { Sparkles } from 'lucide-react';
import type { Banner } from '../../../shared/types/customer.types';

interface HomeBannerProps {
  banners: Banner[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export function HomeBanner({ banners, currentIndex, onSelectIndex }: HomeBannerProps) {
  if (!banners.length) return null;

  return (
    <div className="customer-banner-bleed">
      <div className="customer-campaign-slider">
        {banners.map((banner, index) => {
          const isActive = index === currentIndex;
          return (
            <article
              key={banner.id}
              className={`customer-campaign is-${banner.accent} ${isActive ? 'is-active' : ''}`}
              aria-hidden={!isActive}
            >
              {banner.imageUrl && (
                <div className="customer-campaign-media">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="customer-campaign-image"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                  <div className="customer-campaign-overlay" />
                </div>
              )}
              <div className="customer-campaign-content">
                <span className="customer-campaign-eyebrow">
                  <Sparkles size={13} />
                  {banner.eyebrow}
                </span>
                <h1>{banner.title}</h1>
                <p>{banner.description}</p>
              </div>
            </article>
          );
        })}

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
      </div>
    </div>
  );
}
