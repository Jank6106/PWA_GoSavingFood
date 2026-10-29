import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AppLayout } from './app/layouts/AppLayout';
import { AuthProvider } from './contexts/AuthContext';
import { AuthModal } from './features/auth/components/AuthModal';
import { CartPage } from './features/cart/pages/CartPage';
import { BagDetailPage } from './features/catalog/pages/BagDetailPage';
import { HomePage } from './features/home/pages/HomePage';
import { OrdersPage } from './features/orders/pages/OrdersPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { useCart } from './hooks/useCart';
import { useAuth } from './hooks/useAuth';
import { useCustomerCatalog } from './hooks/useCustomerCatalog';
import { customerService, optimizeImageUrl } from './services/customer.service';

// Lazy-load các trang nặng hoặc chứa mapbox-gl để giảm 70% dung lượng bundle ban đầu
const SearchPage = lazy(() => import('./features/search/pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const SelectLocationPage = lazy(() => import('./features/location/pages/SelectLocationPage').then((m) => ({ default: m.SelectLocationPage })));
const CheckoutPage = lazy(() => import('./features/checkout/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const PaymentPage = lazy(() => import('./features/checkout/pages/PaymentPage').then((m) => ({ default: m.PaymentPage })));
const OrderSuccessPage = lazy(() => import('./features/checkout/pages/OrderSuccessPage').then((m) => ({ default: m.OrderSuccessPage })));
const OrderDetailPage = lazy(() => import('./features/orders/pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const OrderFeedbackPage = lazy(() => import('./features/orders/pages/OrderFeedbackPage').then((m) => ({ default: m.OrderFeedbackPage })));
const NotificationsPage = lazy(() => import('./features/notifications/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const BagsPage = lazy(() => import('./features/catalog/pages/BagsPage').then((m) => ({ default: m.BagsPage })));
const MerchantDetailPage = lazy(() => import('./features/catalog/pages/MerchantDetailPage').then((m) => ({ default: m.MerchantDetailPage })));
const MerchantReviewsView = lazy(() => import('./features/catalog/components/MerchantReviewsView').then((m) => ({ default: m.MerchantReviewsView })));
const BrandDetailPage = lazy(() => import('./features/catalog/pages/BrandDetailPage').then((m) => ({ default: m.BrandDetailPage })));

function ScreenLoadingFallback() {
  return (
    <div className="customer-screen customer-screen--center" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <div className="customer-skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 1rem' }} />
      <p style={{ color: '#718078', fontSize: '14px', margin: 0 }}>Đang mở trang...</p>
    </div>
  );
}
import { mapboxService } from './services/mapbox.service';
import { supabase } from './services/supabase';

import type {
  AppRoute,
  CartItem,
  CheckoutDraft,
  CustomerTab,
  Merchant,
  NotificationItem,
  Order,
  SurpriseBag,
  Voucher,
} from './shared/types/customer.types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_LOCATION_KEY = 'gsf_customer_location';
const STORAGE_COORDS_KEY = 'gsf_customer_coords';
const STORAGE_HISTORY_KEY = 'gsf_customer_history';
const STORAGE_PENDING_AUTH_KEY = 'gsf_pending_auth_target';

interface PendingAuthTarget {
  route?: AppRoute;
  action?: 'add_to_cart' | 'buy_now';
  bagId?: string;
  quantity?: number;
  timestamp: number;
}

function loadInitialHistory(): AppRoute[] {
  try {
    sessionStorage.removeItem(STORAGE_HISTORY_KEY);
  } catch {}

  if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback')) {
    const base = import.meta.env.BASE_URL || '/explore/';
    const cleanPath = base.endsWith('/') ? base : `${base}/`;
    window.history.replaceState({}, '', `${cleanPath}${window.location.search}${window.location.hash}`);
  }

  // Khôi phục từ history.state khi reload / F5
  const isOAuthCallback =
    typeof window !== 'undefined' &&
    (window.location.search.includes('code=') ||
      window.location.hash.includes('access_token') ||
      window.location.pathname.includes('/auth/callback'));

  if (!isOAuthCallback && typeof window !== 'undefined') {
    const state = window.history.state as { route?: AppRoute } | null;
    if (state?.route) {
      if (state.route.name === 'tabs' && state.route.tab === 'home') {
        return [state.route];
      }
      return [{ name: 'tabs', tab: 'home' }, state.route];
    }
  }

  const fromUrl = parseRouteFromUrl();
  if (fromUrl) {
    if (fromUrl.name === 'tabs' && fromUrl.tab === 'home') {
      return [fromUrl];
    }
    return [{ name: 'tabs', tab: 'home' }, fromUrl];
  }
  return [{ name: 'tabs', tab: 'home' }];
}

function getRouteUrl(_route?: AppRoute): string {
  // In-Memory routing: Giấu toàn bộ query/view/id trên thanh URL, luôn trả về pathname gốc sạch sẽ
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return '/explore/';
}

function parseRouteFromUrl(): AppRoute | null {
  try {
    const search = window.location.search;
    if (!search) return null;
    const params = new URLSearchParams(search);
    const view = params.get('view');
    const tab = params.get('tab') as CustomerTab | null;
    const id = params.get('id');
    const orderId = params.get('orderId');

    if (view === 'search') return { name: 'search' };
    if (view === 'bags') return { name: 'bags' };
    if (view === 'bag' && id) return { name: 'bag', id };
    if (view === 'merchant' && id) return { name: 'merchant', id };
    if (view === 'brand' && id) return { name: 'brand', id };
    if (view === 'checkout') return { name: 'checkout' };
    if (view === 'payment') {
      const qOrderCode = params.get('orderCode') || undefined;
      return {
        name: 'payment',
        orderId: orderId || undefined,
        orderCode: qOrderCode,
        draft: undefined,
      };
    }
    if (view === 'success' && orderId) return { name: 'success', orderId };
    if (view === 'order' && id) return { name: 'order', id };
    if (view === 'review' && id) return { name: 'review', id };
    if (view === 'report' && id) return { name: 'report', id };
    if (view === 'notifications') return { name: 'notifications' };
    if (view === 'location') return { name: 'location' };
    if (tab && ['home', 'cart', 'orders', 'profile'].includes(tab)) {
      return { name: 'tabs', tab };
    }
  } catch {}
  return null;
}


const DEFAULT_COORDS = { lat: 21.0285, lng: 105.8542 };
const DEFAULT_LOCATION = 'Hà Nội';

function CustomerApp() {
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COORDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.lat === 'number' && parsed.lat < 15) return DEFAULT_COORDS;
        return parsed;
      }
      return DEFAULT_COORDS;
    } catch {
      return DEFAULT_COORDS;
    }
  });

  const [location, setLocation] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOCATION_KEY);
      if (saved && (saved.includes('TP.HCM') || saved.includes('Hồ Chí Minh') || saved.includes('Quận 1'))) return DEFAULT_LOCATION;
      return saved || DEFAULT_LOCATION;
    } catch {
      return DEFAULT_LOCATION;
    }
  });

  const updateLocation = (nextLocation: string, nextCoords?: { lat: number; lng: number }) => {
    setLocation(nextLocation);
    try {
      localStorage.setItem(STORAGE_LOCATION_KEY, nextLocation);
    } catch {}
    if (nextCoords) {
      setCoords(nextCoords);
      try {
        localStorage.setItem(STORAGE_COORDS_KEY, JSON.stringify(nextCoords));
      } catch {}
    }
  };

  const auth = useAuth();
  const catalog = useCustomerCatalog(coords);
  const cart = useCart(auth.user?.id);
  const [history, setHistory] = useState<AppRoute[]>(loadInitialHistory);
  const [pendingAuthTarget, setPendingAuthTarget] = useState<PendingAuthTarget | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PENDING_AUTH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PendingAuthTarget;
      if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
        localStorage.removeItem(STORAGE_PENDING_AUTH_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const savePendingAuth = (target: Omit<PendingAuthTarget, 'timestamp'> | null) => {
    if (target) {
      const full: PendingAuthTarget = { ...target, timestamp: Date.now() };
      setPendingAuthTarget(full);
      try {
        localStorage.setItem(STORAGE_PENDING_AUTH_KEY, JSON.stringify(full));
      } catch {}
    } else {
      setPendingAuthTarget(null);
      try {
        localStorage.removeItem(STORAGE_PENDING_AUTH_KEY);
      } catch {}
    }
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersBadgeCount, setOrdersBadgeCount] = useState<number>(0);
  const recentlyCreatedOrderIds = useRef<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStandalone, setIsStandalone] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    actionText?: string;
    onAction?: () => void;
  } | null>(null);

  const showToast = useCallback(
    (config: string | { message: string; actionText?: string; onAction?: () => void }) => {
      if (typeof config === 'string') {
        setToast({ message: config });
      } else {
        setToast(config);
      }
    },
    []
  );

  // Tối ưu định vị không chặn (Non-blocking): Timeout 2.5s, dùng vị trí sẵn có ngay 0ms
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const rev = await mapboxService.reverseGeocode(lng, lat);
          const addr = rev.address || rev.name;
          updateLocation(addr, { lat, lng });
        } catch {
          updateLocation(`Vị trí hiện tại (${lat.toFixed(4)}, ${lng.toFixed(4)})`, { lat, lng });
        }
      },
      (err) => {
        console.warn('[App] Geolocation non-blocking fallback:', err.message);
      },
      { enableHighAccuracy: false, timeout: 2500, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const duration = toast.actionText ? 4000 : 2500;
    const timer = window.setTimeout(() => setToast(null), duration);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Trì hoãn nạp Voucher (Deferred Loading) sau khi Home đã render mượt mà
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      customerService.getVouchers().then((nextVouchers) => {
        if (!active) return;
        setVouchers(nextVouchers || []);
      });
    }, 1200);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      if (new URLSearchParams(window.location.search).has('install')) {
        promptEvent.prompt().catch(() => {});
      }
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    if (new URLSearchParams(window.location.search).has('install')) {
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        window.setTimeout(() => {
          showToast('Nhấn nút Chia sẻ ⎋ và chọn "Thêm vào MH chính" ➕ để cài đặt GoSavingFood');
        }, 1000);
      }
    }

    return () => {
      active = false;
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  // Trì hoãn tải Orders & Notifications để nhường băng thông cho màn hình chính khởi động tức thì
  useEffect(() => {
    if (!auth.user) {
      setOrders([]);
      setNotifications([]);
      setOrdersBadgeCount(0);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      if (!active || !auth.user) return;
      void customerService.getOrders(auth.user.id).then((items) => {
        if (active) setOrders(items || []);
      });
      void customerService.getNotifications().then((items) => {
        if (active) setNotifications(items || []);
      });
    }, 800);

    const channel = customerService.subscribeToCustomerUpdates(
      auth.user.id,
      (orderPayload) => {
        console.log('[Realtime Customer App] onOrderChange received:', orderPayload?.eventType, orderPayload?.new?.status, orderPayload?.new?.id);
        if (orderPayload?.eventType === 'INSERT') {
          const newId = orderPayload.new?.id;
          if (!newId || !recentlyCreatedOrderIds.current.has(newId)) {
            setOrdersBadgeCount((prev) => prev + 1);
          }
        } else if (orderPayload?.eventType === 'UPDATE') {
          setOrdersBadgeCount((prev) => prev + 1);
        }
        if (orderPayload?.new && orderPayload.new.id) {
          const rawStatus = orderPayload.new.status;
          const normalizedStatus = rawStatus === 'picked_up' ? 'completed' : rawStatus;
          setOrders((current) => {
            const exists = current.some(
              (o) => o.id.toLowerCase() === String(orderPayload.new.id).toLowerCase()
            );
            if (exists) {
              return current.map((order) =>
                order.id.toLowerCase() === String(orderPayload.new.id).toLowerCase()
                  ? {
                      ...order,
                      status: normalizedStatus,
                      updatedAt: orderPayload.new.updated_at || order.createdAt,
                      completedAt: orderPayload.new.completed_at || order.completedAt,
                      cancelledAt: orderPayload.new.cancelled_at || order.cancelledAt,
                      cancelReason: orderPayload.new.cancel_reason || order.cancelReason,
                      paymentStatus: orderPayload.new.payment_status || order.paymentStatus,
                      pickupToken: orderPayload.new.pickup_token || order.pickupToken,
                    }
                  : order
              );
            }
            return current;
          });
        }

        // Luôn đồng bộ dữ liệu mới nhất từ server ở background
        if (auth.user?.id) {
          void customerService.getOrders(auth.user.id).then((items) => {
            if (items && items.length > 0) setOrders(items);
          });
        }
      },
      (notificationPayload) => {
        // Cập nhật danh sách thông báo và bật toast alert khi có thông báo mới
        void customerService.getNotifications().then((items) => setNotifications(items));
        if (notificationPayload.eventType === 'INSERT' && notificationPayload.new) {
          const title = notificationPayload.new.title || 'Thông báo mới';
          const body = notificationPayload.new.body || '';
          const targetOrderId = notificationPayload.new.data?.orderId;
          showToast({
            message: body ? `${title}: ${body}` : title,
            actionText: 'Xem đơn',
            onAction: () => {
              if (targetOrderId) {
                push({ name: 'order', id: targetOrderId });
              } else {
                openTab('orders');
              }
            },
          });
        }
      }
    );

    // Xử lý phục hồi khi App Active trở lại từ nền (Banking App switch)
    const handleAppVisibility = () => {
      if (document.visibilityState === 'visible' && auth.user?.id) {
        void customerService.getOrders(auth.user.id).then((items) => {
          if (!active || !items) return;
          setOrders(items);
          setHistory((currentHistory) => {
            const currentRoute = currentHistory[currentHistory.length - 1];
            const targetOrderId =
              currentRoute?.name === 'payment' ? currentRoute.order?.id || currentRoute.orderId : undefined;
            if (currentRoute?.name === 'payment' && targetOrderId) {
              const matchedOrder = items.find(
                (it) => it.id.toLowerCase() === String(targetOrderId).toLowerCase()
              );
              if (
                matchedOrder &&
                (matchedOrder.paymentStatus === 'success' ||
                  matchedOrder.status === 'paid' ||
                  matchedOrder.status === 'preparing' ||
                  matchedOrder.status === 'ready_for_pickup' ||
                  matchedOrder.status === 'completed' ||
                  matchedOrder.status === 'picked_up')
              ) {
                console.log('[App] App resume detected paid order on payment route -> resetToSuccess');
                cart.clear();
                return [{ name: 'success', orderId: matchedOrder.id }];
              }
            }
            return currentHistory;
          });
        });
      }
    };

    document.addEventListener('visibilitychange', handleAppVisibility);
    window.addEventListener('focus', handleAppVisibility);

    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleAppVisibility);
      window.removeEventListener('focus', handleAppVisibility);
      void supabase.removeChannel(channel);
    };
  }, [auth.user?.id]);

  const route = history[history.length - 1] || { name: 'tabs', tab: 'home' };
  const activeTab: CustomerTab = route.name === 'tabs' ? route.tab : 'home';

  const activeNav = useMemo(() => {
    if (route.name === 'tabs') return route.tab;
    if (route.name === 'notifications') return 'notifications';
    if (route.name === 'order' || route.name === 'review' || route.name === 'report') return 'orders';
    if (route.name === 'checkout' || route.name === 'payment' || route.name === 'success') return 'cart';
    if (route.name === 'search' || route.name === 'bags' || route.name === 'bag' || route.name === 'merchant' || route.name === 'merchant_reviews' || route.name === 'brand' || route.name === 'location') return 'home';
    return 'home';
  }, [route]);

  const previousRouteRef = useRef<AppRoute>(route);
  useEffect(() => {
    const prevRoute = previousRouteRef.current;
    previousRouteRef.current = route;

    const isCurrentOrdersTab = route.name === 'tabs' && route.tab === 'orders';
    const wasPrevOrdersTab = prevRoute.name === 'tabs' && prevRoute.tab === 'orders';

    // 1. Khi người dùng vào tab 'orders' để check -> xoá số báo đơn hàng
    // 2. Nếu đang ở tab 'orders' mà có thông báo, khi chuyển sang trang khác -> xoá số báo
    if (isCurrentOrdersTab || wasPrevOrdersTab) {
      setOrdersBadgeCount(0);
    }
  }, [route]);

  const push = (nextRoute: AppRoute) => {
    setHistory((current) => {
      const nextHistory = [...current, nextRoute];
      const url = getRouteUrl(nextRoute);
      window.history.pushState(
        { route: nextRoute, index: nextHistory.length - 1 },
        '',
        url
      );
      return nextHistory;
    });
  };

  const back = () => {
    if (history.length > 1) {
      window.history.back();
    } else {
      openTab('home');
    }
  };

  const openTab = (tab: CustomerTab) => {
    if (tab === 'orders') {
      setOrdersBadgeCount(0);
    }
    setHistory((current) => {
      const active = current[current.length - 1];
      if (active && active.name === 'tabs' && active.tab === tab) {
        return current;
      }
      const nextRoute: AppRoute = { name: 'tabs', tab };
      const nextHistory: AppRoute[] =
        tab === 'home' ? [{ name: 'tabs', tab: 'home' }] : [...current, nextRoute];
      const url = getRouteUrl(nextRoute);
      window.history.pushState(
        { route: nextRoute, index: nextHistory.length - 1 },
        '',
        url
      );
      return nextHistory;
    });
  };

  const home = () => openTab('home');

  const resetToSuccess = (orderId: string) => {
    const successRoute: AppRoute = { name: 'success', orderId };
    const nextHistory: AppRoute[] = [{ name: 'tabs', tab: 'home' }, successRoute];
    window.history.replaceState(
      { route: successRoute, index: 1 },
      '',
      getRouteUrl(successRoute)
    );
    setHistory(nextHistory);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [history.length]);

  // Đồng bộ với History API của trình duyệt (Bắt sự kiện Back / Forward hoặc cử chỉ vuốt)
  useEffect(() => {
    const initialRoute = history[history.length - 1] || { name: 'tabs', tab: 'home' };
    window.history.replaceState(
      { route: initialRoute, index: history.length - 1 },
      '',
      getRouteUrl(initialRoute)
    );

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { route?: AppRoute; index?: number } | null;

      setHistory((current) => {
        if (state && typeof state.index === 'number') {
          if (state.index < current.length - 1) {
            // Người dùng bấm Back: lùi về route tương ứng
            return current.slice(0, state.index + 1);
          }
          if (state.route && state.index >= current.length) {
            // Người dùng bấm Forward
            return [...current, state.route];
          }
        }

        if (current.length > 1) {
          return current.slice(0, -1);
        }

        if (state && state.route) {
          return [state.route];
        }

        const urlRoute = parseRouteFromUrl();
        return [urlRoute || { name: 'tabs', tab: 'home' }];
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  const [directBag, setDirectBag] = useState<SurpriseBag | null>(null);

  const selectedBag =
    route.name === 'bag'
      ? catalog.bags.find((bag) => bag.id === route.id) ??
        directBag ??
        null
      : null;

  useEffect(() => {
    if (route.name === 'bag' && !selectedBag && !directBag) {
      void customerService.getBag(route.id).then((bag) => {
        if (bag) setDirectBag(bag);
      });
    } else if (route.name !== 'bag' && directBag) {
      setDirectBag(null);
    }
  }, [route, selectedBag, directBag]);

  const [directMerchant, setDirectMerchant] = useState<Merchant | null>(null);
  const [directMerchantBags, setDirectMerchantBags] = useState<SurpriseBag[] | null>(null);

  const selectedMerchantId =
    route.name === 'merchant' || route.name === 'merchant_reviews'
      ? route.id
      : selectedBag?.merchantId;

  useEffect(() => {
    if (selectedMerchantId) {
      void customerService.getMerchant(selectedMerchantId).then((res) => {
        if (res?.merchant) setDirectMerchant(res.merchant);
        if (res?.bags && res.bags.length > 0) setDirectMerchantBags(res.bags);
      });
    } else {
      if (directMerchant) setDirectMerchant(null);
      if (directMerchantBags) setDirectMerchantBags(null);
    }
  }, [selectedMerchantId]);

  const selectedMerchant =
    catalog.merchants.find((merchant) => merchant.id === selectedMerchantId) ?? directMerchant ?? null;
  const selectedBrand = route.name === 'brand' ? catalog.brands.find((brand) => brand.id === route.id) ?? null : null;
  const [directOrder, setDirectOrder] = useState<Order | null>(null);
  const [orderLoadFailed, setOrderLoadFailed] = useState(false);

  const selectedOrderId =
    route.name === 'order' || route.name === 'review' || route.name === 'report'
      ? route.id
      : route.name === 'success'
      ? route.orderId
      : null;

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    const clean = selectedOrderId.trim().toLowerCase();
    const rawClean = clean.replace(/^#+/, '').replace(/^gsf-(?:order-|qr-)?/i, '').trim();
    const hexMatch = rawClean.match(/[0-9a-f]{6,8}/i);
    const hex = hexMatch ? hexMatch[0].toLowerCase() : '';
    const hex6 = hex.slice(0, 6);

    const found = orders.find((order) => {
      const orderIdLower = order.id.toLowerCase();
      const orderCodeLower = order.orderCode.toLowerCase();
      const cleanOrderCode = orderCodeLower.replace(/^#+/, '').replace(/^gsf-(?:order-|qr-)?/i, '').trim();

      if (orderIdLower === clean || orderCodeLower === clean) return true;
      if (clean.includes(orderIdLower) || clean.includes(orderCodeLower)) return true;
      if (rawClean && (orderIdLower.includes(rawClean) || orderCodeLower.includes(rawClean))) return true;
      if (cleanOrderCode && rawClean.includes(cleanOrderCode)) return true;
      if (hex6 && (orderIdLower.startsWith(hex6) || orderCodeLower.includes(hex6))) return true;
      return false;
    });
    return found ?? directOrder ?? null;
  }, [selectedOrderId, orders, directOrder]);

  useEffect(() => {
    if (!selectedOrderId) {
      if (directOrder) setDirectOrder(null);
            setOrderLoadFailed(false);
      return;
    }

    if (selectedOrder) {
            setOrderLoadFailed(false);
      return;
    }

    let active = true;
        setOrderLoadFailed(false);

    void customerService
      .getOrder(selectedOrderId)
      .then((ord) => {
        if (!active) return;
                if (ord) {
          setDirectOrder(ord);
          setOrders((prev) => (prev.some((o) => o.id === ord.id) ? prev : [ord, ...prev]));
        } else {
          setOrderLoadFailed(true);
        }
      })
      .catch(() => {
        if (!active) return;
                setOrderLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, [selectedOrderId, selectedOrder]);

  const addToCart = (bag: SurpriseBag, quantity = 1): boolean => {
    if (!auth.isAuthenticated) {
      savePendingAuth({
        route: { name: 'bag', id: bag.id },
        action: 'add_to_cart',
        bagId: bag.id,
        quantity,
      });
      auth.showAuthModal();
      return false;
    }
    cart.addItem(bag, quantity);
    showToast({
      message: `Đã thêm “${bag.name}” vào giỏ hàng`,
      actionText: 'Xem giỏ',
      onAction: () => openTab('cart'),
    });
    return true;
  };
  const buyNow = (bag: SurpriseBag, quantity = 1) => {
    if (!auth.isAuthenticated) {
      savePendingAuth({
        route: { name: 'bag', id: bag.id },
        action: 'buy_now',
        bagId: bag.id,
        quantity,
      });
      auth.showAuthModal();
      return;
    }
    const buyNowItem: CartItem = {
      bag,
      merchantId: bag.merchantId,
      quantity,
    };
    push({ name: 'checkout', buyNowItem });
  };
  const startCheckout = () => {
    if (!auth.isAuthenticated) {
      savePendingAuth({
        route: { name: 'tabs', tab: 'cart' },
        action: undefined,
      });
      auth.showAuthModal();
      return;
    }
    push({ name: 'checkout' });
  };
  // Tự động điều hướng về đúng trang khách định mua/thêm giỏ hàng và thực hiện tiếp hành động sau khi đăng nhập
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user || !pendingAuthTarget) return;

    const { route: targetRoute, action, bagId, quantity = 1 } = pendingAuthTarget;

    // 1. Chuyển về đúng trang mà khách định mua/thêm vào giỏ hàng
    if (targetRoute) {
      setHistory((current) => {
        const last = current[current.length - 1];
        if (
          last &&
          last.name === targetRoute.name &&
          (last as any).id === (targetRoute as any).id &&
          (last as any).tab === (targetRoute as any).tab
        ) {
          return current;
        }
        return [...current, targetRoute];
      });
    }

    // 2. Chờ catalog tải xong để có thông tin túi và thực hiện tiếp hành động
    if (bagId) {
      if (catalog.isLoading) {
        return; // Chờ catalog tải xong sẽ tự động kích hoạt lại effect
      }
      const targetBag =
        catalog.bags.find((b) => b.id === bagId) ||
        directBag;
      if (targetBag) {
        if (action === 'buy_now') {
          const buyNowItem: CartItem = {
            bag: targetBag,
            merchantId: targetBag.merchantId,
            quantity,
          };
          push({ name: 'checkout', buyNowItem });
        } else {
          cart.addItem(targetBag, quantity);
          showToast({
            message: `Đã thêm “${targetBag.name}” vào giỏ hàng`,
            actionText: 'Xem giỏ',
            onAction: () => openTab('cart'),
          });
        }
      }
    }

    savePendingAuth(null);
  }, [auth.isAuthenticated, auth.user?.id, pendingAuthTarget, catalog.bags, catalog.isLoading, directBag]);

  const enrichedNotifications = useMemo(() => {
    return notifications.map((item) => {
      let resolvedImage = item.imageUrl || item.data?.imageUrl || item.data?.image_url || null;

      if (!resolvedImage) {
        const orderId = item.data?.orderId || item.data?.order_id;
        if (orderId) {
          const order = orders.find((o) => o.id === orderId);
          resolvedImage = order?.items[0]?.imageUrl || null;
          if (!resolvedImage && order?.items[0]?.bagId) {
            resolvedImage = catalog.bags.find((b) => b.id === order.items[0].bagId)?.imageUrl || null;
          }
        }
      }

      if (!resolvedImage) {
        const bagId = item.data?.bagId || item.data?.bag_id;
        if (bagId) {
          resolvedImage = catalog.bags.find((b) => b.id === bagId)?.imageUrl || null;
        }
      }

      if (!resolvedImage) {
        const merchantId = item.data?.merchantId || item.data?.merchant_id;
        if (merchantId) {
          resolvedImage = catalog.merchants.find((m) => m.id === merchantId)?.logo || null;
        }
      }

      if (resolvedImage) {
        resolvedImage = optimizeImageUrl(resolvedImage, 120, 75);
      }

      if (resolvedImage !== item.imageUrl) {
        return { ...item, imageUrl: resolvedImage };
      }
      return item;
    });
  }, [notifications, orders, catalog.bags, catalog.merchants]);

  const handleSelectNotification = (item: NotificationItem) => {
    if (!item.read) {
      void customerService.markNotificationRead(item.id);
      setNotifications((current) =>
        current.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
    }
    const orderId =
      item.data?.orderId ||
      item.data?.order_id ||
      item.data?.orderCode ||
      item.data?.order_code ||
      item.data?.id;
    const bagId = item.data?.bagId || item.data?.bag_id;
    const merchantId = item.data?.merchantId || item.data?.merchant_id;

    if (orderId) {
      push({ name: 'order', id: orderId });
    } else if (bagId) {
      push({ name: 'bag', id: bagId });
    } else if (merchantId) {
      push({ name: 'merchant', id: merchantId });
    } else {
      const match = (item.body + ' ' + item.title).match(/GSF-[A-Z0-9-]{4,30}/i);
      if (match) {
        push({ name: 'order', id: match[0] });
      } else if (item.icon === 'order' || item.title.toLowerCase().includes('đơn hàng')) {
        openTab('orders');
      }
    }
  };

  const handleCheckoutContinue = async (draft: CheckoutDraft, buyNowItem?: CartItem) => {
    const orderItems = buyNowItem ? [buyNowItem] : cart.items;
    if (!orderItems.length || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const merchant = catalog.merchants.find((item) => item.id === orderItems[0].merchantId);
      const subtotal = buyNowItem
        ? buyNowItem.bag.discountPrice * buyNowItem.quantity
        : cart.summary.subtotal;
      const originalTotal = buyNowItem
        ? buyNowItem.bag.originalPrice * buyNowItem.quantity
        : cart.summary.original;

      const order: Omit<Order, 'id' | 'orderCode' | 'createdAt'> = {
        merchantId: orderItems[0].merchantId,
        merchantName: merchant?.name ?? orderItems[0].bag.merchantName,
        items: orderItems.map((item) => ({
          bagId: item.bag.id,
          bagName: item.bag.name,
          imageUrl: item.bag.imageUrl,
          quantity: item.quantity,
          unitPrice: item.bag.discountPrice,
          totalPrice: item.bag.discountPrice * item.quantity,
        })),
        totalOriginalPrice: originalTotal,
        totalDiscountPrice: subtotal,
        discountAmount: draft.discountAmount,
        finalAmount: Math.max(0, subtotal - draft.discountAmount),
        status: 'pending_payment',
        paymentMethod: draft.paymentMethod,
        paymentStatus: 'pending',
        pickupTime: draft.pickupTime,
        pickupAddress: merchant?.address ?? 'Địa chỉ cửa hàng',
        note: draft.note?.trim() || undefined,
      };

      const created = await customerService.createOrder(order, draft.voucherCode, {
        name: draft.customerName,
        phone: draft.phone,
      });

      setOrders((current) => [created, ...current]);
      push({ name: 'payment', draft, order: created, buyNowItem });
    } catch (error) {
      console.error('Tạo đơn hàng trước lỗi:', error);
      window.alert(
        error instanceof Error
          ? error.message
          : 'Không thể khởi tạo đơn hàng. Vui lòng kiểm tra lại giỏ hàng và thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentConfirm = async (draft: CheckoutDraft, existingOrder?: Order, buyNowItem?: CartItem) => {
    if (existingOrder) {
      if (!buyNowItem) cart.clear();
      try {
        const freshOrder = await customerService.getOrder(existingOrder.id);
        if (freshOrder) {
          setOrders((current) =>
            current.map((o) => (o.id === existingOrder.id ? freshOrder : o))
          );
        } else {
          setOrders((current) =>
            current.map((o) =>
              o.id === existingOrder.id
                ? { ...o, status: 'paid', paymentStatus: 'success' }
                : o
            )
          );
        }
      } catch {
        setOrders((current) =>
          current.map((o) =>
            o.id === existingOrder.id
              ? { ...o, status: 'paid', paymentStatus: 'success' }
              : o
          )
        );
      }
      resetToSuccess(existingOrder.id);
      return;
    }
    await confirmPayment(draft, buyNowItem);
  };

  const confirmPayment = async (draft: CheckoutDraft, buyNowItem?: CartItem) => {
    const orderItems = buyNowItem ? [buyNowItem] : cart.items;
    if (!orderItems.length) return;
    setIsSubmitting(true);
    try {
      const merchant = catalog.merchants.find((item) => item.id === orderItems[0].merchantId);
      const subtotal = buyNowItem
        ? buyNowItem.bag.discountPrice * buyNowItem.quantity
        : cart.summary.subtotal;
      const originalTotal = buyNowItem
        ? buyNowItem.bag.originalPrice * buyNowItem.quantity
        : cart.summary.original;

      const order: Omit<Order, 'id' | 'orderCode' | 'createdAt'> = {
        merchantId: orderItems[0].merchantId,
        merchantName: merchant?.name ?? orderItems[0].bag.merchantName,
        items: orderItems.map((item) => ({
          bagId: item.bag.id,
          bagName: item.bag.name,
          imageUrl: item.bag.imageUrl,
          quantity: item.quantity,
          unitPrice: item.bag.discountPrice,
          totalPrice: item.bag.discountPrice * item.quantity,
        })),
        totalOriginalPrice: originalTotal,
        totalDiscountPrice: subtotal,
        discountAmount: draft.discountAmount,
        finalAmount: Math.max(0, subtotal - draft.discountAmount),
        status: 'pending_payment',
        paymentMethod: draft.paymentMethod,
        paymentStatus: 'pending',
        pickupTime: draft.pickupTime,
        pickupAddress: merchant?.address ?? 'Địa chỉ cửa hàng',
        note: draft.note?.trim() || undefined,
      };
      const created = await customerService.createOrder(order, draft.voucherCode, {
        name: draft.customerName,
        phone: draft.phone,
      });
      auth.updateProfile({ name: draft.customerName, phone: draft.phone });
      recentlyCreatedOrderIds.current.add(created.id);
      setOrders((current) => [created, ...current]);
      setOrdersBadgeCount((prev) => prev + 1);
      if (!buyNowItem) {
        cart.clear();
      }
      resetToSuccess(created.id);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Không thể tạo đơn hàng. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setIsStandalone(choice.outcome === 'accepted');
      setInstallPrompt(null);
      return;
    }
    window.alert('Mở menu trình duyệt và chọn “Thêm vào màn hình chính” để cài GoSavingFood.');
  };

  const renderScreen = () => {
    if (route.name === 'tabs') {
      if (route.tab === 'home') return <HomePage {...catalog} location={location} onSearch={() => push({ name: 'search' })} onLocation={() => push({ name: 'location' })} onOpenBag={(bag) => push({ name: 'bag', id: bag.id })} onOpenMerchant={(merchant) => push({ name: 'merchant', id: merchant.id })} onOpenBrand={(brand) => push({ name: 'brand', id: brand.id })} onAdd={addToCart} onViewAll={(categoryId) => push({ name: 'bags', categoryId })} />;
      if (route.tab === 'cart') return <CartPage items={cart.items} isAuthenticated={auth.isAuthenticated} {...cart.summary} onLogin={auth.showAuthModal} onExplore={home} onCheckout={startCheckout} onUpdate={cart.updateQuantity} onRemove={cart.removeItem} onOpenBag={(bag) => push({ name: 'bag', id: bag.id })} />;
      if (route.tab === 'orders') return <OrdersPage orders={orders} isAuthenticated={auth.isAuthenticated} onLogin={auth.showAuthModal} onOpenOrder={(order) => push({ name: 'order', id: order.id })} />;
      return (
        <ProfilePage
          user={auth.user}
          orders={orders}
          vouchers={vouchers}
          isStandalone={isStandalone}
          onLogin={auth.showAuthModal}
          onLogout={auth.logout}
          onOrders={() => openTab('orders')}
          onNotifications={() => push({ name: 'notifications' })}
          onLocation={() => push({ name: 'location' })}
          onInstall={installApp}
          onUpdateProfile={auth.updateProfile}
          onDeleteAccount={async () => {
            const res = await auth.deleteAccount();
            if (res.success) {
              showToast('Tài khoản của bạn đã được xóa vĩnh viễn khỏi hệ thống.');
              openTab('home');
            } else {
              window.alert(res.message || 'Không thể xóa tài khoản. Vui lòng thử lại.');
            }
          }}
        />
      );
    }
    if (route.name === 'search')
      return (
        <SearchPage
          bags={catalog.bags}
          merchants={catalog.merchants}
          currentLocation={location}
          coords={coords}
          onBack={back}
          onOpenBag={(bag) => push({ name: 'bag', id: bag.id })}
          onOpenMerchant={(merchant) => push({ name: 'merchant', id: merchant.id })}
          onOpenLocation={() => push({ name: 'location' })}
          onLocationChange={(nextLoc, nextCoords) => {
            updateLocation(nextLoc, nextCoords);
          }}
          onAdd={addToCart}
        />
      );


    if (route.name === 'bags') {
      const selectedCatId = route.categoryId;
      const filteredBags = selectedCatId && selectedCatId !== 'all'
        ? catalog.bags.filter((b) => b.category === selectedCatId)
        : catalog.bags;
      const targetCategory = catalog.categories.find((c) => c.id === selectedCatId);
      return (
        <BagsPage
          title={targetCategory ? `Túi thực phẩm: ${targetCategory.label}` : 'Gợi ý cho bạn'}
          bags={filteredBags}
          categories={catalog.categories}
          onBack={back}
          onOpen={(bag) => push({ name: 'bag', id: bag.id })}
          onAdd={addToCart}
        />
      );
    }
    if (route.name === 'bag')
      return (
        <BagDetailPage
          bag={selectedBag}
          merchant={selectedMerchant}
          userCoords={coords}
          isAuthenticated={auth.isAuthenticated}
          isLoading={catalog.isLoading}
          onBack={back}
          onMerchant={() =>
            selectedMerchant && push({ name: 'merchant', id: selectedMerchant.id })
          }
          onAdd={addToCart}
          onBuyNow={buyNow}
          onRequireAuth={(action, bagItem, qty) => {
            const targetBag = bagItem || selectedBag;
            if (targetBag) {
              savePendingAuth({
                route: { name: 'bag', id: targetBag.id },
                action: action || 'add_to_cart',
                bagId: targetBag.id,
                quantity: qty || 1,
              });
            }
            auth.showAuthModal();
          }}
        />
      );
    if (route.name === 'merchant') {
      const merchantBags =
        directMerchantBags && directMerchantBags.length > 0
          ? directMerchantBags
          : catalog.bags.filter((bag) => bag.merchantId === route.id);
      return (
        <MerchantDetailPage
          merchant={selectedMerchant}
          bags={merchantBags}
          onBack={back}
          onOpenBag={(bag) => push({ name: 'bag', id: bag.id })}
          onAdd={addToCart}
          onOpenReviews={(merchantId) => push({ name: 'merchant_reviews', id: merchantId })}
        />
      );
    }
    if (route.name === 'merchant_reviews')
      return (
        <MerchantReviewsView
          merchant={selectedMerchant}
          onBack={back}
        />
      );
    if (route.name === 'brand') {
      const brandBaseName = selectedBrand ? selectedBrand.name.split(' - ')[0].trim().toLowerCase() : '';
      const brandStores = catalog.merchants.filter(
        (merchant) =>
          merchant.brandId === route.id ||
          merchant.id === route.id ||
          (brandBaseName && merchant.name.toLowerCase().includes(brandBaseName))
      );
      return (
        <BrandDetailPage
          brand={selectedBrand}
          stores={brandStores}
          onBack={back}
          onOpenMerchant={(merchant) => push({ name: 'merchant', id: merchant.id })}
        />
      );
    }
    if (route.name === 'checkout' && auth.user) {
      const checkoutItems = route.buyNowItem ? [route.buyNowItem] : cart.items;
      const checkoutSubtotal = route.buyNowItem
        ? route.buyNowItem.bag.discountPrice * route.buyNowItem.quantity
        : cart.summary.subtotal;

      return (
        <CheckoutPage
          items={checkoutItems}
          subtotal={checkoutSubtotal}
          user={auth.user}
          vouchers={vouchers}
          isSubmitting={isSubmitting}
          onBack={back}
          onContinue={(draft) => handleCheckoutContinue(draft, route.buyNowItem)}
        />
      );
    }
    if (route.name === 'payment') {
      const qOrderId = route.order?.id || route.orderId;
      const qOrderCode = route.order?.orderCode || route.orderCode;
      const matchedOrder = route.order || (qOrderId ? orders.find((o) => o.id === qOrderId) : undefined);

      const paymentSubtotal = route.buyNowItem
        ? route.buyNowItem.bag.discountPrice * route.buyNowItem.quantity
        : (route.draft?.discountAmount ? cart.summary.subtotal : (matchedOrder?.totalDiscountPrice || 0));
      const totalAmount = matchedOrder?.finalAmount ?? Math.max(0, paymentSubtotal - (route.draft?.discountAmount || 0));

      return (
        <PaymentPage
          draft={route.draft}
          order={matchedOrder}
          orderId={qOrderId}
          orderCode={qOrderCode}
          total={totalAmount}
          isSubmitting={isSubmitting}
          onBack={back}
          onCancel={(cancelledOrderId, reason) => {
            const targetId = cancelledOrderId || qOrderId;
            if (targetId) {
              setOrders((prev) =>
                prev.map((o) =>
                  o.id.toLowerCase() === targetId.toLowerCase()
                    ? {
                        ...o,
                        status: 'cancelled',
                        cancelledAt: new Date().toISOString(),
                        cancelReason: reason || 'Người dùng hủy thanh toán tại bước quét mã QR',
                      }
                    : o
                )
              );
            }
            back();
          }}
          onConfirm={() => {
            const confirmedOrder = matchedOrder || route.order;
            if (confirmedOrder) {
              handlePaymentConfirm(route.draft || ({} as any), confirmedOrder, route.buyNowItem);
            } else if (qOrderId) {
              resetToSuccess(qOrderId);
            } else {
              back();
            }
          }}
        />
      );
    }
    if (route.name === 'success') {
      if (!selectedOrder) {
        return (
          <div className="customer-screen customer-screen--center" style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Đang tải đơn hàng...</p>
            <button type="button" className="customer-secondary-btn" onClick={() => openTab('orders')} style={{ marginTop: '1rem' }}>
              Xem danh sách đơn
            </button>
          </div>
        );
      }
      return <OrderSuccessPage order={selectedOrder} onOrders={() => openTab('orders')} onHome={home} />;
    }
    if (route.name === 'order') {
      if (!selectedOrder) {
        if (orderLoadFailed) {
          return (
            <div className="customer-screen customer-screen--center" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '0.75rem' }}>📦</div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Không tìm thấy đơn hàng</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '360px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                Đơn hàng này không tồn tại hoặc bạn chưa đăng nhập tài khoản sở hữu đơn. Vui lòng kiểm tra lại.
              </p>
              <button type="button" className="customer-primary-btn" onClick={() => openTab('orders')}>
                Xem danh sách đơn hàng
              </button>
            </div>
          );
        }

        return (
          <div className="customer-screen customer-screen--center" style={{ padding: '2rem', textAlign: 'center' }}>
            <div className="customer-spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, color: '#0f172a' }}>Đang tải chi tiết đơn hàng...</p>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '0.25rem' }}>Vui lòng đợi trong giây lát</p>
            <button type="button" className="customer-secondary-btn" onClick={() => openTab('orders')} style={{ marginTop: '1.25rem' }}>
              Quay lại danh sách đơn
            </button>
          </div>
        );
      }
      return (
        <OrderDetailPage
          order={selectedOrder}
          onBack={back}
          onReview={() => push({ name: 'review', id: selectedOrder.id })}
          onReport={() => push({ name: 'report', id: selectedOrder.id })}
          onPay={(o) =>
            push({
              name: 'payment',
              draft: {
                customerName: auth.user?.name || 'Khách hàng',
                phone: auth.user?.phone || '',
                pickupTime: o.pickupTime,
                note: o.note || '',
                paymentMethod: 'payos_vietqr',
                discountAmount: o.discountAmount,
              },
              order: o,
            })
          }
          onOpenBag={(bagId) => push({ name: 'bag', id: bagId })}
          onSaveNote={(orderId, note) => {
            void customerService.updateOrderNote(orderId, note);
          }}
          onCancelOrder={(orderId, reason, bankInfo) => {
            void customerService.cancelOrder(orderId, reason, bankInfo);
          }}
          onUpdateOrder={(updated) => {
            setOrders((prev) =>
              prev.map((o) => (o.id.toLowerCase() === updated.id.toLowerCase() ? updated : o))
            );
          }}
          onReorder={(order) => {
            if (order.items[0]) {
              push({ name: 'bag', id: order.items[0].bagId });
            } else {
              openTab('home');
            }
          }}
        />
      );
    }
    if ((route.name === 'review' || route.name === 'report') && selectedOrder)
      return (
        <OrderFeedbackPage
          mode={route.name}
          order={selectedOrder}
          onBack={back}
          onSubmit={async (feedback) => {
            if (route.name === 'review') {
              await customerService.submitFeedback(
                selectedOrder.id,
                selectedOrder.merchantId,
                feedback.rating,
                feedback.comment,
                feedback.tags
              );
              setOrders((prev) =>
                prev.map((o) =>
                  o.id === selectedOrder.id
                    ? {
                        ...o,
                        review: {
                          rating: feedback.rating,
                          tags: feedback.tags,
                          comment: feedback.comment,
                          createdAt: new Date().toISOString(),
                        },
                      }
                    : o
                )
              );
              showToast('Cảm ơn bạn đã đánh giá! Nhận xét đã được gửi đến quán.');
            } else {
              await customerService.submitIssue(
                selectedOrder.id,
                feedback.tags[0] || 'Báo cáo sự cố',
                feedback.comment
              );
              showToast('Đã gửi báo cáo sự cố. Đội ngũ CSKH sẽ sớm liên hệ hỗ trợ bạn.');
            }
            back();
          }}
        />
      );
    if (route.name === 'notifications')
      return (
        <NotificationsPage
          notifications={enrichedNotifications}
          onBack={back}
          onReadAll={() => {
            void customerService.markAllNotificationsRead();
            setNotifications((current) => current.map((item) => ({ ...item, read: true })));
          }}
          onSelectNotification={handleSelectNotification}
        />
      );
    if (route.name === 'location')
      return (
        <SelectLocationPage
          currentLocation={location}
          initialCoords={coords}
          onBack={back}
          onSelect={(nextLocation, nextCoords) => {
            updateLocation(nextLocation, nextCoords);
            back();
          }}
        />
      );
    return null;
  };

  const isTabs = route.name === 'tabs';
  return (
    <>
      <AppLayout
        activeTab={activeTab}
        activeNav={activeNav}
        cartCount={cart.summary.count}
        ordersBadgeCount={ordersBadgeCount}
        location={location}
        unreadCount={notifications.filter((item) => !item.read).length}
        notifications={enrichedNotifications}
        showHeader={isTabs && route.tab === 'home'}
        showBottomNav={isTabs}
        onTabChange={openTab}
        onLocationClick={() => push({ name: 'location' })}
        onNotificationClick={() => push({ name: 'notifications' })}
        onSelectNotification={handleSelectNotification}
      >
        <Suspense fallback={<ScreenLoadingFallback />}>
          {renderScreen()}
        </Suspense>
      </AppLayout>

      {toast && (
        <aside className="customer-toast-popup" role="status" aria-live="polite">
          <div className="customer-toast-icon">
            <CheckCircle2 size={18} />
          </div>
          <span className="customer-toast-text">{toast.message}</span>
          {toast.actionText && (
            <button
              type="button"
              className="customer-toast-cta"
              onClick={() => {
                const action = toast.onAction;
                setToast(null);
                action?.();
              }}
            >
              {toast.actionText}
            </button>
          )}
        </aside>
      )}

      <AuthModal onClose={() => savePendingAuth(null)} />
    </>
  );
}

export default function App() {
  return <AuthProvider><CustomerApp /></AuthProvider>;
}
