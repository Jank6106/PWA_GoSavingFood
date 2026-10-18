import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardScreen } from './pages/DashboardScreen';
import { MerchantsScreen } from './pages/MerchantsScreen';
import { BagsScreen } from './pages/BagsScreen';
import { OrdersScreen } from './pages/OrdersScreen';
import { BannersScreen } from './pages/BannersScreen';
import { IssuesScreen } from './pages/IssuesScreen';
import { FinanceScreen } from './pages/FinanceScreen';
import { AuditLogsScreen } from './pages/AuditLogsScreen';
import { LoginScreen } from './pages/LoginScreen';
import { adminService } from './services/admin.service';
import {
  DashboardStats,
  AdminStore,
  Banner,
  AdminOrder,
  AdminIssue,
  AdminBag,
  Settlement,
  AdminAuditLog,
  DataSourceMode,
  BackendErrorState,
} from './types';
import { supabase } from './services/supabase';

export const App: React.FC = () => {
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('gsf_admin_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [mode, setMode] = useState<DataSourceMode>(() => {
    const saved = localStorage.getItem('gsf_admin_mode');
    return (saved as DataSourceMode) || 'PRODUCTION';
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [bags, setBags] = useState<AdminBag[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Lưu trữ lỗi từng phân hệ để hiển thị minh bạch
  const [errors, setErrors] = useState<Record<string, BackendErrorState | undefined>>({});

  const toggleMode = () => {
    const nextMode: DataSourceMode = mode === 'PRODUCTION' ? 'DEMO' : 'PRODUCTION';
    setMode(nextMode);
    localStorage.setItem('gsf_admin_mode', nextMode);
  };

  const switchToDemo = () => {
    setMode('DEMO');
    localStorage.setItem('gsf_admin_mode', 'DEMO');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [sRes, stRes, bgRes, bRes, oRes, iRes, stlRes, aRes] = await Promise.all([
        adminService.getDashboardStats(mode),
        adminService.getStores(mode),
        adminService.getBags(mode),
        adminService.getBanners(mode),
        adminService.getOrders(mode),
        adminService.getIssues(mode),
        adminService.getSettlements(mode),
        adminService.getAuditLogs(mode),
      ]);

      setStats(sRes.data);
      setStores(stRes.data);
      setBags(bgRes.data);
      setBanners(bRes.data);
      setOrders(oRes.data);
      setIssues(iRes.data);
      setSettlements(stlRes.data);
      setAuditLogs(aRes.data);

      setErrors({
        dashboard: sRes.error,
        stores: stRes.error,
        bags: bgRes.error,
        banners: bRes.error,
        orders: oRes.error,
        issues: iRes.error,
        settlements: stlRes.error,
        auditLogs: aRes.error,
      });
    } catch (err: any) {
      console.error('Lỗi nạp dữ liệu vận hành:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, mode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('gsf_admin_session');
    setUser(null);
  };

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  const urgentIssuesCount = issues.filter((i) => i.status === 'pending' || i.status === 'OPEN').length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F1E8' }}>
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLogout={handleLogout}
        urgentCount={urgentIssuesCount}
        mode={mode}
        onToggleMode={toggleMode}
      />
      <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', maxHeight: '100vh', minWidth: 0 }}>
        {currentTab === 'dashboard' && (
          <DashboardScreen
            stats={stats}
            loading={loading}
            stores={stores}
            orders={orders}
            issues={issues}
            bags={bags}
            settlements={settlements}
            auditLogs={auditLogs}
            onRefresh={loadData}
            onNavigateTab={setCurrentTab}
            mode={mode}
            onSwitchToDemo={switchToDemo}
            backendError={errors.dashboard}
          />
        )}
        {currentTab === 'merchants' && (
          <MerchantsScreen
            stores={stores}
            onRefresh={loadData}
          />
        )}
        {currentTab === 'bags' && (
          <BagsScreen
            bags={bags}
            onRefresh={loadData}
          />
        )}
        {currentTab === 'orders' && (
          <OrdersScreen
            orders={orders}
            onRefresh={loadData}
          />
        )}
        {currentTab === 'issues' && (
          <IssuesScreen
            issues={issues}
            onRefresh={loadData}
          />
        )}
        {currentTab === 'banners' && (
          <BannersScreen
            banners={banners}
            onRefresh={loadData}
            backendError={errors.banners}
            mode={mode}
            onSwitchToDemo={switchToDemo}
          />
        )}
        {currentTab === 'finance' && (
          <FinanceScreen
            settlements={settlements}
            onRefresh={loadData}
            backendError={errors.settlements}
            mode={mode}
            onSwitchToDemo={switchToDemo}
          />
        )}
        {currentTab === 'audit' && (
          <AuditLogsScreen
            logs={auditLogs}
            onRefresh={loadData}
            backendError={errors.auditLogs}
            mode={mode}
            onSwitchToDemo={switchToDemo}
          />
        )}
      </main>
    </div>
  );
};
