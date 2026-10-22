import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Download,
  Flame,
  PackageCheck,
  Receipt,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import type { AnalyticsMetrics, RevenueChartPoint, ReviewItem } from '../../types';
import { Button } from '../ui';

function formatShortVnd(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}k`;
  return `${num}đ`;
}

// 1. BANNER TỔNG QUAN DOANH THU
export function RevenueOverviewCard({
  metrics,
  exporting,
  onExport,
}: {
  metrics: AnalyticsMetrics;
  exporting: boolean;
  onExport: () => void;
}) {
  const isPositiveGrowth = metrics.monthlyGrowthPercent >= 0;
  const daysInMonthSoFar = Math.max(1, new Date().getDate());
  const dailyAverage = Math.round(metrics.monthlyRevenue / daysInMonthSoFar);

  return (
    <section className="merchant-revenue-card">
      <div className="merchant-revenue-info">
        <span className="merchant-revenue-label">Doanh thu tháng</span>
        <strong className="merchant-revenue-amount">
          {metrics.monthlyRevenue.toLocaleString('vi-VN')}đ
        </strong>
        <div className="merchant-revenue-subrow">
          <small
            className={`merchant-revenue-growth ${isPositiveGrowth ? 'is-up' : 'is-down'}`}
          >
            {isPositiveGrowth ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
            {isPositiveGrowth ? '+' : '-'}{Math.abs(metrics.monthlyGrowthPercent)}% so với tháng trước
          </small>
          <span className="merchant-revenue-divider">•</span>
          <span className="merchant-revenue-avg">
            ~{Math.round(dailyAverage / 1000)}k/ngày
          </span>
        </div>
      </div>
      <Button variant="secondary" loading={exporting} onClick={onExport} className="merchant-export-btn">
        <Download size={17} /> Xuất báo cáo
      </Button>
    </section>
  );
}

// 2. LƯỚI 4 CHỈ SỐ KINH DOANH CHÍNH
export function AnalyticsMetricsGrid({ metrics }: { metrics: AnalyticsMetrics }) {
  const items = [
    {
      icon: ShoppingBag,
      label: 'Tổng đơn hàng',
      value: metrics.totalOrders.toLocaleString('vi-VN'),
      subtext: `Hoàn tất: ${metrics.rescueRate || 95}%`,
      iconBg: '#e8f5ed',
      iconColor: '#166B4A',
    },
    {
      icon: PackageCheck,
      label: 'Túi đã bán',
      value: metrics.totalSoldBags.toLocaleString('vi-VN'),
      subtext: `Trên kệ: ${metrics.bagsOnShelf} túi`,
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
    },
    {
      icon: Receipt,
      label: 'Giá trị đơn (AOV)',
      value: `${(metrics.averageOrderValue || 0).toLocaleString('vi-VN')}đ`,
      subtext: '',
      iconBg: '#fef3c7',
      iconColor: '#d97706',
    },
    {
      icon: Star,
      label: 'Đánh giá cửa hàng',
      value: `${metrics.averageRating > 0 ? metrics.averageRating.toFixed(1) : '5.0'}/5`,
      subtext: metrics.totalReviewsCount > 0 ? `${metrics.totalReviewsCount} nhận xét` : '',
      iconBg: '#fdf2f8',
      iconColor: '#db2777',
    },
  ];

  return (
    <div className="merchant-metrics-grid">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <article className="merchant-card merchant-stat-card" key={item.label}>
            <span style={{ backgroundColor: item.iconBg, color: item.iconColor }}>
              <Icon size={20} />
            </span>
            <div className="merchant-stat-info">
              <small className="merchant-stat-label">{item.label}</small>
              <strong className="merchant-stat-val">{item.value}</strong>
              <span className="merchant-stat-sub">{item.subtext}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// 3. BIỂU ĐỒ ĐƯỜNG (LINE CHART) DOANH THU CHUYÊN NGHIỆP
export function RevenueChartCard({
  data,
  timeframe,
  onTimeframe,
}: {
  data: RevenueChartPoint[];
  timeframe: 'week' | 'month';
  onTimeframe: (value: 'week' | 'month') => void;
}) {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Thống kê nhanh trên biểu đồ
  const totalRevenue = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );
  const peakPoint = useMemo(() => {
    if (data.length === 0) return { label: '', value: 0 };
    return data.reduce((max, item) => (item.value > max.value ? item : max), data[0]);
  }, [data]);
  const avgRevenue = useMemo(
    () => (data.length > 0 ? Math.round(totalRevenue / data.length) : 0),
    [data, totalRevenue]
  );

  // Điểm đang active: mặc định là điểm cao nhất hoặc điểm cuối cùng
  const defaultIndex = useMemo(() => {
    if (data.length === 0) return 0;
    const peakIdx = data.findIndex((p) => p.value === peakPoint.value && p.value > 0);
    return peakIdx !== -1 ? peakIdx : data.length - 1;
  }, [data, peakPoint]);

  const activeIndex = hoveredIndex !== null ? hoveredIndex : defaultIndex;
  const activePoint = data[activeIndex] || data[data.length - 1];

  // Kích thước SVG
  const svgWidth = 640;
  const svgHeight = 220;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 30;
  const padBottom = 34;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Tính trần giá trị Y
  const maxVal = Math.max(...data.map((d) => d.value), 20000);
  const ceiling = Math.ceil(maxVal / 10000) * 10000 || 50000;

  // Tọa độ các điểm (x, y)
  const points = useMemo(() => {
    return data.map((item, index) => {
      const x =
        data.length > 1
          ? padLeft + (index / (data.length - 1)) * plotWidth
          : padLeft + plotWidth / 2;
      const y = padTop + plotHeight - (item.value / ceiling) * plotHeight;
      return { x, y, item, index };
    });
  }, [data, ceiling, padLeft, padTop, plotWidth, plotHeight]);

  // Đường cong Bezier mượt mà (Smooth Spline)
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }, [points]);

  // Vùng diện tích bên dưới đường cong (Area fill)
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const bottomY = padTop + plotHeight;
    return `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`;
  }, [linePath, points, padTop, plotHeight]);

  // Các mốc lưới ngang trục Y (4 mức)
  const yTicks = [
    { label: formatShortVnd(ceiling), y: padTop },
    { label: formatShortVnd(Math.round(ceiling * 0.66)), y: padTop + plotHeight * 0.34 },
    { label: formatShortVnd(Math.round(ceiling * 0.33)), y: padTop + plotHeight * 0.67 },
    { label: '0đ', y: padTop + plotHeight },
  ];

  const colWidth = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;
  const activePt = points[activeIndex];

  return (
    <section className="merchant-card merchant-chart-card">
      <header className="merchant-chart-header">
        <div className="merchant-chart-title-group">
          <div className="merchant-chart-title">
            <TrendingUp size={18} className="merchant-chart-icon" />
            <span>Biểu đồ doanh thu</span>
          </div>
        </div>

        {/* Nút lọc Tuần / Tháng */}
        <div className="merchant-segmented">
          <button
            type="button"
            className={timeframe === 'week' ? 'is-active' : ''}
            onClick={() => onTimeframe('week')}
          >
            Tuần
          </button>
          <button
            type="button"
            className={timeframe === 'month' ? 'is-active' : ''}
            onClick={() => onTimeframe('month')}
          >
            Tháng
          </button>
        </div>
      </header>

      {/* Thanh tóm tắt nhanh chỉ số của kỳ */}
      <div className="merchant-chart-summary-bar">
        <div className="merchant-summary-chip">
          <span className="chip-label">Tổng:</span>
          <strong className="chip-val">{totalRevenue.toLocaleString('vi-VN')}đ</strong>
        </div>
        <div className="merchant-summary-chip">
          <span className="chip-label">Đỉnh:</span>
          <strong className="chip-val">
            {peakPoint.value > 0 ? `${formatShortVnd(peakPoint.value)} (${peakPoint.label})` : '0đ'}
          </strong>
        </div>
        <div className="merchant-summary-chip">
          <span className="chip-label">TB:</span>
          <strong className="chip-val">{formatShortVnd(avgRevenue)}</strong>
        </div>

        {/* Tooltip hiển thị điểm đang chọn */}
        {activePoint && (
          <div className="merchant-chart-active-pill">
            <span className="pill-dot" />
            <span className="pill-label">{activePoint.date || activePoint.label}:</span>
            <strong className="pill-amount">{activePoint.value.toLocaleString('vi-VN')}đ</strong>
            {activePoint.orderCount !== undefined && activePoint.orderCount > 0 && (
              <small className="pill-orders">({activePoint.orderCount} đơn)</small>
            )}
          </div>
        )}
      </div>

      {/* Khung Biểu Đồ Đường SVG */}
      <div className="merchant-line-chart-svg-wrap">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="merchant-line-chart-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#166B4A" stopOpacity="0.25" />
              <stop offset="65%" stopColor="#166B4A" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#166B4A" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Đường lưới ngang trục Y */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={svgWidth - padRight}
                y2={tick.y}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                fontSize="11"
                fontWeight="600"
                fill="#94a3b8"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Vùng diện tích mờ dưới đường cong */}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

          {/* Bóng đổ nhẹ cho đường biểu đồ */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#166B4A"
              strokeWidth="6"
              strokeOpacity="0.12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Đường biểu đồ chính */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#166B4A"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Đường chỉ số dọc (Indicator Line) khi hover */}
          {activePt && (
            <line
              x1={activePt.x}
              y1={padTop}
              x2={activePt.x}
              y2={padTop + plotHeight}
              stroke="#166B4A"
              strokeDasharray="3 3"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
          )}

          {/* Các điểm nút (Data Points) */}
          {points.map((pt) => {
            const isActive = pt.index === activeIndex;
            return (
              <g key={pt.index}>
                {isActive && (
                  <circle cx={pt.x} cy={pt.y} r="8" fill="#166B4A" fillOpacity="0.18" />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isActive ? 5.5 : 3.5}
                  fill={isActive ? '#166B4A' : '#ffffff'}
                  stroke="#166B4A"
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{ transition: 'all 0.15s ease' }}
                />
              </g>
            );
          })}

          {/* Nhãn trục hoành X ở đáy */}
          {points.map((pt) => {
            const isActive = pt.index === activeIndex;
            return (
              <text
                key={`label-${pt.index}`}
                x={pt.x}
                y={padTop + plotHeight + 20}
                textAnchor="middle"
                fontSize="11.5"
                fontWeight={isActive ? '800' : '600'}
                fill={isActive ? '#166B4A' : '#64748b'}
              >
                {pt.item.label}
              </text>
            );
          })}

          {/* Vùng bắt sự kiện cảm ứng / rê chuột trên mỗi cột */}
          {points.map((pt) => (
            <rect
              key={`hit-${pt.index}`}
              x={pt.x - colWidth / 2}
              y={padTop}
              width={colWidth}
              height={plotHeight + padBottom}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIndex(pt.index)}
              onClick={() => setHoveredIndex(pt.index)}
            />
          ))}
        </svg>
      </div>
    </section>
  );
}

// 4. THÔNG TIN HỮU ÍCH CHUYÊN SÂU DÀNH CHO NGƯỜI BÁN
export function MerchantBusinessInsights({ metrics }: { metrics: AnalyticsMetrics }) {
  const peakHours = metrics.peakHours || [];
  const topBags = metrics.topSellingBags || [];

  return (
    <div className="merchant-insights-wrapper">
      <div className="merchant-insights-grid">
        {/* KHỐI 1: Khung giờ nhận hàng cao điểm */}
        <section className="merchant-card merchant-insight-card">
          <header className="merchant-insight-header">
            <span className="merchant-insight-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
              <Clock3 size={17} />
            </span>
            <div>
              <h3>Khung giờ khách nhận hàng</h3>
              <p>Phân bổ thời gian khách đến lấy túi cứu trợ để chủ quán chủ động chuẩn bị</p>
            </div>
          </header>

          <div className="merchant-peak-hours-list">
            {peakHours.map((slot, i) => (
              <div className="merchant-peak-hour-row" key={i}>
                <div className="merchant-peak-hour-meta">
                  <span className="slot-title">{slot.slot}</span>
                  <span className="slot-time">({slot.timeRange})</span>
                </div>
                <div className="merchant-peak-hour-bar-wrap">
                  <div
                    className="merchant-peak-hour-bar-fill"
                    style={{
                      width: `${Math.max(slot.percentage, 4)}%`,
                      backgroundColor: i === 0 ? '#166B4A' : i === 1 ? '#2a9d6e' : '#93c5ae',
                    }}
                  />
                  <span className="slot-pct">{slot.percentage}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="merchant-insight-tip">
            <Sparkles size={14} className="tip-icon" />
            <span>
              Cao điểm nhận hàng: <strong>18:00 – 22:00</strong>
            </span>
          </div>
        </section>

        {/* KHỐI 2: THỐNG KÊ TÚI NÀO BÁN ĐƯỢC NHIỀU NHẤT */}
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
                const rankBadgeClass = i === 0 ? 'is-gold' : i === 1 ? 'is-silver' : i === 2 ? 'is-bronze' : 'is-default';
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
    </div>
  );
}

// 5. DANH SÁCH ĐÁNH GIÁ GẦN ĐÂY
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
                        fill={index < review.rating ? '#f59e0b' : 'none'}
                        color={index < review.rating ? '#f59e0b' : '#cbd5e1'}
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
