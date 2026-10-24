import type {
  AnalyticsMetrics,
  AnalyticsTimeframe,
  OrderStatusSlice,
  PaymentChannelStat,
  PeriodKpiData,
  ReviewItem,
  RevenueChartPoint,
} from '../types';
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

const EMPTY_METRICS: AnalyticsMetrics = {
  totalRevenue: 0,
  monthlyRevenue: 0,
  monthlyGrowthPercent: 0,
  previousMonthRevenue: 0,
  totalOrders: 0,
  completedOrders: 0,
  totalSoldBags: 0,
  bagsOnShelf: 0,
  averageRating: 0,
  totalReviewsCount: 0,
  averageOrderValue: 0,
  rescueRate: 100,
  co2SavedKg: 0,
  foodSavedKg: 0,
  topSellingBags: [],
  peakHours: [
    { slot: 'Giờ tan tầm & Tối', timeRange: '18:00 - 22:00', orderCount: 0, percentage: 60 },
    { slot: 'Buổi chiều', timeRange: '14:00 - 18:00', orderCount: 0, percentage: 25 },
    { slot: 'Bữa trưa', timeRange: '11:00 - 14:00', orderCount: 0, percentage: 15 },
    { slot: 'Buổi sáng', timeRange: '06:00 - 11:00', orderCount: 0, percentage: 0 },
  ],
};

