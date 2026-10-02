import { useCallback, useEffect, useState } from 'react';
import {
  exportAnalyticsReport,
  fetchAnalyticsMetrics,
  fetchRecentReviews,
  fetchRevenueChart,
  getCachedAnalytics,
  setCachedAnalytics,
} from '../services/analytics.service';
import type { AnalyticsMetrics, ReviewItem, RevenueChartPoint } from '../types';
import { useToast } from './useToast';

export function useAnalytics(storeId: string) {
  // SWR: Đọc dữ liệu thống kê từ cache ngay lập tức (0ms)
  const [cachedData] = useState(() => getCachedAnalytics(storeId));
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(() => cachedData?.metrics ?? null);
  const [chartData, setChartData] = useState<RevenueChartPoint[]>(() => cachedData?.chartData ?? []);
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
  const [reviews, setReviews] = useState<ReviewItem[]>(() => cachedData?.reviews ?? []);
  const [loading, setLoading] = useState(() => !cachedData);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toastMessage, showToast } = useToast();

  useEffect(() => {
    const cached = getCachedAnalytics(storeId);
    if (cached) {
      setMetrics(cached.metrics);
      setChartData(cached.chartData);
      setReviews(cached.reviews);
      setLoading(false);
    }
  }, [storeId]);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [nextMetrics, nextChart, nextReviews] = await Promise.all([
        fetchAnalyticsMetrics(storeId),
        fetchRevenueChart(storeId, timeframe),
        fetchRecentReviews(storeId),
      ]);
      setMetrics(nextMetrics);
      setChartData(nextChart);
      setReviews(nextReviews);
      setCachedAnalytics(storeId, {
        metrics: nextMetrics,
        chartData: nextChart,
        reviews: nextReviews,
      });
    } catch {
      setError('Không thể tải dữ liệu thống kê.');
    } finally {
      setLoading(false);
    }
  }, [storeId, timeframe]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const exportReport = async () => {
    setExporting(true);
    try {
      await exportAnalyticsReport(storeId);
      showToast('Báo cáo đã được xuất thành công');
    } finally {
      setExporting(false);
    }
  };

  return {
    metrics,
    chartData,
    timeframe,
    reviews,
    loading,
    error,
    exporting,
    toastMessage,
    changeTimeframe: setTimeframe,
    exportReport,
    loadData,
  };
}
