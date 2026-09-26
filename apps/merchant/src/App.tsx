import { useState } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { AppTabBar } from './components/layout/AppTabBar';
import { NotificationModal } from './components/notifications/NotificationModal';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useStoreProfile } from './hooks/useStoreProfile';
import { STORE_ID } from './mocks';
import { AnalyticsScreen } from './pages/AnalyticsScreen';
import { BagManagementScreen } from './pages/BagManagementScreen';
import { FirstTimeSetupScreen } from './pages/FirstTimeSetupScreen';
import { InventoryManagementScreen } from './pages/InventoryManagementScreen';
import { LoginScreen } from './pages/LoginScreen';
import { OrderManagementScreen } from './pages/OrderManagementScreen';
import { SettingsScreen } from './pages/SettingsScreen';
import type { LoginCredentials, TabRoute } from './types';

const subtitles: Record<TabRoute, string> = {
  bags: 'Quản lý túi hàng cứu thực phẩm',
  orders: 'Theo dõi và xử lý đơn hàng',
  inventory: 'Quản lý kệ hàng & nguyên liệu',
  analytics: 'Hiệu suất kinh doanh cửa hàng',
  settings: 'Thông tin & cài đặt cửa hàng',
};

export default function App() {
  const auth = useAuth();
  const [route, setRoute] = useState<'login' | 'setup' | TabRoute>('login');
  const storeId = auth.user?.storeId ?? STORE_ID;
  const store = useStoreProfile(storeId);
  const notifications = useNotifications();

  const handleLogin = async (credentials: LoginCredentials) => {
    const user = await auth.login(credentials);
    if (user) setRoute(user.isFirstLogin ? 'setup' : 'bags');
    return user;
  };
  const handleCompleteSetup = async () => { await auth.completeSetup(); setRoute('bags'); };
  const handleLogout = async () => { await auth.logout(); setRoute('login'); };

  if (route === 'login') return <LoginScreen loading={auth.loading} error={auth.error} onLogin={handleLogin} onClearError={auth.clearError} />;
  if (route === 'setup') return <FirstTimeSetupScreen storeId={storeId} loading={auth.loading} error={auth.error} onChangePassword={auth.changePassword} onComplete={handleCompleteSetup} />;

  return <div className="merchant-app-shell"><AppHeader storeName={store.profile?.name ?? 'GoGreen Bakery'} subtitle={subtitles[route]} isOpen={store.profile?.isOpen ?? true} unreadCount={notifications.unreadCount} onToggleStatus={() => void store.toggleStatus()} onNotificationPress={() => notifications.setIsOpen(true)} onProfilePress={() => setRoute('settings')} /><main className={`merchant-main merchant-main--${route}`}>{route === 'bags' && <BagManagementScreen storeId={storeId} />}{route === 'orders' && <OrderManagementScreen storeId={storeId} />}{route === 'inventory' && <InventoryManagementScreen storeId={storeId} />}{route === 'analytics' && <AnalyticsScreen storeId={storeId} />}{route === 'settings' && <SettingsScreen storeId={storeId} authLoading={auth.loading} onChangePassword={auth.changePassword} onLogout={handleLogout} />}</main><AppTabBar active={route} orderBadge={notifications.unreadCount} onNavigate={setRoute} /><NotificationModal open={notifications.isOpen} items={notifications.notifications} filter={notifications.filter} onFilter={notifications.setFilter} onClose={() => notifications.setIsOpen(false)} onRead={(id) => void notifications.markAsRead(id)} onReadAll={() => void notifications.markAllAsRead()} /></div>;
}