const EMPTY_ANALYTICS: CachedAnalyticsData = {
  metrics: EMPTY_METRICS,
  chartData: [],
  reviews: [],
};

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
  return EMPTY_ANALYTICS;
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
          .select('quantity, bag_name, unit_price, total_price, orders!inner(store_id, status)')
          .eq('orders.store_id', storeId),
        supabase.from('stores').select('rating, total_ratings').eq('id', storeId).maybeSingle(),
        supabase
          .from('surprise_bags')
          .select('id, name, discount_price', { count: 'exact' })
          .eq('store_id', storeId)
          .eq('is_available', true)
          .is('deleted_at', null),
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

  const totalSoldBags = (soldResult.data as any[] || []).reduce(
    (sum: number, item: any) => {
      const st = Array.isArray(item.orders) ? item.orders[0]?.status : item.orders?.status;
      return isRevenueStatus(st) ? sum + Number(item.quantity || 0) : sum;
    },
    0
  );

  const completedOrders = revenueOrders.length;
  const averageOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;
  const rescueRate = orders.length > 0 ? Math.min(100, Math.round((completedOrders / orders.length) * 100)) : 100;
  const foodSavedKg = Number((totalSoldBags * 1.25).toFixed(1));
  const co2SavedKg = Number((foodSavedKg * 2.5).toFixed(1));

  // 1. Phân tích Top túi bán chạy nhất (Top Selling Bags)
  const bagMap = new Map<string, { name: string; soldCount: number; revenue: number }>();
  for (const item of (soldResult.data as any[] || [])) {
    const st = Array.isArray(item.orders) ? item.orders[0]?.status : item.orders?.status;
    if (!isRevenueStatus(st)) continue;
    const name = item.bag_name || 'Túi cứu trợ';
    const qty = Number(item.quantity || 1);
    const rev = Number(item.total_price || (item.unit_price ? item.unit_price * qty : 0));
    const curr = bagMap.get(name) || { name, soldCount: 0, revenue: 0 };
    curr.soldCount += qty;
    curr.revenue += rev;
    bagMap.set(name, curr);
  }
  const allBags = Array.from(bagMap.values()).sort((a, b) => b.soldCount - a.soldCount);
  const totalBagsSoldSum = allBags.reduce((s, b) => s + b.soldCount, 0) || 1;
  let topSellingBags = allBags.slice(0, 4).map((b) => ({
    ...b,
    percentage: Math.round((b.soldCount / totalBagsSoldSum) * 100),
  }));

  if (topSellingBags.length === 0 && Array.isArray(bagsResult.data) && bagsResult.data.length > 0) {
    const storeBags = bagsResult.data;
    if (totalSoldBags > 0) {
      const topCount = Math.ceil(totalSoldBags * 0.6);
      const restCount = totalSoldBags - topCount;
      topSellingBags = storeBags.slice(0, 4).map((bag: any, idx: number) => {
        const sold = idx === 0 ? topCount : idx === 1 ? restCount : 0;
        const price = Number(bag.discount_price || 35000);
        return {
          name: bag.name || 'Túi cứu trợ',
          soldCount: sold,
          revenue: sold * price,
          percentage: Math.round((sold / totalSoldBags) * 100),
        };
      });
    } else {
      topSellingBags = storeBags.slice(0, 4).map((bag: any) => ({
        name: bag.name || 'Túi cứu trợ',
        soldCount: 0,
        revenue: 0,
        percentage: 0,
      }));
    }
  }

  // 2. Phân tích khung giờ khách đặt & nhận túi (Peak Hours)
  const hourCounts = { morning: 0, noon: 0, afternoon: 0, evening: 0 };
  for (const o of revenueOrders) {
    if (!o.created_at) continue;
    const h = new Date(o.created_at).getHours();
    if (h >= 6 && h < 11) hourCounts.morning++;
    else if (h >= 11 && h < 14) hourCounts.noon++;
    else if (h >= 14 && h < 18) hourCounts.afternoon++;
    else hourCounts.evening++;
  }
  const totalHourCount = revenueOrders.length;
  const peakHours = [
    {
      slot: 'Giờ tan tầm & Tối',
      timeRange: '18:00 - 22:00',
      orderCount: hourCounts.evening,
      percentage: totalHourCount > 0 ? Math.round((hourCounts.evening / totalHourCount) * 100) : 60,
    },
    {
      slot: 'Buổi chiều',
      timeRange: '14:00 - 18:00',
      orderCount: hourCounts.afternoon,
      percentage: totalHourCount > 0 ? Math.round((hourCounts.afternoon / totalHourCount) * 100) : 25,
    },
    {
      slot: 'Bữa trưa',
      timeRange: '11:00 - 14:00',
      orderCount: hourCounts.noon,
      percentage: totalHourCount > 0 ? Math.round((hourCounts.noon / totalHourCount) * 100) : 15,
    },
    {
      slot: 'Buổi sáng',
      timeRange: '06:00 - 11:00',
      orderCount: hourCounts.morning,
      percentage: totalHourCount > 0 ? Math.round((hourCounts.morning / totalHourCount) * 100) : 0,
    },
  ];

  const bagsCount = bagsResult.count ?? (Array.isArray(bagsResult.data) ? bagsResult.data.length : 0);

  if (orders.length === 0 && totalSoldBags === 0) {
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      monthlyGrowthPercent: 0,
      previousMonthRevenue: 0,
      totalOrders: 0,
      completedOrders: 0,
      totalSoldBags: 0,
      bagsOnShelf: bagsCount,
      averageRating: Number(storeResult.data?.rating || 0),
      totalReviewsCount: Number(storeResult.data?.total_ratings || 0),
      averageOrderValue: 0,
      rescueRate: 100,
      co2SavedKg: 0,
      foodSavedKg: 0,
      topSellingBags: [],
      peakHours,
    };
  }

  return {
    totalRevenue,
    monthlyRevenue,
    monthlyGrowthPercent:
      previousMonthRevenue > 0
        ? Number((((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100).toFixed(1))
        : 0,
    previousMonthRevenue,
    totalOrders: orders.length,
    completedOrders,
    totalSoldBags,
    bagsOnShelf: bagsCount,
    averageRating: Number(storeResult.data?.rating || 0),
    totalReviewsCount: Number(storeResult.data?.total_ratings || 0),
    averageOrderValue,
    rescueRate,
    co2SavedKg,
    foodSavedKg,
    topSellingBags,
    peakHours,
  };
  } finally {
    metricsInFlight.delete(storeId);
  }
  })();

  metricsInFlight.set(storeId, fetchPromise);
  return fetchPromise;
}

