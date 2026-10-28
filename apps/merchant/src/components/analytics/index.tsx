import {
  Clock,
  CreditCard,
  Flame,
  PackageCheck,
  Sparkles,
  Star,
  Store,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  AnalyticsMetrics,
  AnalyticsTimeframe,
  OrderStatusSlice,
  PaymentChannelStat,
  PeakHourStat,
  RevenueChartPoint,
  ReviewItem,
  MultiPeriodCharts,
} from '../../types';
import { Button, Modal } from '../ui';

function formatVndCurrency(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} VND`;
}

// ============================================================================
// 1. DẢI NÚT LỌC THỜI GIAN (GỌN GÀNG, TRỰC QUAN CHO MERCHANT)
// ============================================================================
export function PeriodFilterBar({
  timeframe,
  onSelectTimeframe,
  customRange,
  onApplyCustomRange,
}: {
  timeframe: AnalyticsTimeframe;
  onSelectTimeframe: (tf: AnalyticsTimeframe) => void;
  customRange?: { start: string; end: string };
  onApplyCustomRange?: (start: string, end: string) => void;
}) {
  const [customModalOpen, setCustomModalOpen] = useState(false);

  const [startDate, setStartDate] = useState(
    customRange?.start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    customRange?.end || new Date().toISOString().slice(0, 10)
  );

  const mainChips: { key: AnalyticsTimeframe; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'this_week', label: 'Tuần này' },
    { key: 'this_month', label: 'Tháng này' },
    { key: 'last_month', label: 'Tháng trước' },
    { key: 'this_year', label: 'Năm nay' },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      onApplyCustomRange?.(startDate, endDate);
      onSelectTimeframe('custom');
      setCustomModalOpen(false);
    }
  };

  const isCustom = timeframe === 'custom';
  const customChipLabel =
    isCustom && customRange?.start && customRange?.end
      ? `${customRange.start.slice(8, 10)}/${customRange.start.slice(5, 7)} - ${customRange.end.slice(8, 10)}/${customRange.end.slice(5, 7)}`
      : 'Tùy chỉnh...';

  return (
    <div className="merchant-period-filter-wrapper">
      <div className="merchant-period-filter-scroll">
        {mainChips.map((chip) => {
          const isActive = timeframe === chip.key;
          return (
            <button
              type="button"
              key={chip.key}
              className={`merchant-filter-chip ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectTimeframe(chip.key)}
            >
              {chip.label}
            </button>
          );
        })}

        {/* Nút lọc Tùy chỉnh trực tiếp */}
        <button
          type="button"
          className={`merchant-filter-chip ${isCustom ? 'is-active' : ''}`}
          onClick={() => setCustomModalOpen(true)}
        >
          {customChipLabel}
        </button>
      </div>

      {/* Modal chọn khoảng ngày Tùy chỉnh */}
      {customModalOpen && (
        <Modal
          open={customModalOpen}
          title="Chọn khoảng thời gian tùy chỉnh"
          onClose={() => setCustomModalOpen(false)}
          size="small"
        >
          <form className="merchant-form" onSubmit={handleCustomSubmit}>
            <div className="merchant-form-grid">
              <label className="merchant-field">
                <span>Từ ngày</span>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>
              <label className="merchant-field">
                <span>Đến ngày</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <Button type="button" variant="secondary" fullWidth onClick={() => setCustomModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" fullWidth>
                Áp dụng
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// 2. HÀNG 2 THẺ KPI TỔNG QUAN (DOANH THU & ĐƠN HOÀN TẤT)
// ============================================================================
export function KpiSummaryCards({
  periodLabel,
  totalRevenue,
  completedOrders,
}: {
  periodLabel: string;
  totalRevenue: number;
  completedOrders: number;
}) {
  return (
    <div className="merchant-kpi-summary-grid">
      {/* Thẻ 1: Doanh thu kỳ (Màu xanh chủ đạo) */}
      <article className="merchant-kpi-card is-highlight">
        <span className="merchant-kpi-title">Tổng doanh thu {periodLabel}</span>
        <strong className="merchant-kpi-amount">{formatVndCurrency(totalRevenue)}</strong>
      </article>

      {/* Thẻ 2: Đơn hoàn thành kỳ (Nền trắng viền mềm) */}
      <article className="merchant-kpi-card is-neutral">
        <span className="merchant-kpi-title">Tổng đơn hoàn thành {periodLabel}</span>
        <strong className="merchant-kpi-amount is-green">{completedOrders} đơn hàng</strong>
      </article>
    </div>
  );
}

// ============================================================================
// ============================================================================
// 3. KHỐI KHUNG GIỜ NHẬN HÀNG CAO ĐIỂM (PEAK HOURS)
// ============================================================================
export function PeakHoursCard({
  peakHours,
}: {
  peakHours?: PeakHourStat[];
}) {
  const items = peakHours && peakHours.length > 0 ? peakHours : [
    { slot: 'Giờ tan tầm & Tối', timeRange: '18:00 - 22:00', orderCount: 0, percentage: 0 },
    { slot: 'Buổi chiều', timeRange: '14:00 - 18:00', orderCount: 0, percentage: 0 },
    { slot: 'Bữa trưa', timeRange: '11:00 - 14:00', orderCount: 0, percentage: 0 },
    { slot: 'Buổi sáng', timeRange: '06:00 - 11:00', orderCount: 0, percentage: 0 },
  ];

  const hasOrders = items.some((item) => item.orderCount > 0);
  const maxItem = hasOrders
    ? items.reduce((max, cur) => (cur.percentage > max.percentage ? cur : max), items[0])
    : null;

  return (
    <section className="merchant-card merchant-peak-hours-card">
      <header className="merchant-card-header-simple">
        <div className="peak-hours-title-wrapper">
          <Clock size={17} className="peak-hours-header-icon" />
          <h3>Khung giờ nhận hàng cao điểm</h3>
        </div>
        {hasOrders && maxItem && maxItem.percentage > 0 && (
          <span className="merchant-peak-tag">
            <Flame size={12} /> {maxItem.timeRange}
          </span>
        )}
      </header>

      <div className="merchant-peak-hours-list">
        {items.map((item, idx) => {
          const isTop = Boolean(hasOrders && maxItem && item.orderCount > 0 && item.slot === maxItem.slot);
          const percentVal = hasOrders ? item.percentage : 0;
          return (
            <div className={`merchant-peak-row ${isTop ? 'is-peak' : ''}`} key={idx}>
              <div className="peak-row-meta">
                <div className="peak-slot-info">
                  <span className="peak-slot-name">{item.slot}</span>
                  <span className="peak-slot-badge">{item.timeRange}</span>
                </div>
                <div className="peak-slot-stats">
                  <strong
                    className="peak-slot-percent"
                    style={{ color: isTop ? '#166B4A' : '#64748b' }}
                  >
                    {percentVal}%
                  </strong>
                  <span className="peak-slot-count">({item.orderCount} đơn)</span>
                </div>
              </div>
              <div className="peak-bar-track">
                <div
                  className={`peak-bar-fill ${isTop ? 'is-primary' : ''}`}
                  style={{
                    width: `${percentVal > 0 ? Math.max(5, Math.min(100, percentVal)) : 0}%`,
                    backgroundColor: isTop ? '#166B4A' : '#cbd5e1',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <footer className="merchant-peak-footer">
        <Sparkles size={13} className="peak-footer-icon" />
        <span>
          {hasOrders
            ? 'Gợi ý: Đóng gói sẵn tại quầy trước khung giờ cao điểm để khách nhận nhanh.'
            : 'Chưa có đơn hàng trong khoảng thời gian này để thống kê giờ cao điểm.'}
        </span>
      </footer>
    </section>
  );
}

// Giữ lại PaymentChannelCard nếu cần dùng lại
export function PaymentChannelCard({
  channels,
}: {
  channels: PaymentChannelStat[];
}) {
  return (
    <section className="merchant-card merchant-payment-channel-card">
      <header className="merchant-card-header-simple">
        <h3>Thu theo kênh thanh toán</h3>
      </header>
      <div className="merchant-payment-channel-list">
        {channels.map((ch, idx) => {
          const isGoSavingFood = ch.name.toLowerCase().includes('gosavingfood');
          const isVietQR = ch.name.toLowerCase().includes('vietqr') || ch.name.toLowerCase().includes('payos');
          return (
            <div className="merchant-payment-channel-row" key={idx}>
              <div className="channel-badge-icon">
                {isGoSavingFood ? (
                  <Store size={18} />
                ) : isVietQR ? (
                  <CreditCard size={18} />
                ) : (
                  <Wallet size={18} />
                )}
              </div>
              <div className="channel-info">
                <span className="channel-name">{ch.name}</span>
                {ch.orderCount > 0 && (
                  <small className="channel-count">{ch.orderCount} đơn hàng</small>
                )}
              </div>
              <strong className="channel-amount">{formatVndCurrency(ch.amount)}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// 4. BIỂU ĐỒ TRÒN DONUT TRẠNG THÁI ĐƠN HÀNG
// ============================================================================
export function OrderStatusDonutChart({
  totalOrders,
  slices,
}: {
  totalOrders: number;
  slices: OrderStatusSlice[];
}) {
  const size = 180;
  const strokeWidth = 26;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;

  // Tính toán stroke-dasharray và stroke-dashoffset cho từng lát Donut
  let accumulatedAngle = 0;
  const renderedSlices = slices.map((slice) => {
    const fraction = slice.percentage / 100;
    const strokeLength = fraction * circumference;
    const offset = -(accumulatedAngle / 100) * circumference;
    accumulatedAngle += slice.percentage;

    return {
      ...slice,
      strokeLength,
      offset,
    };
  });

  return (
    <section className="merchant-card merchant-donut-card">
      <header className="merchant-card-header-simple">
        <h3>Thống kê trạng thái đơn hàng</h3>
      </header>

      <div className="merchant-donut-chart-container">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="merchant-donut-svg"
        >
          {/* Vòng nền rỗng */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {totalOrders > 0 &&
            renderedSlices.map((slice) => {
              if (slice.strokeLength <= 0) return null;
              return (
                <circle
                  key={slice.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${slice.strokeLength} ${circumference - slice.strokeLength}`}
                  strokeDashoffset={slice.offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: 'stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease' }}
                />
              );
            })}

          {/* Nội dung ở tâm Donut */}
          <text
            x={size / 2}
            y={size / 2 - 8}
            textAnchor="middle"
            className="donut-center-label"
          >
            Tổng đơn hàng
          </text>
          <text
            x={size / 2}
            y={size / 2 + 18}
            textAnchor="middle"
            className="donut-center-val"
          >
            {totalOrders}
          </text>
        </svg>

        {/* Chú thích Legend phía dưới */}
        <div className="merchant-donut-legend">
          {slices.map((slice) => (
            <div className="donut-legend-item" key={slice.key}>
              <span className="donut-legend-dot" style={{ backgroundColor: slice.color }} />
              <span className="donut-legend-name">{slice.label}</span>
              <strong className="donut-legend-pct">{slice.percentage}%</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 5. BIỂU ĐỒ CỘT DOANH THU (CHUYỂN ĐỔI: THEO GIỜ, THEO NGÀY 7 NGÀY, THEO TUẦN, THEO THÁNG)
// ============================================================================
export function RevenueBarChartCard({
  data,
  periodLabel,
  allCharts,
}: {
  data: RevenueChartPoint[];
  periodLabel: string;
  allCharts?: MultiPeriodCharts | null;
}) {
  const [selectedTab, setSelectedTab] = useState<'daily' | 'hourly' | 'weekly' | 'monthly'>('daily');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const hourlyPoints = allCharts?.hourly || [];
  const dailyPoints = allCharts?.daily || [];
  const weeklyPoints = allCharts?.weekly || data;
  const monthlyPoints = allCharts?.monthly || [];

  const tabOptions = [
    { key: 'hourly' as const, label: 'Theo giờ', subtitle: 'Khung giờ đặt & nhận túi hôm nay', points: hourlyPoints },
    { key: 'daily' as const, label: 'Theo ngày', subtitle: 'Doanh thu 7 ngày gần nhất', points: dailyPoints },
    { key: 'weekly' as const, label: 'Theo tuần', subtitle: 'Doanh thu các tuần trong tháng này', points: weeklyPoints },
    { key: 'monthly' as const, label: 'Theo tháng', subtitle: 'Doanh thu 12 tháng trong năm', points: monthlyPoints },
  ];

  const currentTabDef = tabOptions.find((t) => t.key === selectedTab) || tabOptions[1];
  const activePoints = currentTabDef.points.length > 0 ? currentTabDef.points : data;

  const safePoints = useMemo(() => {
    if (!activePoints || activePoints.length === 0) {
      return Array.from({ length: 7 }, (_, i) => ({
        label: "T" + (i + 1),
        value: 0,
        date: "Ngày " + (i + 1),
        orderCount: 0,
      }));
    }
    return activePoints;
  }, [activePoints]);

  const maxValue = useMemo(() => {
    const maxVal = Math.max(...safePoints.map((p) => p.value), 0);
    if (maxVal <= 0) return 200000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil(maxVal / magnitude) * magnitude;
  }, [safePoints]);

  const yTicks = [
    maxValue,
    Math.round(maxValue * 0.75),
    Math.round(maxValue * 0.5),
    Math.round(maxValue * 0.25),
    0,
  ];

  const activePoint = activeIdx !== null && safePoints[activeIdx] ? safePoints[activeIdx] : null;

  return (
    <section className="merchant-card merchant-barchart-card">
      <header className="merchant-barchart-header">
        <div>
          <h3>Doanh thu theo thời gian</h3>
          <small>{currentTabDef.subtitle} ({periodLabel})</small>
        </div>

        <div className="merchant-barchart-controls">
          {activePoint && (
            <div className="merchant-barchart-tooltip-pill">
              <span className="tooltip-dot" />
              <span className="tooltip-label">{activePoint.date || activePoint.label}:</span>
              <strong className="tooltip-amount">{activePoint.value.toLocaleString('vi-VN')} VND</strong>
              {activePoint.orderCount !== undefined && activePoint.orderCount > 0 && (
                <small className="tooltip-orders">({activePoint.orderCount} đơn)</small>
              )}
            </div>
          )}

          {/* Dải Tab chuyển đổi trực tiếp */}
          <div className="merchant-chart-tabs" role="tablist">
            {tabOptions.map((tab) => (
              <button
                type="button"
                key={tab.key}
                className={"merchant-chart-tab-btn" + (selectedTab === tab.key ? " is-active" : "")}
                onClick={() => {
                  setSelectedTab(tab.key);
                  setActiveIdx(null);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="merchant-barchart-container">
        {/* Cột trục Y */}
        <div className="merchant-barchart-y-axis">
          {yTicks.map((val, idx) => (
            <span key={idx} className="y-axis-tick">
              {formatVndCurrency(val)}
            </span>
          ))}
        </div>

        {/* Khung vẽ cột HTML/CSS mượt mà, không méo font */}
        <div className="merchant-barchart-plot-area">
          {/* Lưới ngang (Gridlines) */}
          <div className="merchant-barchart-gridlines" aria-hidden="true">
            {yTicks.map((_, idx) => (
              <div key={idx} className="merchant-barchart-gridline" />
            ))}
          </div>

          {/* Các cột hiển thị (Bars Track) */}
          <div className="merchant-barchart-bars-track">
            {safePoints.map((pt, idx) => {
              const isSelected = activeIdx === idx;
              const heightPercent = maxValue > 0 ? (pt.value / maxValue) * 100 : 0;
              const displayHeight = pt.value > 0 ? Math.max(heightPercent, 4) : 2;

              // Tách nhãn phụ chi tiết ngày (nếu có, ví dụ "01/10 - 07/10" hoặc "28/10")
              let subLabel: string | null = null;
              if (pt.date && safePoints.length <= 8) {
                const parenMatch = pt.date.match(/\((.*?)\)/);
                if (parenMatch) {
                  subLabel = parenMatch[1];
                } else if (pt.date.includes(',')) {
                  subLabel = pt.date.split(',')[1]?.trim() || null;
                }
              }

              return (
                <div
                  key={idx}
                  className={"merchant-barchart-col" + (isSelected ? " is-selected" : "")}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx(null)}
                  onClick={() => setActiveIdx(isSelected ? null : idx)}
                >
                  {/* Vùng cột chứa thanh doanh thu */}
                  <div className="barchart-bar-box">
                    {isSelected && pt.value > 0 && (
                      <div className="barchart-bar-floating-badge">
                        {pt.value >= 1000
                          ? Math.round(pt.value / 1000).toLocaleString('vi-VN') + "k"
                          : pt.value}
                      </div>
                    )}
                    <div
                      className={"barchart-bar-fill" + (isSelected ? " is-active" : "") + (pt.value === 0 ? " is-zero" : "")}
                      style={{ height: displayHeight + "%" }}
                    />
                  </div>

                  {/* Nhãn trục X chuẩn Typography Inter, không bị kéo dãn */}
                  <div className="barchart-x-label-group">
                    <span className={"barchart-x-title" + (isSelected ? " is-active" : "")}>
                      {pt.label}
                    </span>
                    {subLabel && (
                      <span className="barchart-x-subtitle">
                        {subLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 6. KHỐI GIỮ LẠI: TÚI BÁN CHẠY NHẤT & ĐÁNH GIÁ GẦN ĐÂY
// ============================================================================
export function MerchantBusinessInsights({ metrics }: { metrics: AnalyticsMetrics }) {
  const topBags = metrics.topSellingBags || [];

  return (
    <div className="merchant-insights-wrapper">
      <section className="merchant-card merchant-insight-card merchant-top-bags-card">
        <header className="merchant-insight-header">
          <span className="merchant-insight-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <Flame size={17} />
          </span>
          <div>
            <h3>Túi bán chạy nhất</h3>
          </div>
        </header>

        {topBags.length === 0 ? (
          <div className="merchant-top-bags-empty">
            <PackageCheck size={28} style={{ color: '#94a3b8' }} />
            <p>Chưa có dữ liệu bán túi</p>
          </div>
        ) : (
          <div className="merchant-top-bags-list">
            {topBags.map((bag, i) => {
              const rankBadgeClass =
                i === 0 ? 'is-gold' : i === 1 ? 'is-silver' : i === 2 ? 'is-bronze' : 'is-default';
              const rankText = i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : `${i + 1}`;

              return (
                <div className="merchant-top-bag-item" key={i}>
                  <div className={`bag-rank-badge ${rankBadgeClass}`} title={`Hạng ${i + 1}`}>
                    {rankText}
                  </div>

                  <div className="bag-details">
                    <div className="bag-row-top">
                      <strong className="bag-title" title={bag.name}>
                        {bag.name}
                      </strong>
                      <span className="bag-sold">{bag.soldCount} túi đã bán</span>
                    </div>

                    <div className="bag-progress-wrap">
                      <div
                        className="bag-progress-fill"
                        style={{
                          width: `${Math.max(bag.percentage, 8)}%`,
                          background:
                            i === 0
                              ? 'linear-gradient(90deg, #166B4A, #34d399)'
                              : 'linear-gradient(90deg, #2a9d6e, #6ee7b7)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="bag-revenue">{bag.revenue.toLocaleString('vi-VN')}đ</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function RecentReviewsList({ reviews }: { reviews: ReviewItem[] }) {
  return (
    <section className="merchant-reviews">
      <header>
        <h2>Đánh giá gần đây</h2>
        <span>{reviews.length} đánh giá</span>
      </header>
      {reviews.length === 0 ? (
        <article className="merchant-card merchant-reviews-empty">
          <Star size={24} style={{ color: '#cbd5e1' }} />
          <p>Chưa có đánh giá nào</p>
        </article>
      ) : (
        <div className="merchant-reviews-grid">
          {reviews.map((review) => (
            <article className="merchant-card merchant-review-card" key={review.id}>
              <span>{review.avatar}</span>
              <div>
                <header>
                  <div>
                    <strong>{review.customerName}</strong>
                    <small>{review.timeAgo}</small>
                  </div>
                  <div className="merchant-review-stars-wrap">
                    <div className="merchant-review-stars">
                      {Array.from({ length: 5 }, (_, index) => {
                        const isFilled = index < review.rating;
                        return (
                          <Star
                            key={index}
                            size={14}
                            fill={isFilled ? '#f59e0b' : '#f1f5f9'}
                            color={isFilled ? '#f59e0b' : '#cbd5e1'}
                            className={isFilled ? 'is-filled' : 'is-empty'}
                          />
                        );
                      })}
                    </div>
                    <span className="merchant-review-rating-badge">
                      {review.rating.toFixed(1)}
                    </span>
                  </div>
                </header>
                <p>{review.comment}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
