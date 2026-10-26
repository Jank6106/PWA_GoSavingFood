import { Download, RotateCcw } from 'lucide-react';
import {
  KpiSummaryCards,
  MerchantBusinessInsights,
  OrderStatusDonutChart,
  PeakHoursCard,
  PeriodFilterBar,
  RecentReviewsList,
  RevenueBarChartCard,
} from '../components/analytics';
import { Button, ErrorState, SkeletonCard, ToastBar } from '../components/ui';
import { useAnalytics } from '../hooks/useAnalytics';

export function AnalyticsScreen({ storeId }: { storeId: string }) {
  const state = useAnalytics(storeId);

  if (state.error && !state.metrics && !state.periodKpi) {
    return <ErrorState message={state.error} onRetry={() => void state.loadData()} />;
  }

  const periodLabel = state.periodKpi?.periodLabel || 'tháng này';
  const totalRevenue = state.periodKpi?.totalRevenue ?? state.metrics?.monthlyRevenue ?? 0;
  const completedOrders = state.periodKpi?.completedOrders ?? state.metrics?.completedOrders ?? 0;
  const totalOrders = state.periodKpi?.totalOrders ?? state.metrics?.totalOrders ?? 0;
  const peakHours = state.periodKpi?.peakHours || state.metrics?.peakHours || [];
  const statusSlices = state.periodKpi?.statusBreakdown || [
    { key: 'completed', label: 'Đã thanh toán', count: completedOrders, percentage: 100, color: '#166B4A' },
    { key: 'cancelled', label: 'Hủy', count: 0, percentage: 0, color: '#059669' },
    { key: 'pending', label: 'Chờ thanh toán', count: 0, percentage: 0, color: '#a7f3d0' },
  ];

  return (
    <>
      <ToastBar message={state.toastMessage} />

      {/* Tiêu đề & Nút xuất báo cáo / làm mới */}
      <div className="merchant-screen-heading">
        <div>
          <span>Dữ liệu thời gian thực</span>
          <h1>Tổng quan kinh doanh</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            size="small"
            variant="outline"
            loading={state.exporting}
            onClick={() => void state.exportReport()}
            title="Xuất báo cáo CSV"
          >
            <Download size={15} /> Xuất
          </Button>
          <Button
            size="small"
            variant="outline"
            loading={state.loading}
            onClick={() => void state.refreshData()}
            title="Làm mới số liệu"
          >
            <RotateCcw size={15} /> Làm mới
          </Button>
        </div>
      </div>

      {/* DẢI NÚT LỌC THỜI GIAN */}
      <PeriodFilterBar
        timeframe={state.timeframe}
        onSelectTimeframe={(tf) => void state.changeTimeframe(tf)}
        customRange={state.customRange}
        onApplyCustomRange={(start, end) => void state.changeTimeframe('custom', { start, end })}
      />

      {state.loading && !state.metrics && !state.periodKpi ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <SkeletonCard height={110} />
            <SkeletonCard height={110} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <SkeletonCard height={180} />
            <SkeletonCard height={180} />
          </div>
          <SkeletonCard height={260} />
          <SkeletonCard height={160} />
        </div>
      ) : (
        <>
          {/* HÀNG 2 THẺ KPI (Tổng doanh thu + Tổng đơn hoàn thành) */}
          <KpiSummaryCards
            periodLabel={periodLabel}
            totalRevenue={totalRevenue}
            completedOrders={completedOrders}
          />

          {/* HÀNG 2 KHỐI: Khung giờ nhận hàng cao điểm + Thống kê trạng thái đơn (Donut) */}
          <div className="merchant-analytics-middle-grid">
            <PeakHoursCard peakHours={peakHours} />
            <OrderStatusDonutChart totalOrders={totalOrders} slices={statusSlices} />
          </div>

          {/* BIỂU ĐỒ CỘT DOANH THU THEO KỲ */}
          <RevenueBarChartCard
            data={state.chartData}
            periodLabel={periodLabel}
          />

          {/* CÁC PHẦN GIỮ LẠI: Túi bán chạy nhất + Đánh giá gần đây */}
          {state.metrics && <MerchantBusinessInsights metrics={state.metrics} />}
          <RecentReviewsList reviews={state.reviews} />
        </>
      )}
    </>
  );
}