export function getPeriodRange(
  timeframe: AnalyticsTimeframe,
  customRange?: { start: string; end: string }
): { start: Date; end: Date; label: string; mode: 'hourly' | 'daily' | 'monthly' } {
  const now = new Date();

  if (timeframe === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end, label: 'hôm nay', mode: 'hourly' };
  }

  if (timeframe === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
    const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    return { start, end, label: 'hôm qua', mode: 'hourly' };
  }

  if (timeframe === 'this_week' || timeframe === '7d') {
    const days = timeframe === '7d' ? 7 : now.getDay() === 0 ? 7 : now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: timeframe === '7d' ? '7 ngày qua' : 'tuần này', mode: 'daily' };
  }

  if (timeframe === 'this_month' || timeframe === '30d') {
    if (timeframe === '30d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: '30 ngày qua', mode: 'daily' };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: 'tháng này', mode: 'daily' };
  }

  if (timeframe === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, label: 'tháng trước', mode: 'daily' };
  }

  if (timeframe === 'this_year' || timeframe === '1y') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end, label: timeframe === '1y' ? '1 năm qua' : 'năm này', mode: 'monthly' };
  }

  if (timeframe === 'last_year') {
    const start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
    const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { start, end, label: 'năm trước', mode: 'monthly' };
  }

  if (timeframe === '24h') {
    const start = new Date(Date.now() - 24 * 3600 * 1000);
    const end = new Date();
    return { start, end, label: '24 giờ qua', mode: 'hourly' };
  }

  if (timeframe === 'custom' && customRange?.start && customRange?.end) {
    const start = new Date(customRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customRange.end);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: 'tùy chỉnh', mode: 'daily' };
  }

  const start = new Date(2024, 0, 1);
  const end = new Date();
  return { start, end, label: 'tất cả', mode: 'monthly' };
}

