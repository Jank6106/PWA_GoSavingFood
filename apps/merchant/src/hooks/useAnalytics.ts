import { useCallback, useEffect, useState } from 'react';
import { exportAnalyticsReport, fetchAnalyticsMetrics, fetchRecentReviews, fetchRevenueChart } from '../services/analytics.service';
import type { AnalyticsMetrics, ReviewItem, RevenueChartPoint } from '../types';
import { useToast } from './useToast';

export function useAnalytics(storeId: string) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [chartData, setChartData] = useState<RevenueChartPoint[]>([]);
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toastMessage, showToast } = useToast();
  const loadData = useCallback(async () => { setLoading(true); setError(null); try { const [nextMetrics, nextChart, nextReviews] = await Promise.all([fetchAnalyticsMetrics(storeId), fetchRevenueChart(storeId, timeframe), fetchRecentReviews(storeId)]); setMetrics(nextMetrics); setChartData(nextChart); setReviews(nextReviews); } catch { setError('Không thể tải dữ liệu thống kê.'); } finally { setLoading(false); } }, [storeId, timeframe]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadData(); }, 0); return () => window.clearTimeout(timer); }, [loadData]);
  const exportReport = async () => { setExporting(true); try { await exportAnalyticsReport(storeId); showToast('Báo cáo đã được xuất thành công'); } finally { setExporting(false); } };
  return { metrics, chartData, timeframe, reviews, loading, error, exporting, toastMessage, changeTimeframe: setTimeframe, exportReport, loadData };
}
