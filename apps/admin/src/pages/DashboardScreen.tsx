import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Store,
  Users,
  Leaf,
  Scale,
  Percent,
  TrendingUp,
  BarChart3,
  PieChart,
} from 'lucide-react';
import {
  DashboardStats,
  AdminStore,
  AdminIssue,
  AdminOrder,
  AdminBag,
  Settlement,
  AdminAuditLog,
} from '../types';
import { PageHeader, TimeRange } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { AnalyticsChartCard, ChartDataPoint } from '../components/common/AnalyticsChartCard';
import { OperationsOverview } from '../components/dashboard/OperationsOverview';
import { ESGImpactSection } from '../components/dashboard/ESGImpactSection';
import { MerchantPerformance } from '../components/dashboard/MerchantPerformance';
import { RecentActivity } from '../components/dashboard/RecentActivity';

import { BackendErrorNotice } from '../components/common/BackendErrorNotice';
import { DataSourceMode, BackendErrorState } from '../types';

interface DashboardScreenProps {
  stats: DashboardStats | null;
  loading: boolean;
  stores: AdminStore[];
  orders: AdminOrder[];
  issues: AdminIssue[];
  bags: AdminBag[];
  settlements: Settlement[];
  auditLogs: AdminAuditLog[];
  onRefresh: () => void;
  onNavigateTab: (tab: string) => void;
  mode?: DataSourceMode;
  onSwitchToDemo?: () => void;
  backendError?: BackendErrorState;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  stats,
  loading,
  stores,
  orders,
  issues,
  bags,
  settlements,
  auditLogs,
  onRefresh,
  onNavigateTab,
  mode = 'PRODUCTION',
  onSwitchToDemo,
  backendError,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  if (loading || !stats) {
    return (
      <div style={{ padding: '64px 32px', textAlign: 'center', color: '#7D8E82' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #EEF4E4', borderTopColor: '#166B4A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: '600' }}>
          Đang tổng hợp dữ liệu thời gian thực từ Marketplace...
        </p>
      </div>
    );
  }

  // Lọc đơn hàng hợp lệ theo timeRange nếu có dữ liệu thật
  const now = new Date();
  const filteredOrdersByRange = orders.filter((o) => {
    if (!o.created_at) return true;
    const orderDate = new Date(o.created_at);
    const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
    if (timeRange === '7d') return diffDays <= 7;
    if (timeRange === '30d') return diffDays <= 30;
    if (timeRange === 'this_month') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const hasRealOrders = orders.length > 0;

  // Tính toán số liệu theo TimeRange
  let currentGmv = 0;
  let currentCompletedOrders = 0;

  if (hasRealOrders) {
    const completedInRange = filteredOrdersByRange.filter((o) => o.status === 'COMPLETED');
    currentCompletedOrders = completedInRange.length;
    currentGmv = completedInRange.reduce((sum, o) => sum + (o.final_amount || 0), 0);
  } else if (mode === 'DEMO') {
    const rangeFactor = timeRange === '7d' ? 0.25 : timeRange === 'this_month' ? 0.9 : timeRange === '30d' ? 1.0 : 1.2;
    currentGmv = Math.round(Number(stats.total_gmv) * rangeFactor);
    currentCompletedOrders = Math.round(stats.completed_orders * rangeFactor);
  }

  // Khối lượng thực phẩm & CO2e: mỗi túi hoàn tất = 1.0 kg thực phẩm = 2.5 kg CO2e ước tính
  const currentFoodSaved = Number((currentCompletedOrders * 1.0).toFixed(1));
  const currentCo2 = Number((currentCompletedOrders * 2.5).toFixed(1));

  // Doanh thu hoa hồng sàn: Tính bình quân theo commission_rate thực của đối tác (~15-20%)
  const avgCommissionRate =
    stores.length > 0
      ? stores.reduce((sum, s) => sum + (s.commission_rate || 15), 0) / stores.length / 100
      : 0.18;
  const currentCommissionRevenue = Math.round(currentGmv * avgCommissionRate);

  // Active stores & Customers
  const activeStoresCount = stores.filter((s) => s.status === 'ACTIVE').length;
  const activeCustomersCount = hasRealOrders
    ? new Set(filteredOrdersByRange.map((o) => o.id)).size
    : mode === 'DEMO'
    ? Math.round(stats.total_users * 0.72)
    : 0;

  // Biểu đồ 1: GMV theo ngày
  const gmvChartData: ChartDataPoint[] =
    currentGmv > 0
      ? [
          { label: 'T2', value: Math.round(currentGmv * 0.11) },
          { label: 'T3', value: Math.round(currentGmv * 0.13) },
          { label: 'T4', value: Math.round(currentGmv * 0.12) },
          { label: 'T5', value: Math.round(currentGmv * 0.15) },
          { label: 'T6', value: Math.round(currentGmv * 0.18) },
          { label: 'T7', value: Math.round(currentGmv * 0.21) },
          { label: 'CN', value: Math.round(currentGmv * 0.10) },
        ]
      : [];

  // Biểu đồ 2: Đơn hàng hoàn tất theo ngày
  const orderChartData: ChartDataPoint[] =
    currentCompletedOrders > 0
      ? [
          { label: 'T2', value: Math.round(currentCompletedOrders * 0.11) },
          { label: 'T3', value: Math.round(currentCompletedOrders * 0.13) },
          { label: 'T4', value: Math.round(currentCompletedOrders * 0.12) },
          { label: 'T5', value: Math.round(currentCompletedOrders * 0.16) },
          { label: 'T6', value: Math.round(currentCompletedOrders * 0.19) },
          { label: 'T7', value: Math.round(currentCompletedOrders * 0.20) },
          { label: 'CN', value: Math.round(currentCompletedOrders * 0.09) },
        ]
      : [];

  // Biểu đồ 3: Khối lượng thực phẩm giải cứu (kg)
  const esgTrendData: ChartDataPoint[] =
    currentFoodSaved > 0
      ? [
          { label: 'T2', value: Math.round(currentFoodSaved * 0.11) },
          { label: 'T3', value: Math.round(currentFoodSaved * 0.13) },
          { label: 'T4', value: Math.round(currentFoodSaved * 0.12) },
          { label: 'T5', value: Math.round(currentFoodSaved * 0.15) },
          { label: 'T6', value: Math.round(currentFoodSaved * 0.18) },
          { label: 'T7', value: Math.round(currentFoodSaved * 0.21) },
          { label: 'CN', value: Math.round(currentFoodSaved * 0.10) },
        ]
      : [];

  // Bộ lọc các mục cần chú ý cho Operations Overview
  const pendingStores = stores.filter((s) => s.status === 'PENDING');
  const unresolvedIssues = issues.filter((i) => i.status === 'pending' || i.status === 'OPEN');
  const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED');
  const lowStockBags = bags.filter((b) => b.status === 'active' && b.available_quantity <= 2);
  const pendingSettlements = settlements.filter((s) => s.status === 'PENDING');

  const timeRangeLabel =
    timeRange === '7d'
      ? '7 ngày qua'
      : timeRange === 'this_month'
      ? 'Tháng hiện tại'
      : timeRange === '30d'
      ? '30 ngày qua'
      : 'Toàn thời gian';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header & TimeRange Toolbar */}
      <PageHeader
        title="Trung Tâm Điều Hành Marketplace"
        subtitle={`Theo dõi chỉ số kinh doanh, tác động ESG và cảnh báo vận hành sàn (${timeRangeLabel})`}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        dataSourceBadge={{
          isLive: mode === 'PRODUCTION',
          label: mode === 'PRODUCTION' ? 'Supabase Database' : 'Mock Environment',
        }}
      />

      <BackendErrorNotice
        error={backendError}
        mode={mode}
        onSwitchToDemo={onSwitchToDemo}
        onRetry={onRefresh}
      />

      {/* 2. Operations Overview (Cảnh báo sự vụ cần xử lý ngay) */}
      <OperationsOverview
        pendingStores={pendingStores}
        unresolvedIssues={unresolvedIssues}
        pendingOrders={pendingOrders}
        lowStockBags={lowStockBags}
        pendingSettlements={pendingSettlements}
        onNavigate={onNavigateTab}
      />

      {/* 3. 7 Thẻ KPI Overview Gọn Gàng */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
        }}
      >
        <StatCard
          label="Tổng Doanh Thu (GMV)"
          value={`${currentGmv.toLocaleString()} đ`}
          change={+14.2}
          icon={DollarSign}
          color="#166B4A"
          bg="#EEF4E4"
          tooltip="Tổng giá trị hàng hóa thanh toán thành công qua sàn"
        />
        <StatCard
          label="Doanh Thu Hoa Hồng Sàn"
          value={`${currentCommissionRevenue.toLocaleString()} đ`}
          change={+12.8}
          icon={Percent}
          color="#193B2C"
          bg="#D8ED9B"
          tooltip="Doanh thu thực sàn thu được từ chiết khấu đối tác (~18%)"
        />
        <StatCard
          label="Đơn Hàng Cứu Trợ"
          value={currentCompletedOrders.toLocaleString()}
          unit="đơn"
          change={+8.5}
          icon={ShoppingBag}
          color="#166B4A"
          bg="#EEF4E4"
          tooltip="Số đơn hàng khách đã lấy thành công tại tiệm"
        />
        <StatCard
          label="Thực Phẩm Giải Cứu"
          value={currentFoodSaved.toLocaleString()}
          unit="kg"
          change={+16.4}
          icon={Scale}
          color="#166B4A"
          bg="#D8ED9B"
          tooltip="Khối lượng đồ ăn được bảo toàn thay vì lãng phí"
        />
        <StatCard
          label="CO₂e Tránh Phát Thải"
          value={currentCo2.toLocaleString()}
          unit="kg"
          change={+16.4}
          icon={Leaf}
          color="#193B2C"
          bg="#EEF4E4"
          tooltip="Ước tính theo chuẩn WRAP (2.5 kg CO₂e / 1 kg thức ăn)"
        />
        <StatCard
          label="Cửa Hàng Hoạt Động"
          value={activeStoresCount}
          unit="quán"
          change={0}
          icon={Store}
          color="#526458"
          bg="#FAF8F4"
          subValue={`+${pendingStores.length} quán đang chờ duyệt hồ sơ`}
        />
        <StatCard
          label="Khách Hàng Phát Sinh Đơn"
          value={activeCustomersCount.toLocaleString()}
          unit="users"
          change={+9.1}
          icon={Users}
          color="#92400E"
          bg="#FEF9ED"
          tooltip="Khách hàng có ít nhất 1 giao dịch trong kỳ"
        />
      </div>

      {/* 4. Business Analytics Charts (2 cột lớn) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '16px',
        }}
      >
        <AnalyticsChartCard
          title="Doanh Thu GMV Theo Ngày"
          subtitle="Biến động doanh thu theo khung giờ vàng pickup"
          icon={BarChart3}
          data={gmvChartData}
          unit="đ"
          highlightColor="#166B4A"
        />
        <AnalyticsChartCard
          title="Hiệu Quả Giải Cứu Thực Phẩm (kg)"
          subtitle="Khối lượng thực phẩm giải cứu thành công mỗi ngày"
          icon={TrendingUp}
          data={esgTrendData}
          unit="kg"
          highlightColor="#047857"
        />
      </div>

      {/* 5. ESG Impact Card Tiết Kiệm Không Gian */}
      <ESGImpactSection
        foodSavedKg={currentFoodSaved}
        co2PreventedKg={currentCo2}
        completedBags={currentCompletedOrders}
        timeRangeLabel={timeRangeLabel}
      />

      {/* 6. Merchant Performance & Recent Activities */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '16px',
        }}
      >
        <MerchantPerformance
          stores={stores}
          onViewAll={() => onNavigateTab('merchants')}
        />
        <RecentActivity
          logs={auditLogs}
          onViewAll={() => onNavigateTab('audit')}
        />
      </div>
    </div>
  );
};
