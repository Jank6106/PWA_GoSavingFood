import { useCallback, useEffect, useRef, useState } from 'react';
import {
  exportAnalyticsReport,
  fetchAllRevenueCharts,
  fetchAnalyticsMetrics,
  fetchPeriodAnalytics,
  fetchRecentReviews,
  getCachedAnalytics,
  setCachedAnalytics,
} from '../services/analytics.service';
import type {
  AnalyticsMetrics,
  AnalyticsTimeframe,
  PeriodKpiData,
  ReviewItem,
  RevenueChartPoint,
  MultiPeriodCharts,
} from '../types';
import { useToast } from './useToast';

export function useAnalytics(storeId: string) {
  // SWR: Đọc dữ liệu thống kê từ cache ngay lập tức (0ms)
  const [cachedData] = useState(() => getCachedAnalytics(storeId));
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(() => cachedData?.metrics ?? null);
  const [chartData, setChartData] = useState<RevenueChartPoint[]>(() => cachedData?.chartData ?? []);
  const [allCharts, setAllCharts] = useState<MultiPeriodCharts | null>(null);
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('this_month');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | undefined>(undefined);
  const [periodKpi, setPeriodKpi] = useState<PeriodKpiData | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>(() => cachedData?.reviews ?? []);
  const [loading, setLoading] = useState(() => !cachedData);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toastMessage, showToast } = useToast();

  const [cachedInputs, setCachedInputs] = useState<readonly unknown[] | null>(null);
  // Reset the draft/cache when its inputs change, before committing stale UI.
  if (cachedInputs === null || [storeId].some((value, index) => !Object.is(value, cachedInputs[index]))) {
    setCachedInputs([storeId]);

    const cached = getCachedAnalytics(storeId);
    if (cached) {
      setMetrics(cached.metrics);
      setChartData(cached.chartData);
      setReviews(cached.reviews);
      setLoading(false);
    }

  }

  const loadPeriodData = useCallback(
    async (tf: AnalyticsTimeframe, range?: { start: string; end: string }) => {
      setChartLoading(true);
      try {
        const res = await fetchPeriodAnalytics(storeId, tf, range);
        setPeriodKpi({
          periodLabel: res.periodLabel,
          totalRevenue: res.totalRevenue,
          completedOrders: res.completedOrders,
          totalOrders: res.totalOrders,
          paymentChannels: res.paymentChannels,
          peakHours: res.peakHours,
          statusBreakdown: res.statusBreakdown,
        });
        setChartData(res.chartData);
      } catch {
        showToast('Lỗi cập nhật biểu đồ theo kỳ.');
      } finally {
        setChartLoading(false);
      }
    },
    [storeId, showToast]
  );

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [nextMetrics, nextPeriod, nextReviews, nextCharts] = await Promise.all([
        fetchAnalyticsMetrics(storeId),
        fetchPeriodAnalytics(storeId, timeframe, customRange),
        fetchRecentReviews(storeId),
        fetchAllRevenueCharts(storeId),
      ]);
      setAllCharts(nextCharts);
      setMetrics(nextMetrics);
      setPeriodKpi({
        periodLabel: nextPeriod.periodLabel,
        totalRevenue: nextPeriod.totalRevenue,
        completedOrders: nextPeriod.completedOrders,
        totalOrders: nextPeriod.totalOrders,
        paymentChannels: nextPeriod.paymentChannels,
        peakHours: nextPeriod.peakHours,
        statusBreakdown: nextPeriod.statusBreakdown,
      });
      setChartData(nextPeriod.chartData);
      setReviews(nextReviews);
      setCachedAnalytics(storeId, {
        metrics: nextMetrics,
        chartData: nextPeriod.chartData,
        reviews: nextReviews,
      });
    } catch {
      setError('Không thể tải dữ liệu thống kê.');
    } finally {
      setLoading(false);
    }
  }, [storeId, timeframe, customRange]);

  const lastFetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    const key = `${storeId}_${timeframe}_${customRange?.start || ''}_${customRange?.end || ''}`;
    if (lastFetchedKeyRef.current !== key) {
      lastFetchedKeyRef.current = key;
      void loadData();
    }
  }, [storeId, timeframe, customRange, loadData]);

  const exportReport = async () => {
    setExporting(true);
    try {
      await exportAnalyticsReport(storeId);
      showToast('Báo cáo đã được xuất thành công');
    } finally {
      setExporting(false);
    }
  };

  const changeTimeframe = async (
    nextTimeframe: AnalyticsTimeframe,
    nextCustomRange?: { start: string; end: string }
  ) => {
    setTimeframe(nextTimeframe);
    if (nextCustomRange) {
      setCustomRange(nextCustomRange);
    }
    await loadPeriodData(nextTimeframe, nextCustomRange);
  };

  const refreshData = async () => {
    setLoading(true);
    await loadData();
    showToast('Đã cập nhật dữ liệu thống kê mới nhất');
  };

  return {
    metrics,
    periodKpi,
    chartData,
    allCharts,
    timeframe,
    customRange,
    reviews,
    loading,
    chartLoading,
    error,
    exporting,
    toastMessage,
    changeTimeframe,
    exportReport,
    loadData,
    refreshData,
  };
}
