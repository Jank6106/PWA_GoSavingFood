import { ANALYTICS_METRICS_MOCK, MONTH_CHART_MOCK, REVIEWS_MOCK, WEEK_CHART_MOCK } from '../mocks';
import type { RevenueChartPoint } from '../types';
import { clone, delay } from './utils';

export async function fetchAnalyticsMetrics(storeId: string) { void storeId; await delay(); return clone(ANALYTICS_METRICS_MOCK); }
export async function fetchRevenueChart(_storeId: string, timeframe: 'week' | 'month'): Promise<RevenueChartPoint[]> { await delay(180); return clone(timeframe === 'week' ? WEEK_CHART_MOCK : MONTH_CHART_MOCK); }
export async function fetchRecentReviews(storeId: string) { void storeId; await delay(180); return clone(REVIEWS_MOCK); }
export async function exportAnalyticsReport(storeId: string) { void storeId; await delay(520); return true; }
