import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { AppTabBar } from './components/layout/AppTabBar';
import { NotificationModal } from './components/notifications/NotificationModal';
import { ToastBar } from './components/ui';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useStoreProfile } from './hooks/useStoreProfile';
import { useToast } from './hooks/useToast';
import { STORE_ID } from './mocks';
import { LoginScreen } from './pages/LoginScreen';
import { getCachedMerchantUser } from './services/auth.service';
import type { LoginCredentials, MerchantRegisterInput, NotificationItem, TabRoute } from './types';

import { BagManagementScreen } from './pages/BagManagementScreen';
import { OrderManagementScreen } from './pages/OrderManagementScreen';
import { InventoryManagementScreen } from './pages/InventoryManagementScreen';
import { AnalyticsScreen } from './pages/AnalyticsScreen';
import { SettingsScreen } from './pages/SettingsScreen';

// FirstTimeSetupScreen chỉ dùng 1 lần cho đối tác mới nên giữ lazy
const FirstTimeSetupScreen = lazy(() =>
  import('./pages/FirstTimeSetupScreen').then((m) => ({ default: m.FirstTimeSetupScreen }))
);

function ScreenLoadingSkeleton() {
  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          height: 38,
          width: '50%',
          borderRadius: 8,
          background: 'rgba(0, 86, 57, 0.08)',
          animation: 'pulse 1.5s infinite ease-in-out',
        }}
      />
      <div
        style={{
          height: 120,
          borderRadius: 16,
          background: 'rgba(0, 86, 57, 0.05)',
          animation: 'pulse 1.5s infinite ease-in-out',
        }}
      />
      <div
        style={{
          height: 120,
          borderRadius: 16,
          background: 'rgba(0, 86, 57, 0.05)',
          animation: 'pulse 1.5s infinite ease-in-out',
        }}
      />
    </div>
  );
}

export default function App() {
  const auth = useAuth();

  // Giải pháp 2: Render tức thì 0ms dựa vào cached session, không nhấp nháy màn hình Login
  const [route, setRoute] = useState<'login' | 'setup' | TabRoute>(() => {
    const cached = getCachedMerchantUser();
    if (cached) {
      return cached.isFirstLogin ? 'setup' : 'bags';
    }
    return 'login';
  });

  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const storeId = auth.user?.storeId ?? STORE_ID;
  const store = useStoreProfile(storeId);
  const { toastMessage, showToast } = useToast();

  useEffect(() => {
    if (auth.user && route === 'login') {
      setRoute(auth.user.isFirstLogin ? 'setup' : 'bags');
    }
  }, [auth.user, route]);

  const handleNewNotification = useCallback(
    (item: any) => {
      showToast(`🔔 ${item?.title ?? 'Đơn hàng mới'}: ${item?.body ?? 'Có đơn hàng mới vừa được đặt!'}`);
    },
    [showToast]
  );

  const notifications = useNotifications(auth.user?.id ?? '', handleNewNotification);

  const handleSelectNotification = useCallback(
    (item: NotificationItem) => {
      notifications.setIsOpen(false);
      setRoute('orders');
      if (item.orderId) {
        setTargetOrderId(item.orderId);
      }
    },
    [notifications]
  );

  const handleLogin = async (credentials: LoginCredentials) => {
    const user = await auth.login(credentials);
    if (user) setRoute(user.isFirstLogin ? 'setup' : 'bags');
    return user;
  };

  const handleRegister = async (input: MerchantRegisterInput) => {
    const user = await auth.register(input);
    if (user) setRoute(user.isFirstLogin ? 'setup' : 'bags');
    return user;
  };

  const handleCompleteSetup = async () => {
    await auth.completeSetup();
    setRoute('bags');
  };

  const handleLogout = async () => {
    await auth.logout();
    setRoute('login');
  };

  if (route === 'login') {
    return (
      <LoginScreen
        loading={auth.loading}
        error={auth.error}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onClearError={auth.clearError}
      />
    );
  }

  if (route === 'setup') {
    return (
      <Suspense fallback={<ScreenLoadingSkeleton />}>
        <FirstTimeSetupScreen
          storeId={storeId}
          loading={auth.loading}
          error={auth.error}
          onChangePassword={auth.changePassword}
          onComplete={handleCompleteSetup}
        />
      </Suspense>
    );
  }

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
        <div style={{ display: route === 'bags' ? 'contents' : 'none' }}>
          <BagManagementScreen storeId={storeId} />
        </div>
        <div style={{ display: route === 'orders' ? 'contents' : 'none' }}>
          <OrderManagementScreen
            storeId={storeId}
            targetOrderId={targetOrderId}
            onClearTargetOrder={() => setTargetOrderId(null)}
          />
        </div>
        <div style={{ display: route === 'inventory' ? 'contents' : 'none' }}>
          <InventoryManagementScreen storeId={storeId} />
        </div>
        <div style={{ display: route === 'analytics' ? 'contents' : 'none' }}>
          <AnalyticsScreen storeId={storeId} />
        </div>
        <div style={{ display: route === 'settings' ? 'contents' : 'none' }}>
          <SettingsScreen
            storeId={storeId}
            authLoading={auth.loading}
            onChangePassword={auth.changePassword}
            onLogout={handleLogout}
          />
        </div>
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
