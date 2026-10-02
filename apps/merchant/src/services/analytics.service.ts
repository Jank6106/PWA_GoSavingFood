import { SEED_ANALYTICS_QUYT } from '../mocks';
import type { AnalyticsMetrics, ReviewItem, RevenueChartPoint } from '../types';
import { supabase } from './supabase';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const REVENUE_STATUSES = ['completed', 'picked_up'];

const isRevenueStatus = (status: unknown) => REVENUE_STATUSES.includes(String(status));

const formatTimeAgo = (iso?: string | null) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 'Vừa xong';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
};

const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'KH';

const ANALYTICS_CACHE_PREFIX = 'gsf_merchant_analytics:';
const metricsInFlight = new Map<string, Promise<AnalyticsMetrics>>();
const chartInFlight = new Map<string, Promise<RevenueChartPoint[]>>();
const reviewsInFlight = new Map<string, Promise<ReviewItem[]>>();

export interface CachedAnalyticsData {
  metrics: AnalyticsMetrics;
  chartData: RevenueChartPoint[];
  reviews: ReviewItem[];
}

export function getCachedAnalytics(storeId: string): CachedAnalyticsData {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${ANALYTICS_CACHE_PREFIX}${storeId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.metrics) return parsed;
      }
    } catch {
      // Ignore parse error
    }
  }
  return SEED_ANALYTICS_QUYT;
}

export function setCachedAnalytics(storeId: string, data: CachedAnalyticsData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${ANALYTICS_CACHE_PREFIX}${storeId}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota
  }
}

