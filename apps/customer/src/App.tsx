import { lazy, Suspense, useEffect, useState } from 'react';
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
import { customerService, HANOI_BAGS } from './services/customer.service';

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

function loadStoredHistory(): AppRoute[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_HISTORY_KEY);
    if (!raw) return [{ name: 'tabs', tab: 'home' }];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {}
  return [{ name: 'tabs', tab: 'home' }];
}

function CustomerApp() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COORDS_KEY);
      return saved ? JSON.parse(saved) : undefined;
    } catch {
      return undefined;
    }
  });

  const [location, setLocation] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOCATION_KEY);
      return saved || 'Đang lấy vị trí của bạn...';
    } catch {
      return 'Đang lấy vị trí của bạn...';
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
  const [history, setHistory] = useState<AppRoute[]>(loadStoredHistory);
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

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStandalone, setIsStandalone] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tự động xin quyền GPS và lấy vị trí thực tế của thiết bị ngay khi mở app
  useEffect(() => {
    if (!navigator.geolocation) {
      if (location === 'Đang lấy vị trí của bạn...') {
        updateLocation('Quận 1, TP.HCM', { lat: 10.7798, lng: 106.7032 });
      }
      return;
    }

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
        console.warn('[App] Geolocation denied or unavailable on launch:', err.message);
        if (location === 'Đang lấy vị trí của bạn...') {
          updateLocation('Quận 1, TP.HCM', { lat: 10.7798, lng: 106.7032 });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let active = true;
    customerService.getVouchers().then((nextVouchers) => {
      if (!active) return;
      setVouchers(nextVouchers || []);
    });
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!auth.user) {
      setOrders([]);
      setNotifications([]);
      return;
    }
    void customerService.getOrders(auth.user.id).then((items) => {
      setOrders(items || []);
    });
    void customerService.getNotifications().then((items) => setNotifications(items || []));

    const channel = customerService.subscribeToCustomerUpdates(
      auth.user.id,
      (orderPayload) => {
        console.log('[Realtime Customer App] onOrderChange received:', orderPayload?.eventType, orderPayload?.new?.status, orderPayload?.new?.id);
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
          setToastMessage(body ? `${title}: ${body}` : title);
        }
      }
    );

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [auth.user?.id]);

  const route = history[history.length - 1];
  const activeTab: CustomerTab = route.name === 'tabs' ? route.tab : 'home';
  const push = (nextRoute: AppRoute) => setHistory((current) => [...current, nextRoute]);
  const back = () => setHistory((current) => (current.length > 1 ? current.slice(0, -1) : current));
  const openTab = (tab: CustomerTab) => setHistory([{ name: 'tabs', tab }]);
  const home = () => openTab('home');
  const [directBag, setDirectBag] = useState<SurpriseBag | null>(null);

  const selectedBag =
    route.name === 'bag'
      ? catalog.bags.find((bag) => bag.id === route.id) ??
        HANOI_BAGS.find((bag) => bag.id === route.id) ??
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

  const selectedMerchantId = route.name === 'merchant' ? route.id : selectedBag?.merchantId;
  const selectedMerchant =
    catalog.merchants.find((merchant) => merchant.id === selectedMerchantId) ?? null;
  const selectedBrand = route.name === 'brand' ? catalog.brands.find((brand) => brand.id === route.id) ?? null : null;
  const selectedOrderId = route.name === 'order' || route.name === 'review' || route.name === 'report' ? route.id : route.name === 'success' ? route.orderId : null;
  const selectedOrder = selectedOrderId ? orders.find((order) => order.id.toLowerCase() === selectedOrderId.toLowerCase()) ?? null : null;

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
    setToastMessage(`Đã thêm “${bag.name}” vào giỏ hàng`);
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
        HANOI_BAGS.find((b) => b.id === bagId) ||
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
          setToastMessage(`Đã thêm “${targetBag.name}” vào giỏ hàng`);
        }
      }
    }

    savePendingAuth(null);
  }, [auth.isAuthenticated, auth.user?.id, pendingAuthTarget, catalog.bags, catalog.isLoading, directBag]);

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
        status: 'pending',
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
      console.warn('Tạo đơn trước lỗi (chuyển sang payment fallback):', error);
      push({ name: 'payment', draft, buyNowItem });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentConfirm = async (draft: CheckoutDraft, existingOrder?: Order, buyNowItem?: CartItem) => {
    if (existingOrder) {
      if (!buyNowItem) cart.clear();
      setHistory([{ name: 'success', orderId: existingOrder.id }]);
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
        status: 'pending',
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
      setOrders((current) => [created, ...current]);
      if (!buyNowItem) {
        cart.clear();
      }
      setHistory([{ name: 'success', orderId: created.id }]);
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
      if (route.tab === 'home') return <HomePage {...catalog} location={location} onSearch={() => push({ name: 'search' })} onLocation={() => push({ name: 'location' })} onOpenBag={(bag) => push({ name: 'bag', id: bag.id })} onOpenMerchant={(merchant) => push({ name: 'merchant', id: merchant.id })} onOpenBrand={(brand) => push({ name: 'brand', id: brand.id })} onAdd={addToCart} onViewAll={() => push({ name: 'bags' })} />;
      if (route.tab === 'cart') return <CartPage items={cart.items} isAuthenticated={auth.isAuthenticated} {...cart.summary} onLogin={auth.showAuthModal} onExplore={home} onCheckout={startCheckout} onUpdate={cart.updateQuantity} onRemove={cart.removeItem} onOpenBag={(bag) => push({ name: 'bag', id: bag.id })} />;
      if (route.tab === 'orders') return <OrdersPage orders={orders} isAuthenticated={auth.isAuthenticated} onLogin={auth.showAuthModal} onOpenOrder={(order) => push({ name: 'order', id: order.id })} />;
      return <ProfilePage user={auth.user} orders={orders} vouchers={vouchers} isStandalone={isStandalone} onLogin={auth.showAuthModal} onLogout={auth.logout} onOrders={() => openTab('orders')} onNotifications={() => push({ name: 'notifications' })} onLocation={() => push({ name: 'location' })} onInstall={installApp} onUpdateProfile={auth.updateProfile} onDeleteAccount={() => { auth.logout(); window.alert('Tài khoản của bạn đã được xóa thành công khỏi thiết bị.'); }} />;
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


    if (route.name === 'bags') return <BagsPage bags={catalog.bags} categories={catalog.categories} onBack={back} onOpen={(bag) => push({ name: 'bag', id: bag.id })} onAdd={addToCart} />;
    if (route.name === 'bag')
      return (
        <BagDetailPage
          bag={selectedBag}
          merchant={selectedMerchant}
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
    if (route.name === 'merchant') return <MerchantDetailPage merchant={selectedMerchant} bags={catalog.bags.filter((bag) => bag.merchantId === route.id)} onBack={back} onOpenBag={(bag) => push({ name: 'bag', id: bag.id })} onAdd={addToCart} />;
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
      const paymentSubtotal = route.buyNowItem
        ? route.buyNowItem.bag.discountPrice * route.buyNowItem.quantity
        : cart.summary.subtotal;
      const totalAmount = Math.max(0, paymentSubtotal - route.draft.discountAmount);

      return (
        <PaymentPage
          draft={route.draft}
          order={route.order}
          total={totalAmount}
          isSubmitting={isSubmitting}
          onBack={back}
          onConfirm={() => handlePaymentConfirm(route.draft, route.order, route.buyNowItem)}
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
        return (
          <div className="customer-screen customer-screen--center" style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Đang tải chi tiết đơn hàng...</p>
            <button type="button" className="customer-secondary-btn" onClick={() => openTab('orders')} style={{ marginTop: '1rem' }}>
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
          onOpenBag={(bagId) => push({ name: 'bag', id: bagId })}
          onSaveNote={(orderId, note) => {
            void customerService.updateOrderNote(orderId, note);
          }}
          onCancelOrder={(orderId, reason) => {
            void customerService.cancelOrder(orderId, reason);
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
          onSubmit={(feedback) => {
            if (route.name === 'review') {
              void customerService.submitFeedback(
                selectedOrder.id,
                selectedOrder.merchantId,
                feedback.rating,
                feedback.comment
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
              window.alert('Cảm ơn bạn đã gửi đánh giá! Ý kiến của bạn đã được lưu lại.');
            } else {
              void customerService.submitIssue(
                selectedOrder.id,
                feedback.tags[0] || 'Báo cáo sự cố',
                feedback.comment
              );
              window.alert('Đã gửi báo cáo sự cố. Đội ngũ CSKH GoSavingFood sẽ sớm liên hệ lại.');
            }
            back();
          }}
        />
      );
    if (route.name === 'notifications')
      return (
        <NotificationsPage
          notifications={notifications}
          onBack={back}
          onReadAll={() => {
            void customerService.markAllNotificationsRead();
            setNotifications((current) => current.map((item) => ({ ...item, read: true })));
          }}
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
        cartCount={cart.summary.count}
        location={location}
        unreadCount={notifications.filter((item) => !item.read).length}
        showHeader={isTabs && route.tab === 'home'}
        showBottomNav={isTabs}
        onTabChange={openTab}
        onLocationClick={() => push({ name: 'location' })}
        onNotificationClick={() => push({ name: 'notifications' })}
      >
        <Suspense fallback={<ScreenLoadingFallback />}>
          {renderScreen()}
        </Suspense>
      </AppLayout>

      {toastMessage && (
        <aside className="customer-toast-popup" role="status" aria-live="polite">
          <div className="customer-toast-icon">
            <CheckCircle2 size={18} />
          </div>
          <span className="customer-toast-text">{toastMessage}</span>
          <button
            type="button"
            className="customer-toast-cta"
            onClick={() => {
              setToastMessage(null);
              openTab('cart');
            }}
          >
            Xem giỏ
          </button>
        </aside>
      )}

      <AuthModal onClose={() => savePendingAuth(null)} />
    </>
  );
}

export default function App() {
  return <AuthProvider><CustomerApp /></AuthProvider>;
}