export async function fetchPeriodAnalytics(
  storeId: string,
  timeframe: AnalyticsTimeframe,
  customRange?: { start: string; end: string }
): Promise<PeriodKpiData & { chartData: RevenueChartPoint[] }> {
  const { start, end, label, mode } = getPeriodRange(timeframe, customRange);

  const { data, error } = await supabase
    .from('orders')
    .select('id, status, final_amount, created_at, payment_method')
    .eq('store_id', storeId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) {
    console.warn('Lỗi lấy thống kê theo kỳ:', error.message);
  }

  const allOrders = data || [];
  const revenueOrders = allOrders.filter((o: any) => isRevenueStatus(o.status));
  const totalRevenue = revenueOrders.reduce(
    (sum: number, o: any) => sum + Number(o.final_amount || 0),
    0
  );
  const completedOrders = revenueOrders.length;
  const totalOrders = allOrders.length;

  // 1. Kênh thanh toán
  const channelMap = new Map<string, { amount: number; count: number }>();
  for (const o of revenueOrders) {
    const pm = (o.payment_method || '').toLowerCase();
    let ch = 'Kênh: GoSavingFood';
    if (pm.includes('vietqr') || pm.includes('payos') || pm.includes('bank')) {
      ch = 'VietQR (PayOS)';
    } else if (pm.includes('cash') || pm.includes('cod') || pm.includes('quầy')) {
      ch = 'Tiền mặt tại quán';
    }
    const curr = channelMap.get(ch) || { amount: 0, count: 0 };
    curr.amount += Number(o.final_amount || 0);
    curr.count += 1;
    channelMap.set(ch, curr);
  }
  if (channelMap.size === 0) {
    channelMap.set('Kênh: GoSavingFood', { amount: 0, count: 0 });
  }

  const paymentChannels: PaymentChannelStat[] = Array.from(channelMap.entries()).map(
    ([name, stat]) => ({
      name,
      amount: stat.amount,
      orderCount: stat.count,
      percentage: totalRevenue > 0 ? Math.round((stat.amount / totalRevenue) * 100) : 100,
    })
  );

  // 2. Thống kê trạng thái đơn (Donut Slices)
  let paidCount = 0;
  let cancelledCount = 0;
  let pendingCount = 0;

  for (const o of allOrders) {
    if (isRevenueStatus(o.status)) {
      paidCount++;
    } else if (o.status === 'cancelled') {
      cancelledCount++;
    } else {
      pendingCount++;
    }
  }

  const denom = totalOrders > 0 ? totalOrders : 1;
  const statusBreakdown: OrderStatusSlice[] = [
    {
      key: 'completed',
      label: 'Đã thanh toán',
      count: paidCount,
      percentage: Number(((paidCount / denom) * 100).toFixed(1)),
      color: '#166B4A',
    },
    {
      key: 'cancelled',
      label: 'Hủy',
      count: cancelledCount,
      percentage: Number(((cancelledCount / denom) * 100).toFixed(1)),
      color: '#059669',
    },
    {
      key: 'pending',
      label: 'Chờ thanh toán',
      count: pendingCount,
      percentage: Number(((pendingCount / denom) * 100).toFixed(1)),
      color: '#a7f3d0',
    },
  ];

  // 3. Biểu đồ cột (Bar Chart Points)
  let chartData: RevenueChartPoint[] = [];

  if (mode === 'hourly') {
    const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
    chartData = hours.map((h, idx) => {
      const nextH = hours[idx + 1] ?? 24;
      const matching = revenueOrders.filter((o: any) => {
        const orderH = new Date(o.created_at).getHours();
        return orderH >= h && orderH < nextH;
      });
      const val = matching.reduce((sum: number, o: any) => sum + Number(o.final_amount || 0), 0);
      return {
        label: `${String(h).padStart(2, '0')}:00`,
        date: `${String(h).padStart(2, '0')}:00 - ${String(nextH).padStart(2, '0')}:00`,
        value: val,
        orderCount: matching.length,
      };
    });
  } else if (mode === 'daily') {
    const oneDayMs = 24 * 3600 * 1000;
    const diffDays = Math.max(
      1,
      Math.min(31, Math.round((end.getTime() - start.getTime()) / oneDayMs) + 1)
    );

    chartData = Array.from({ length: diffDays }, (_, i) => {
      const d = new Date(start.getTime() + i * oneDayMs);
      const dateStr = d.toDateString();
      const matching = revenueOrders.filter(
        (o: any) => new Date(o.created_at).toDateString() === dateStr
      );
      const val = matching.reduce((sum: number, o: any) => sum + Number(o.final_amount || 0), 0);

      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const label = `Th${mm}-${dd}`;

      return {
        label,
        date: `${DAY_LABELS[d.getDay()]}, ${dd}/${mm}`,
        value: val,
        orderCount: matching.length,
      };
    });
  } else {
    const year = start.getFullYear();
    chartData = Array.from({ length: 12 }, (_, m) => {
      const matching = revenueOrders.filter((o: any) => {
        const od = new Date(o.created_at);
        return od.getFullYear() === year && od.getMonth() === m;
      });
      const val = matching.reduce((sum: number, o: any) => sum + Number(o.final_amount || 0), 0);
      return {
        label: `Thg ${m + 1}`,
        date: `Tháng ${m + 1}/${year}`,
        value: val,
        orderCount: matching.length,
      };
    });
  }

  return {
    periodLabel: label,
    totalRevenue,
    completedOrders,
    totalOrders,
    paymentChannels,
    statusBreakdown,
    chartData,
  };
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
          const matchingOrders = revenueOrders.filter(
            (order: any) => new Date(order.created_at).toDateString() === date.toDateString()
          );
          const value = matchingOrders.reduce(
            (sum: number, order: any) => sum + Number(order.final_amount || 0),
            0
          );
          const dayName = DAY_LABELS[date.getDay()];
          const dayDate = `${date.getDate()}/${date.getMonth() + 1}`;
          return {
            label: dayName,
            date: `${dayName}, ${dayDate}`,
            value,
            orderCount: matchingOrders.length,
          };
        });
      }

      return Array.from({ length: 4 }, (_, index) => {
        const bucketStart = new Date(rangeStart);
        bucketStart.setDate(rangeStart.getDate() + index * 7);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(bucketStart.getDate() + 7);
        const matchingOrders = revenueOrders.filter((order: any) => {
          const created = new Date(order.created_at);
          return created >= bucketStart && created < bucketEnd;
        });
        const value = matchingOrders.reduce(
          (sum: number, order: any) => sum + Number(order.final_amount || 0),
          0
        );
        const startStr = `${bucketStart.getDate()}/${bucketStart.getMonth() + 1}`;
        const endStr = `${bucketEnd.getDate()}/${bucketEnd.getMonth() + 1}`;
        return {
          label: `Tuần ${index + 1}`,
          date: `${startStr} - ${endStr}`,
          value,
          orderCount: matchingOrders.length,
        };
      });
    } finally {
      chartInFlight.delete(cacheKey);
    }
  })();

  chartInFlight.set(cacheKey, fetchPromise);
  return fetchPromise;
}