export async function fetchAnalyticsMetrics(storeId: string): Promise<AnalyticsMetrics> {
  const existing = metricsInFlight.get(storeId);
  if (existing) return existing;

  const fetchPromise = (async () => {
    try {
      const [ordersResult, soldResult, storeResult, bagsResult] = await Promise.all([
        supabase.from('orders').select('id, status, final_amount, created_at').eq('store_id', storeId),
        supabase
          .from('order_items')
          .select('quantity, orders!inner(store_id, status)')
          .eq('orders.store_id', storeId),
        supabase.from('stores').select('rating, total_ratings').eq('id', storeId).maybeSingle(),
        supabase
          .from('surprise_bags')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .eq('is_available', true),
      ]);

  if (ordersResult.error) console.warn('Thống kê đơn hàng lỗi:', ordersResult.error.message);
  if (soldResult.error) console.warn('Thống kê túi bán ra lỗi:', soldResult.error.message);

  const orders = ordersResult.data || [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const revenueOrders = orders.filter((order: any) => isRevenueStatus(order.status));
  const totalRevenue = revenueOrders.reduce(
    (sum: number, order: any) => sum + Number(order.final_amount || 0),
    0
  );
  const monthlyRevenue = revenueOrders
    .filter((order: any) => new Date(order.created_at) >= monthStart)
    .reduce((sum: number, order: any) => sum + Number(order.final_amount || 0), 0);
  const previousMonthRevenue = revenueOrders
    .filter((order: any) => {
      const created = new Date(order.created_at);
      return created >= previousMonthStart && created < monthStart;
    })
    .reduce((sum: number, order: any) => sum + Number(order.final_amount || 0), 0);

  const totalSoldBags = (soldResult.data || []).reduce(
    (sum: number, item: any) =>
      isRevenueStatus(item.orders?.status) ? sum + Number(item.quantity || 0) : sum,
    0
  );

    return {
      totalRevenue,
      monthlyRevenue,
      monthlyGrowthPercent:
        previousMonthRevenue > 0
          ? Number((((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100).toFixed(1))
          : 0,
      previousMonthRevenue,
      totalOrders: orders.length,
      totalSoldBags,
      bagsOnShelf: bagsResult.count || 0,
      averageRating: Number(storeResult.data?.rating || 0),
      totalReviewsCount: Number(storeResult.data?.total_ratings || 0),
    };
  } finally {
    metricsInFlight.delete(storeId);
  }
  })();

  metricsInFlight.set(storeId, fetchPromise);
  return fetchPromise;
}

export async function fetchRevenueChart(
  storeId: string,
  timeframe: 'week' | 'month'
): Promise<RevenueChartPoint[]> {
  const cacheKey = `${storeId}:${timeframe}`;
  const existing = chartInFlight.get(cacheKey);
  if (existing) return existing;

  const fetchPromise = (async () => {
    try {
      const days = timeframe === 'week' ? 7 : 28;
      const rangeStart = new Date();
      rangeStart.setHours(0, 0, 0, 0);
      rangeStart.setDate(rangeStart.getDate() - (days - 1));

      const { data, error } = await supabase
        .from('orders')
        .select('status, final_amount, created_at')
        .eq('store_id', storeId)
        .gte('created_at', rangeStart.toISOString());

      if (error) {
        console.warn('Lấy dữ liệu biểu đồ doanh thu lỗi:', error.message);
        return [];
      }

      const revenueOrders = (data || []).filter((order: any) => isRevenueStatus(order.status));

      if (timeframe === 'week') {
        return Array.from({ length: 7 }, (_, index) => {
          const date = new Date(rangeStart);
          date.setDate(rangeStart.getDate() + index);
          const value = revenueOrders
            .filter((order: any) => new Date(order.created_at).toDateString() === date.toDateString())
            .reduce((sum: number, order: any) => sum + Number(order.final_amount || 0), 0);
          return { label: DAY_LABELS[date.getDay()], value };
        });
      }

      return Array.from({ length: 4 }, (_, index) => {
        const bucketStart = new Date(rangeStart);
        bucketStart.setDate(rangeStart.getDate() + index * 7);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(bucketStart.getDate() + 7);
        const value = revenueOrders
          .filter((order: any) => {
            const created = new Date(order.created_at);
            return created >= bucketStart && created < bucketEnd;
          })
          .reduce((sum: number, order: any) => sum + Number(order.final_amount || 0), 0);
        return { label: `Tuần ${index + 1}`, value };
      });
    } finally {
      chartInFlight.delete(cacheKey);
    }
  })();

  chartInFlight.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function fetchRecentReviews(storeId: string): Promise<ReviewItem[]> {
  const existing = reviewsInFlight.get(storeId);
  if (existing) return existing;

  const fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, users(name)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        console.warn('Lấy đánh giá gần đây lỗi:', error.message);
        return [];
      }

      return (data || []).map((row: any) => {
        const customer = Array.isArray(row.users) ? row.users[0] : row.users;
        const name = customer?.name || 'Khách hàng';
        return {
          id: row.id,
          customerName: name,
          avatar: initialsOf(name),
          rating: Number(row.rating || 0),
          comment: row.comment || '',
          timeAgo: formatTimeAgo(row.created_at),
        };
      });
    } finally {
      reviewsInFlight.delete(storeId);
    }
  })();

  reviewsInFlight.set(storeId, fetchPromise);
  return fetchPromise;
}

export async function exportAnalyticsReport(storeId: string): Promise<boolean> {
  const [metrics, weekChart, reviews] = await Promise.all([
    fetchAnalyticsMetrics(storeId),
    fetchRevenueChart(storeId, 'week'),
    fetchRecentReviews(storeId),
  ]);

  const rows: string[][] = [
    ['Báo cáo GoSavingFood', new Date().toLocaleString('vi-VN')],
    [],
    ['Tổng doanh thu', String(metrics.totalRevenue)],
    ['Doanh thu tháng này', String(metrics.monthlyRevenue)],
    ['Doanh thu tháng trước', String(metrics.previousMonthRevenue)],
    ['Tăng trưởng tháng (%)', String(metrics.monthlyGrowthPercent)],
    ['Tổng số đơn', String(metrics.totalOrders)],
    ['Túi đã bán', String(metrics.totalSoldBags)],
    ['Túi đang bán trên kệ', String(metrics.bagsOnShelf)],
    ['Đánh giá trung bình', String(metrics.averageRating)],
    ['Tổng số đánh giá', String(metrics.totalReviewsCount)],
    [],
    ['Doanh thu 7 ngày gần nhất'],
    ['Ngày', 'Doanh thu'],
    ...weekChart.map((point) => [point.label, String(point.value)]),
    [],
    ['Đánh giá gần đây'],
    ['Khách hàng', 'Số sao', 'Nhận xét'],
    ...reviews.map((review) => [review.customerName, String(review.rating), review.comment]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gosavingfood-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
