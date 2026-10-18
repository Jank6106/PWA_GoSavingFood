import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
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

  // Tối ưu như Customer PWA: Khởi tạo ngay lập tức từ URL params hoặc dữ liệu cached (0ms)
  const [route, setRoute] = useState<'login' | 'setup' | TabRoute>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TabRoute | null;
      if (tabParam && ['bags', 'orders', 'inventory', 'analytics', 'settings'].includes(tabParam)) {
        return tabParam;
      }
    }
    const cached = getCachedMerchantUser();
    if (cached) {
      return cached.isFirstLogin ? 'setup' : 'bags';
    }
    return 'bags';
  });

  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const [isGlobalQRScannerOpen, setIsGlobalQRScannerOpen] = useState(false);
  const storeId = auth.user?.storeId ?? STORE_ID;
  const store = useStoreProfile(storeId);
  const { toastMessage, showToast } = useToast();

  const handleNewNotification = useCallback(
    (item: any) => {
      showToast(`🔔 ${item?.title ?? 'Đơn hàng mới'}: ${item?.body ?? 'Có đơn hàng mới vừa được đặt!'}`);
    },
    [showToast]
  );

  const notifications = useNotifications(auth.user?.id ?? '', handleNewNotification);

  const routeRef = useRef<'login' | 'setup' | TabRoute>(route);
  routeRef.current = route;

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const navigateTo = useCallback((nextRoute: 'login' | 'setup' | TabRoute, pushHistory = true) => {
    if (routeRef.current === nextRoute) return;

    if (pushHistory && nextRoute !== 'login' && nextRoute !== 'setup') {
      const url = nextRoute === 'bags' ? window.location.pathname : `${window.location.pathname}?tab=${nextRoute}`;
      window.history.pushState({ route: nextRoute }, '', url);
    }
    setRoute(nextRoute);
  }, []);

  // Đồng bộ lịch sử điều hướng với trình duyệt cho Merchant PWA (chỉ chạy 1 lần khi mount)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as TabRoute | null;
    const initialRoute = tabParam && ['bags', 'orders', 'inventory', 'analytics', 'settings'].includes(tabParam)
      ? tabParam
      : 'bags';
    const initialUrl = initialRoute === 'bags' ? window.location.pathname : `${window.location.pathname}?tab=${initialRoute}`;
    window.history.replaceState({ route: initialRoute }, '', initialUrl);

    const handlePopState = (event: PopStateEvent) => {
      // Đóng modal overlay khi bấm phím Back
      setIsGlobalQRScannerOpen(false);
      notificationsRef.current?.setIsOpen(false);
      setTargetOrderId(null);

      const state = event.state as { route?: 'login' | 'setup' | TabRoute } | null;
      if (state && state.route) {
        setRoute(state.route);
      } else {
        const p = new URLSearchParams(window.location.search);
        const t = (p.get('tab') as TabRoute) || 'bags';
        setRoute(t);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (auth.user && route === 'login') {
      const nextRoute = auth.user.isFirstLogin ? 'setup' : 'bags';
      window.history.replaceState({ route: nextRoute }, '', window.location.pathname);
      setRoute(nextRoute);
    }
  }, [auth.user, route]);

  const handleSelectNotification = useCallback(
    (item: NotificationItem) => {
      notifications.setIsOpen(false);
      navigateTo('orders');
      if (item.orderId) {
        setTargetOrderId(item.orderId);
      }
    },
    [notifications, navigateTo]
  );

  const handleLogin = async (credentials: LoginCredentials) => {
    const user = await auth.login(credentials);
    if (user) {
      const nextRoute = user.isFirstLogin ? 'setup' : 'bags';
      window.history.replaceState({ route: nextRoute }, '', window.location.pathname);
      setRoute(nextRoute);
    }
    return user;
  };

  const handleRegister = async (input: MerchantRegisterInput) => {
    const user = await auth.register(input);
    if (user) {
      const nextRoute = user.isFirstLogin ? 'setup' : 'bags';
      window.history.replaceState({ route: nextRoute }, '', window.location.pathname);
      setRoute(nextRoute);
    }
    return user;
  };

  const handleCompleteSetup = async () => {
    await auth.completeSetup();
    window.history.replaceState({ route: 'bags' }, '', window.location.pathname);
    setRoute('bags');
  };

  const handleLogout = async () => {
    await auth.logout();
    window.history.replaceState({ route: 'login' }, '', window.location.pathname);
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
        onExploreDemo={() => {
          auth.exploreDemo();
          window.history.replaceState({ route: 'bags' }, '', window.location.pathname);
          setRoute('bags');
        }}
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
        avatar={store.profile?.avatar}
        unreadCount={notifications.unreadCount}
        onToggleStatus={() => void store.toggleStatus()}
        onNotificationPress={() => notifications.setIsOpen(true)}
        onProfilePress={() => navigateTo('settings')}
        onScanQRPress={() => {
          navigateTo('orders');
          setIsGlobalQRScannerOpen(true);
        }}
      />
      {store.profile?.status === 'suspended' && (
        <div
          style={{
            background: '#FEF2F2',
            borderBottom: '1px solid #FECACA',
            padding: '10px 16px',
            color: '#991B1B',
            fontSize: '12.5px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️</span>
          <span>Quán đang bị tạm khóa bởi Quản trị viên. Túi cứu trợ tạm thời ẩn khỏi ứng dụng khách hàng.</span>
        </div>
      )}
      <main className={`merchant-main merchant-main--${route}`}>
        <div style={{ display: route === 'bags' ? 'contents' : 'none' }}>
          <BagManagementScreen storeId={storeId} />
        </div>
        <div style={{ display: route === 'orders' ? 'contents' : 'none' }}>
          <OrderManagementScreen
            storeId={storeId}
            targetOrderId={targetOrderId}
            onClearTargetOrder={() => setTargetOrderId(null)}
            isGlobalQROpen={isGlobalQRScannerOpen}
            onCloseGlobalQR={() => setIsGlobalQRScannerOpen(false)}
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
            onDeleteAccount={async () => {
              const res = await auth.deleteAccount();
              if (res.success) {
                showToast('Tài khoản đối tác đã được xóa vĩnh viễn khỏi hệ thống.');
                window.history.replaceState({ route: 'login' }, '', window.location.pathname);
                setRoute('login');
              } else {
                showToast(res.message || 'Không thể xóa tài khoản. Vui lòng thử lại.');
              }
            }}
          />
        </div>
      </main>
      <AppTabBar active={route} orderBadge={notifications.unreadCount} onNavigate={navigateTo} />
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
