import { useCallback, useState } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { AppTabBar } from './components/layout/AppTabBar';
import { NotificationModal } from './components/notifications/NotificationModal';
import { ToastBar } from './components/ui';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useStoreProfile } from './hooks/useStoreProfile';
import { useToast } from './hooks/useToast';
import { STORE_ID } from './mocks';
import { AnalyticsScreen } from './pages/AnalyticsScreen';
import { BagManagementScreen } from './pages/BagManagementScreen';
import { FirstTimeSetupScreen } from './pages/FirstTimeSetupScreen';
import { InventoryManagementScreen } from './pages/InventoryManagementScreen';
import { LoginScreen } from './pages/LoginScreen';
import { OrderManagementScreen } from './pages/OrderManagementScreen';
import { SettingsScreen } from './pages/SettingsScreen';
import type { LoginCredentials, NotificationItem, TabRoute } from './types';

export default function App() {
  const auth = useAuth();
  const [route, setRoute] = useState<'login' | 'setup' | TabRoute>('login');
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const storeId = auth.user?.storeId ?? STORE_ID;
  const store = useStoreProfile(storeId);
  const { toastMessage, showToast } = useToast();

  const handleNewNotification = useCallback((item: any) => {
    showToast(`🔔 ${item?.title ?? 'Đơn hàng mới'}: ${item?.body ?? 'Có đơn hàng mới vừa được đặt!'}`);
  }, [showToast]);

  const notifications = useNotifications(auth.user?.id ?? '', handleNewNotification);

  const handleSelectNotification = useCallback((item: NotificationItem) => {
    notifications.setIsOpen(false);
    setRoute('orders');
    if (item.orderId) {
      setTargetOrderId(item.orderId);
    }
  }, [notifications]);

  const handleLogin = async (credentials: LoginCredentials) => {
    const user = await auth.login(credentials);
    if (user) setRoute(user.isFirstLogin ? 'setup' : 'bags');
    return user;
  };
  const handleCompleteSetup = async () => { await auth.completeSetup(); setRoute('bags'); };
  const handleLogout = async () => { await auth.logout(); setRoute('login'); };

  if (route === 'login') return <LoginScreen loading={auth.loading} error={auth.error} onLogin={handleLogin} onClearError={auth.clearError} />;
  if (route === 'setup') return <FirstTimeSetupScreen storeId={storeId} loading={auth.loading} error={auth.error} onChangePassword={auth.changePassword} onComplete={handleCompleteSetup} />;

  return (
    <div className="merchant-app-shell">
      <ToastBar message={toastMessage} />
      <AppHeader
        storeName={store.profile?.name ?? 'Quán Chay Quýt'}
        isOpen={store.profile?.isOpen ?? true}
        unreadCount={notifications.unreadCount}
        onToggleStatus={() => void store.toggleStatus()}
        onNotificationPress={() => notifications.setIsOpen(true)}
        onProfilePress={() => setRoute('settings')}
      />
      <main className={`merchant-main merchant-main--${route}`}>
        {route === 'bags' && <BagManagementScreen storeId={storeId} />}
        {route === 'orders' && (
          <OrderManagementScreen
            storeId={storeId}
            targetOrderId={targetOrderId}
            onClearTargetOrder={() => setTargetOrderId(null)}
          />
        )}
        {route === 'inventory' && <InventoryManagementScreen storeId={storeId} />}
        {route === 'analytics' && <AnalyticsScreen storeId={storeId} />}
        {route === 'settings' && (
          <SettingsScreen
            storeId={storeId}
            authLoading={auth.loading}
            onChangePassword={auth.changePassword}
            onLogout={handleLogout}
          />
        )}
      </main>
      <AppTabBar active={route} orderBadge={notifications.unreadCount} onNavigate={setRoute} />
      <NotificationModal
        open={notifications.isOpen}
        items={notifications.notifications}
        filter={notifications.filter}
        onFilter={notifications.setFilter}
        onClose={() => notifications.setIsOpen(false)}
        onRead={(id) => void notifications.markAsRead(id)}
        onReadAll={() => void notifications.markAllAsRead()}
        onSelect={handleSelectNotification}
      />
    </div>
  );
}