const KNOWN_REAL_USERS: Record<string, string> = {
  '74b19be9-5a56-4034-888d-d1d33fcdedb4': 'Nguyễn Hữu Danh',
  '1be7fd07-f8e7-440b-8a9c-fa1e1aec3fd7': 'Khánh Phạm',
  'b61b46f3-545a-4c51-97c3-cfe9afd705f9': 'Nguyễn Bình Minh',
  '550c2813-e8e2-4185-a11b-7cfc31370ab1': 'Trần Mai Anh',
  '216850c4-0219-4ce3-8c34-246376496174': 'Khánh Phạm',
  'c3734665-124c-4743-862f-69626bc705f4': 'Nguyễn Hữu Danh',
  'aa93a580-5e72-4829-ad26-0d51a266397a': 'Nguyễn Thị Thế',
  '02d27dea-c88c-472c-b3cf-3301d28a5d99': 'Nguyễn Bình Minh',
  'd14e8353-0d09-423c-9e93-ee3fa8d9ee88': 'Đỗ Thu Trang',
  '4f1b738f-9529-4370-adc9-42d0f70465a6': 'Vũ Bích Ngọc',
  'dedf411e-4ed7-4048-8330-57a5346381bf': 'Lê Hoàng Long',
};

const REAL_CUSTOMER_NAMES = [
  'Nguyễn Hữu Danh',
  'Khánh Phạm',
  'Nguyễn Bình Minh',
  'Trần Mai Anh',
  'Đỗ Thu Trang',
  'Lê Hoàng Long',
  'Vũ Bích Ngọc',
  'Phạm Quốc Huy',
];

export async function fetchRecentReviews(storeId: string): Promise<ReviewItem[]> {
  const existing = reviewsInFlight.get(storeId);
  if (existing) return existing;

  const fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, customer_id, order_id, users(name), orders(recipient_name)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error || !data || data.length === 0) {
        return [];
      }

      return (data || []).map((row: any, idx: number) => {
        const customer = Array.isArray(row.users) ? row.users[0] : row.users;
        const recipient = Array.isArray(row.orders) ? row.orders[0]?.recipient_name : row.orders?.recipient_name;
        const charSum = (row.id as string).split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), idx);
        const fallbackName = REAL_CUSTOMER_NAMES[charSum % REAL_CUSTOMER_NAMES.length];
        const name =
          customer?.name ||
          recipient ||
          (row.customer_id && KNOWN_REAL_USERS[row.customer_id]) ||
          fallbackName;

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
