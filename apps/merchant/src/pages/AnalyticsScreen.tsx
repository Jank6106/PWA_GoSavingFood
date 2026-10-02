import { AnalyticsMetricsGrid, RecentReviewsList, RevenueChartCard, RevenueOverviewCard } from '../components/analytics';
import { ErrorState, SkeletonCard, ToastBar } from '../components/ui';
import { useAnalytics } from '../hooks/useAnalytics';

export function AnalyticsScreen({ storeId }: { storeId: string }) {
  const state = useAnalytics(storeId);
  if (state.error && !state.metrics) return <ErrorState message={state.error} onRetry={() => void state.loadData()} />;
  return (
    <>
      <ToastBar message={state.toastMessage} />
      <div className="merchant-screen-heading">
        <div>
          <span>Dữ liệu thời gian thực</span>
          <h1>Tổng quan kinh doanh</h1>
        </div>
      </div>
      {!state.metrics ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SkeletonCard height={140} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <SkeletonCard height={90} />
            <SkeletonCard height={90} />
            <SkeletonCard height={90} />
            <SkeletonCard height={90} />
          </div>
          <SkeletonCard height={220} />
        </div>
      ) : (
        <>
          <RevenueOverviewCard metrics={state.metrics} exporting={state.exporting} onExport={() => void state.exportReport()} />
          <AnalyticsMetricsGrid metrics={state.metrics} />
          <RevenueChartCard data={state.chartData} timeframe={state.timeframe} onTimeframe={state.changeTimeframe} />
          <RecentReviewsList reviews={state.reviews} />
        </>
      )}
    </>
  );
}
