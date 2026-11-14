import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Info } from 'lucide-react';
import { Skeleton } from '@gosavingfood/ui';
import { BagCard, SectionHeading } from '../../../shared/components';
import type { Merchant, SurpriseBag } from '../../../shared/types/customer.types';
import {
  filterAndRankTodayDeals,
  formatMerchantDistance,
  getNowVietnam,
} from '../../../shared/utils/customerDeals';
import './today-deals.css';

export interface TodayDealsProps {
  bags: SurpriseBag[];
  merchants: Merchant[];
  isLoading?: boolean;
  onOpenBag: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => boolean | void;
}

export function TodayDeals({
  bags,
  merchants,
  isLoading = false,
  onOpenBag,
  onAdd,
}: TodayDealsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Bounded tick (30s) + focus re-evaluation để đảm bảo hết giờ nhận thì món tự động ẩn ngay
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // 1. Tick định kỳ 30 giây (local timer, không gọi network)
    const interval = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 30000);

    // 2. Tái đánh giá ngay lập tức khi người dùng quay lại tab/app
    const handleReevaluate = () => {
      setTick((prev) => prev + 1);
    };

    window.addEventListener('focus', handleReevaluate);
    document.addEventListener('visibilitychange', handleReevaluate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleReevaluate);
      document.removeEventListener('visibilitychange', handleReevaluate);
    };
  }, []);

  // Map tra cứu cửa hàng
  const merchantsMap = useMemo(() => {
    const map = new Map<string, Merchant>();
    for (const m of merchants) {
      map.set(m.id, m);
    }
    return map;
  }, [merchants]);

  // Lọc và xếp hạng ưu đãi hôm nay dựa trên giờ Việt Nam hiện thời
  const deals = useMemo(() => {
    // tick là dependency để re-evaluate theo thời gian thực
    const nowVn = getNowVietnam();
    return filterAndRankTodayDeals(bags, merchants, nowVn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bags, merchants, tick]);

  // Kiểm tra xem danh mục có chứa dữ liệu demo hay không để hiển thị thông báo minh bạch
  const hasDemoData = useMemo(() => {
    return deals.some((d) => d.catalogSource === 'demo') || bags.some((b) => b.catalogSource === 'demo');
  }, [deals, bags]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    const timer = setTimeout(checkScroll, 150);
    const ro = new ResizeObserver(() => checkScroll());
    ro.observe(el);
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [deals.length]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.75, 280);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Trạng thái đang tải
  if (isLoading) {
    return (
      <section className="customer-content-section customer-home-block today-deals-section">
        <SectionHeading
          icon={<Flame size={24} strokeWidth={2.4} className="today-deals-icon" />}
          title="Hời nhất hôm nay"
        />
        <div className="customer-horizontal-list customer-category-bag-list today-deals-list">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="today-deals-skeleton-card">
              <Skeleton height="100%" borderRadius="14px" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Khi chưa có ưu đãi nào đạt điều kiện
  if (deals.length === 0) {
    if (bags.length === 0) {
      return null;
    }
    return (
      <section className="customer-content-section customer-home-block today-deals-section">
        <SectionHeading
          icon={<Flame size={24} strokeWidth={2.4} className="today-deals-icon" />}
          title="Hời nhất hôm nay"
        />
        <div className="today-deals-empty" role="status">
          <div className="today-deals-empty-title">Chưa có ưu đãi phù hợp mở bán hôm nay</div>
          <div className="today-deals-empty-desc">
            Các ưu đãi giá tốt sẽ xuất hiện khi cửa hàng đăng túi giải cứu trong khung giờ nhận. Vui lòng quay lại sau bạn nhé!
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="customer-content-section customer-home-block today-deals-section">
      <SectionHeading
        icon={<Flame size={24} strokeWidth={2.4} className="today-deals-icon" />}
        title="Hời nhất hôm nay"
      />

      {hasDemoData && (
        <div className="today-deals-demo-notice" role="note">
          <Info size={14} className="today-deals-demo-notice-icon" />
          <span>Danh mục hiển thị bao gồm dữ liệu demo để thử nghiệm tính năng, không đại diện đối tác thực tế.</span>
        </div>
      )}

      <div className="customer-category-row-wrapper today-deals-row-wrapper">
        <button
          type="button"
          className={`customer-category-nav-btn today-deals-nav-btn is-prev ${!canScrollLeft ? 'is-disabled' : ''}`}
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          aria-label="Cuộn sang trái"
        >
          <ChevronLeft size={20} strokeWidth={2.4} />
        </button>

        <div ref={scrollRef} className="customer-horizontal-list customer-category-bag-list today-deals-list">
          {deals.map((bag) => {
            const merchant = merchantsMap.get(bag.merchantId);
            const distanceLabel = formatMerchantDistance(merchant);
            return (
              <BagCard
                key={bag.id}
                bag={bag}
                compact
                distanceLabel={distanceLabel}
                onOpen={onOpenBag}
                onAdd={onAdd}
              />
            );
          })}
        </div>

        <button
          type="button"
          className={`customer-category-nav-btn today-deals-nav-btn is-next ${!canScrollRight ? 'is-disabled' : ''}`}
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          aria-label="Cuộn sang phải"
        >
          <ChevronRight size={20} strokeWidth={2.4} />
        </button>
      </div>
    </section>
  );
}
