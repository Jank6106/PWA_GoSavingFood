import {
  ChevronDown,
  CreditCard,
  Flame,
  PackageCheck,
  Star,
  Store,
  Wallet,
} from 'lucide-react';
import { useMemo, useRef, useState, useEffect } from 'react';
import type {
  AnalyticsMetrics,
  AnalyticsTimeframe,
  OrderStatusSlice,
  PaymentChannelStat,
  RevenueChartPoint,
  ReviewItem,
} from '../../types';
import { Button, Modal } from '../ui';

function formatVndCurrency(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} VND`;
}

// ============================================================================
// 1. DẢI NÚT LỌC THỜI GIAN (CUỘN NGANG + DROPDOWN TÙY CHỈNH)
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState(
    customRange?.start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    customRange?.end || new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const mainChips: { key: AnalyticsTimeframe; label: string }[] = [
    { key: 'yesterday', label: 'Hôm qua' },
    { key: 'today', label: 'Hôm nay' },
    { key: 'this_week', label: 'Tuần này' },
    { key: 'this_month', label: 'Tháng này' },
    { key: 'last_month', label: 'Tháng trước' },
    { key: 'this_year', label: 'Năm này' },
    { key: 'last_year', label: 'Năm trước' },
  ];

  const dropdownOptions: { key: AnalyticsTimeframe; label: string }[] = [
    { key: '24h', label: '24 giờ' },
    { key: '7d', label: '7 ngày' },
    { key: '30d', label: '30 ngày' },
    { key: '1y', label: '1 năm' },
    { key: 'custom', label: 'Tùy chỉnh...' },
    { key: 'all', label: 'Tất cả' },
  ];

  const isDropdownOptionActive = dropdownOptions.some((opt) => opt.key === timeframe);

  const getDropdownLabel = () => {
    const matched = dropdownOptions.find((opt) => opt.key === timeframe);
    if (matched) return matched.label;
    return 'Tùy chỉnh';
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      onApplyCustomRange?.(startDate, endDate);
      onSelectTimeframe('custom');
      setCustomModalOpen(false);
    }
  };

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

        {/* Dropdown Tùy chỉnh */}
        <div className="merchant-dropdown-anchor" ref={dropdownRef}>
          <button
            type="button"
            className={`merchant-filter-chip merchant-dropdown-trigger ${
              isDropdownOptionActive ? 'is-active' : ''
            }`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
          >
            <span>{getDropdownLabel()}</span>
            <ChevronDown size={14} className={dropdownOpen ? 'is-rotated' : ''} />
          </button>

          {dropdownOpen && (
            <div className="merchant-period-dropdown-menu">
              {dropdownOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.key}
                  className={`merchant-dropdown-item ${timeframe === opt.key ? 'is-selected' : ''}`}
                  onClick={() => {
                    setDropdownOpen(false);
                    if (opt.key === 'custom') {
                      setCustomModalOpen(true);
                    } else {
                      onSelectTimeframe(opt.key);
                    }
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
// 3. KHỐI THU THEO KÊNH THANH TOÁN
// ============================================================================
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
// 5. BIỂU ĐỒ CỘT DOANH THU (BAR CHART ADAPTIVE THEO KỲ)
// ============================================================================
export function RevenueBarChartCard({
  data,
  periodLabel,
}: {
  data: RevenueChartPoint[];
  periodLabel: string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const points = useMemo(() => {
    if (!data || data.length === 0) {
      return Array.from({ length: 7 }, (_, i) => ({
        label: `T${i + 1}`,
        value: 0,
        date: `Ngày ${i + 1}`,
        orderCount: 0,
      }));
    }
    return data;
  }, [data]);

  const maxValue = useMemo(() => {
    const maxVal = Math.max(...points.map((p) => p.value), 0);
    if (maxVal <= 0) return 200000;
    // Làm tròn lên mốc đẹp (50k, 100k, 500k, 1M...)
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil(maxVal / magnitude) * magnitude;
  }, [points]);

  // 4 mốc lưới trục Y
  const yTicks = [
    maxValue,
    Math.round(maxValue * 0.75),
    Math.round(maxValue * 0.5),
    Math.round(maxValue * 0.25),
    0,
  ];

  const svgHeight = 220;
  const paddingBottom = 46;
  const paddingTop = 20;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const activePoint = activeIdx !== null && points[activeIdx] ? points[activeIdx] : null;

  return (
    <section className="merchant-card merchant-barchart-card">
      <header className="merchant-barchart-header">
        <div>
          <h3>Doanh thu theo thời gian</h3>
          <small>Biểu đồ cột theo {periodLabel}</small>
        </div>
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

        {/* Khung vẽ cột SVG */}
        <div className="merchant-barchart-svg-wrapper">
          <svg
            className="merchant-barchart-svg"
            viewBox={`0 0 ${Math.max(points.length * 36, 400)} ${svgHeight}`}
            preserveAspectRatio="none"
          >
            {/* Lưới ngang */}
            {yTicks.map((_, idx) => {
              const y = paddingTop + (idx / (yTicks.length - 1)) * chartHeight;
              return (
                <line
                  key={idx}
                  x1="0"
                  y1={y}
                  x2="100%"
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Các cột Bar */}
            {points.map((pt, idx) => {
              const totalBars = points.length;
              const svgWidth = Math.max(totalBars * 36, 400);
              const colWidth = svgWidth / totalBars;
              const barWidth = Math.max(10, Math.min(22, colWidth * 0.45));
              const barX = idx * colWidth + (colWidth - barWidth) / 2;

              const barHeight = Math.max(pt.value > 0 ? (pt.value / maxValue) * chartHeight : 3, 3);
              const barY = paddingTop + (chartHeight - barHeight);
              const isSelected = activeIdx === idx;

              return (
                <g
                  key={idx}
                  className="bar-group"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx(null)}
                  onClick={() => setActiveIdx(isSelected ? null : idx)}
                >
                  {/* Cột chính */}
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    rx="3"
                    ry="3"
                    fill={isSelected ? '#059669' : '#166B4A'}
                    className="bar-rect"
                  />

                  {/* Vùng cảm ứng chạm trong suốt rộng hơn để dễ bấm trên điện thoại */}
                  <rect
                    x={idx * colWidth}
                    y={0}
                    width={colWidth}
                    height={svgHeight}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                  />

                  {/* Nhãn trục X xoay 45 độ y như ảnh */}
                  <text
                    x={barX + barWidth / 2}
                    y={paddingTop + chartHeight + 14}
                    textAnchor="end"
                    transform={`rotate(-45 ${barX + barWidth / 2} ${paddingTop + chartHeight + 14})`}
                    className={`barchart-x-label ${isSelected ? 'is-active' : ''}`}
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>
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
                  <span>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={13}
                        className={index < review.rating ? 'is-filled' : ''}
                      />
                    ))}
                  </span>
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
