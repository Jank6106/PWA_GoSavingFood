import { useEffect, useMemo, useRef, useState } from 'react';
import { Coffee, Croissant, Leaf, UtensilsCrossed } from 'lucide-react';
import { optimizeImageUrl } from '../../../services/customer.service';
import type { Brand } from '../../../shared/types/customer.types';

interface BrandMarqueeProps {
  brands: Brand[];
  onOpenBrand: (brand: Brand) => void;
  speed?: number; // Tốc độ trượt (px/giây, ví dụ: 25 là chậm, 50 là vừa, 70 là nhanh)
}

const getBrandIcon = (brand: Brand) => {
  const catList = (brand.categories || []).join(' ').toLowerCase();
  if (catList.includes('bánh')) return Croissant;
  if (catList.includes('uống') || catList.includes('cà phê') || catList.includes('coffee')) return Coffee;
  if (catList.includes('salad') || catList.includes('healthy') || catList.includes('xanh')) return Leaf;
  return UtensilsCrossed;
};

export function BrandMarquee({ brands, onOpenBrand, speed = 50 }: BrandMarqueeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  // Drag tracking
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const [hasDragged, setHasDragged] = useState(false);

  // Repeat brands just enough to fill standard viewports cleanly
  const displayBrands = useMemo(() => {
    if (!brands || brands.length === 0) return [];
    const repeatCount = Math.max(2, Math.ceil(12 / brands.length));
    const baseSet: Brand[] = [];
    for (let i = 0; i < repeatCount; i++) {
      baseSet.push(...brands);
    }
    return [...baseSet, ...baseSet];
  }, [brands]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || displayBrands.length === 0) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const SPEED = speed;

    const tick = (now: number) => {
      const rawDelta = (now - lastTime) / 1000;
      // Cap delta to prevent huge jumps when switching tabs
      const delta = Math.min(rawDelta, 0.1);
      lastTime = now;

      const halfWidth = track.scrollWidth / 2;

      // Không dừng lại khi hover chuột — trượt mượt mà liên tục
      if (!isDragging.current && halfWidth > 0) {
        offsetRef.current -= SPEED * delta;

        if (offsetRef.current <= -halfWidth) {
          offsetRef.current += halfWidth;
        } else if (offsetRef.current > 0) {
          offsetRef.current -= halfWidth;
        }

        track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [displayBrands, speed]);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!trackRef.current) return;
    isDragging.current = true;
    setHasDragged(false);
    startX.current = e.touches[0].clientX;
    startOffset.current = offsetRef.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !trackRef.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    if (Math.abs(diff) > 6) {
      setHasDragged(true);
    }

    const halfWidth = trackRef.current.scrollWidth / 2;
    let nextOffset = startOffset.current + diff;

    if (halfWidth > 0) {
      while (nextOffset <= -halfWidth) nextOffset += halfWidth;
      while (nextOffset > 0) nextOffset -= halfWidth;
    }

    offsetRef.current = nextOffset;
    trackRef.current.style.transform = `translate3d(${nextOffset}px, 0, 0)`;
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    window.setTimeout(() => setHasDragged(false), 80);
  };

  // Mouse handlers for desktop dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    isDragging.current = true;
    setHasDragged(false);
    startX.current = e.clientX;
    startOffset.current = offsetRef.current;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !trackRef.current) return;
    e.preventDefault();
    const diff = e.clientX - startX.current;

    if (Math.abs(diff) > 6) {
      setHasDragged(true);
    }

    const halfWidth = trackRef.current.scrollWidth / 2;
    let nextOffset = startOffset.current + diff;

    if (halfWidth > 0) {
      while (nextOffset <= -halfWidth) nextOffset += halfWidth;
      while (nextOffset > 0) nextOffset -= halfWidth;
    }

    offsetRef.current = nextOffset;
    trackRef.current.style.transform = `translate3d(${nextOffset}px, 0, 0)`;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    window.setTimeout(() => setHasDragged(false), 80);
  };

  if (!brands || brands.length === 0) return null;

  return (
    <div
      className="customer-brand-marquee-viewport"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDragging.current) {
          isDragging.current = false;
          window.setTimeout(() => setHasDragged(false), 80);
        }
      }}
    >
      <div ref={trackRef} className="customer-brand-marquee-flow">
        {displayBrands.map((brand, idx) => {
          const BrandIcon = getBrandIcon(brand);
          const isImageLogo = Boolean(
            brand.logo &&
              (brand.logo.startsWith('http') ||
                brand.logo.startsWith('data:') ||
                brand.logo.startsWith('blob:'))
          );
          return (
            <button
              key={`${brand.id}-${idx}`}
              type="button"
              className="customer-brand-badge-btn"
              onClick={() => {
                if (!hasDragged) {
                  onOpenBrand(brand);
                }
              }}
              aria-label={brand.name}
              title={brand.name}
            >
              {isImageLogo ? (
                <img
                  src={optimizeImageUrl(brand.logo, 100, 75)}
                  alt={brand.name}
                  className="customer-brand-badge-img"
                  width={44}
                  height={44}
                  loading="lazy"
                  draggable={false}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="customer-brand-badge-fallback">
                  <BrandIcon size={24} strokeWidth={1.8} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
