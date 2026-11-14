import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { AppTabBar } from './components/layout/AppTabBar';
import { DraggableQRFab } from './components/layout/DraggableQRFab';
import { NotificationModal } from './components/notifications/NotificationModal';
import { ToastBar } from './components/ui';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useStoreProfile } from './hooks/useStoreProfile';
import { useToast } from './hooks/useToast';
import { STORE_ID } from './mocks';
import { LoginScreen } from './pages/LoginScreen';
import { getCachedMerchantUser } from './hooks/useAuth';
import type { NotificationRow } from './types/database';
import type { LoginCredentials, NotificationItem, TabRoute } from './types';

const BagManagementScreen = lazy(() =>
  import('./pages/BagManagementScreen').then((m) => ({ default: m.BagManagementScreen }))
);
const OrderManagementScreen = lazy(() =>
  import('./pages/OrderManagementScreen').then((m) => ({ default: m.OrderManagementScreen }))
);
const AnalyticsScreen = lazy(() =>
  import('./pages/AnalyticsScreen').then((m) => ({ default: m.AnalyticsScreen }))
);
const SettingsScreen = lazy(() =>
  import('./pages/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);

// FirstTimeSetupScreen chỉ dùng 1 lần cho đối tác mới nên giữ lazy
const FirstTimeSetupScreen = lazy(() =>
  import('./pages/FirstTimeSetupScreen').then((m) => ({ default: m.FirstTimeSetupScreen }))
);

function ScreenLoadingSkeleton() {
  return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 480, margin: '0 auto' }}>
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

  // Khởi tạo ngay lập tức từ URL params hoặc dữ liệu cached (0ms), fallback 'login' nếu chưa đăng nhập
  const [requestedRoute, setRoute] = useState<'login' | 'setup' | TabRoute>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TabRoute | null;
      if (tabParam && ['bags', 'orders', 'analytics', 'settings'].includes(tabParam)) {
        return tabParam;
      }
    }
    const cached = getCachedMerchantUser();
    if (cached) {
      return cached.isFirstLogin ? 'setup' : 'bags';
    }
    return 'login';
  });

  const route = !auth.user ? 'login' : auth.user.isFirstLogin ? 'setup' :
    requestedRoute === 'login' || requestedRoute === 'setup' ? 'bags' : requestedRoute;

  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const [isGlobalQRScannerOpen, setIsGlobalQRScannerOpen] = useState(false);
  const storeId = auth.user?.storeId || STORE_ID;
  const store = useStoreProfile(storeId);
  const { toastMessage, showToast } = useToast();

  const handleNewNotification = useCallback(
    (item: NotificationRow) => {
      showToast(`🔔 ${item?.title ?? 'Đơn hàng mới'}: ${item?.body ?? 'Có đơn hàng mới vừa được đặt!'}`);
    },
    [showToast]
  );

  const notifications = useNotifications(auth.user?.id ?? '', handleNewNotification);

  const routeRef = useRef<'login' | 'setup' | TabRoute>(route);
  useEffect(() => { routeRef.current = route; }, [route]);

  const notificationsRef = useRef(notifications);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  const navigateTo = useCallback((nextRoute: 'login' | 'setup' | TabRoute, pushHistory = true) => {
    if (routeRef.current === nextRoute) return;

    if (pushHistory && nextRoute !== 'login' && nextRoute !== 'setup') {
      const url = nextRoute === 'bags' ? window.location.pathname : `${window.location.pathname}?tab=${nextRoute}`;
      window.history.pushState({ route: nextRoute }, '', url);
    }
    setRoute(nextRoute);
  }, []);

  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(() => ({
    [route]: true,
  }));

  const [visitedInputs, setVisitedInputs] = useState<readonly unknown[] | null>(null);
  // Reset the draft/cache when its inputs change, before committing stale UI.
  if (visitedInputs === null || [route].some((value, index) => !Object.is(value, visitedInputs[index]))) {
    setVisitedInputs([route]);

    if (['bags', 'orders', 'analytics', 'settings'].includes(route)) {
      setVisitedTabs((prev) => (prev[route] ? prev : { ...prev, [route]: true }));
    }

  }

  // Đồng bộ lịch sử điều hướng với trình duyệt cho Merchant PWA (chỉ chạy 1 lần khi mount)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as TabRoute | null;
    const initialRoute = tabParam && ['bags', 'orders', 'analytics', 'settings'].includes(tabParam)
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

  // Hỗ trợ tự động kích hoạt cài đặt PWA khi mở từ Landing Page với ?install=true
  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as Event & { prompt?: () => Promise<void> };
      if (new URLSearchParams(window.location.search).has('install')) {
        promptEvent.prompt?.().catch(() => {});
      }
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    if (new URLSearchParams(window.location.search).has('install')) {
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        window.setTimeout(() => {
          showToast('Nhấn nút Chia sẻ ⎋ và chọn "Thêm vào MH chính" ➕ để cài đặt GoSavingFood Cửa Hàng');
        }, 1000);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, [showToast]);

  const handleNavigateToOrder = useCallback(
    (item: NotificationItem) => {
      notifications.setIsOpen(false);
      navigateTo('orders');
      const orderTarget = item.orderId || item.orderCode || null;
      if (orderTarget) {
        setTargetOrderId(orderTarget);
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

  const handleCompleteSetup = async (storeData?: { name?: string }) => {
    await auth.completeSetup(storeData);
    showToast('Chào mừng đối tác đến với GoSavingFood!');
    if (typeof window !== 'undefined') {
      window.history.replaceState({ route: 'bags' }, '', window.location.pathname);
    }
    setRoute('bags');
  };

  const handleLogout = async () => {
    await auth.logout();
    window.history.replaceState({ route: 'login' }, '', window.location.pathname);
    setRoute('login');
  };

  if (auth.initializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <ScreenLoadingSkeleton />
      </div>
    );
  }

  // Chặn hoàn toàn truy cập dữ liệu cửa hàng/dashboard nếu chưa có phiên đăng nhập
  if (!auth.user || route === 'login') {
    return (
      <LoginScreen
        loading={auth.loading}
        error={auth.error}
        onLogin={handleLogin}
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
        title="Merchant"
        storeName={store.profile?.name ?? 'GoSavingFood'}
        isOpen={store.profile?.isOpen ?? true}
        avatar={store.profile?.avatar}
        unreadCount={notifications.unreadCount}
        onToggleStatus={() => void store.toggleStatus()}
        onNotificationPress={() => notifications.setIsOpen(true)}
        onProfilePress={() => navigateTo('settings')}
        activeRoute={route}
        onNavigate={navigateTo}
        orderBadge={notifications.unreadCount}
        onOpenQR={() => {
          navigateTo('orders');
          setIsGlobalQRScannerOpen(true);
        }}
      />
      <main className={`merchant-main merchant-main--${route}`}>
        <Suspense fallback={<ScreenLoadingSkeleton />}>
        {visitedTabs.bags && (
          <div style={{ display: route === 'bags' ? 'contents' : 'none' }}>
            <BagManagementScreen storeId={storeId} />
          </div>
        )}
        {visitedTabs.orders && (
          <div style={{ display: route === 'orders' ? 'contents' : 'none' }}>
            <OrderManagementScreen
              storeId={storeId}
              targetOrderId={targetOrderId}
              onClearTargetOrder={() => setTargetOrderId(null)}
              isGlobalQROpen={isGlobalQRScannerOpen}
              onCloseGlobalQR={() => setIsGlobalQRScannerOpen(false)}
            />
          </div>
        )}
        {visitedTabs.analytics && (
          <div style={{ display: route === 'analytics' ? 'contents' : 'none' }}>
            <AnalyticsScreen storeId={storeId} />
          </div>
        )}
        {visitedTabs.settings && (
          <div style={{ display: route === 'settings' ? 'contents' : 'none' }}>
            <SettingsScreen
              storeId={storeId}
              storeProfileState={store}
              authLoading={auth.loading}
              onChangePassword={auth.changePassword}
              onLogout={handleLogout}
              onDeleteAccount={async () => {
                const res = await auth.deleteAccount();
                if (res.success) {
                  showToast('Tài khoản đối tác đã được xóa vĩnh viễn khỏi hệ thống.');
                  setRoute('login');
                } else {
                  showToast(res.message || 'Không thể xóa tài khoản. Vui lòng thử lại.');
                }
              }}
            />
          </div>
        )}
      </Suspense>
      </main>
      <DraggableQRFab
        onClick={() => {
          navigateTo('orders');
          setIsGlobalQRScannerOpen(true);
        }}
      />
      <AppTabBar active={route} orderBadge={notifications.unreadCount} onNavigate={navigateTo} />
      <NotificationModal
        open={notifications.isOpen}
        items={notifications.notifications}
        filter={notifications.filter}
        onFilter={notifications.setFilter}
        onClose={() => notifications.setIsOpen(false)}
        onRead={(id) => void notifications.markAsRead(id)}
        onReadAll={() => void notifications.markAllAsRead()}
        onNavigateToOrder={handleNavigateToOrder}
      />
    </div>
  );
}
