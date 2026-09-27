import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AppLayout } from './app/layouts/AppLayout';
import { AuthProvider } from './contexts/AuthContext';
import { AuthModal } from './features/auth/components/AuthModal';
import { CartPage } from './features/cart/pages/CartPage';
import { BagDetailPage } from './features/catalog/pages/BagDetailPage';
import { BagsPage } from './features/catalog/pages/BagsPage';
import { BrandDetailPage } from './features/catalog/pages/BrandDetailPage';
import { MerchantDetailPage } from './features/catalog/pages/MerchantDetailPage';
import { CheckoutPage } from './features/checkout/pages/CheckoutPage';
import { OrderSuccessPage } from './features/checkout/pages/OrderSuccessPage';
import { PaymentPage } from './features/checkout/pages/PaymentPage';
import { HomePage } from './features/home/pages/HomePage';
import { SelectLocationPage } from './features/location/pages/SelectLocationPage';
import { NotificationsPage } from './features/notifications/pages/NotificationsPage';
import { OrderDetailPage } from './features/orders/pages/OrderDetailPage';
import { OrderFeedbackPage } from './features/orders/pages/OrderFeedbackPage';
import { OrdersPage } from './features/orders/pages/OrdersPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { SearchPage } from './features/search/pages/SearchPage';
import { useCart } from './hooks/useCart';
import { useAuth } from './hooks/useAuth';
import { useCustomerCatalog } from './hooks/useCustomerCatalog';
import { customerService } from './services/customer.service';
import type {
  AppRoute,
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

function CustomerApp() {
  const catalog = useCustomerCatalog();
  const cart = useCart();
  const auth = useAuth();
  const [history, setHistory] = useState<AppRoute[]>([{ name: 'tabs', tab: 'home' }]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [location, setLocation] = useState('Quận 1, TP.HCM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStandalone, setIsStandalone] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let active = true;
    Promise.all([
      customerService.getOrders(),
      customerService.getNotifications(),
      customerService.getVouchers(),
    ]).then(([nextOrders, nextNotifications, nextVouchers]) => {
      if (!active) return;
      setOrders(nextOrders);
      setNotifications(nextNotifications);
      setVouchers(nextVouchers);
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

  const route = history[history.length - 1];
  const activeTab: CustomerTab = route.name === 'tabs' ? route.tab : 'home';
  const push = (nextRoute: AppRoute) => setHistory((current) => [...current, nextRoute]);
  const back = () => setHistory((current) => (current.length > 1 ? current.slice(0, -1) : current));
  const openTab = (tab: CustomerTab) => setHistory([{ name: 'tabs', tab }]);
  const home = () => openTab('home');
  const selectedBag = route.name === 'bag' ? catalog.bags.find((bag) => bag.id === route.id) ?? null : null;
  const selectedMerchantId = route.name === 'merchant' ? route.id : selectedBag?.merchantId;
  const selectedMerchant = catalog.merchants.find((merchant) => merchant.id === selectedMerchantId) ?? null;
  const selectedBrand = route.name === 'brand' ? catalog.brands.find((brand) => brand.id === route.id) ?? null : null;
  const selectedOrderId = route.name === 'order' || route.name === 'review' || route.name === 'report' ? route.id : route.name === 'success' ? route.orderId : null;
  const selectedOrder = selectedOrderId ? orders.find((order) => order.id === selectedOrderId) ?? null : null;

  const addToCart = (bag: SurpriseBag, quantity = 1) => {
    cart.addItem(bag, quantity);
    setToastMessage(`Đã thêm “${bag.name}” vào giỏ hàng`);
  };
  const buyNow = (bag: SurpriseBag, quantity: number) => {
    addToCart(bag, quantity);
    if (!auth.isAuthenticated) {
      auth.showAuthModal();
      return;
    }
    push({ name: 'checkout' });
  };
  const startCheckout = () => {
    if (!auth.isAuthenticated) {
      auth.showAuthModal();
      return;
    }
    push({ name: 'checkout' });
  };
  const confirmPayment = async (draft: CheckoutDraft) => {
    if (!cart.items.length) return;
    setIsSubmitting(true);
    const merchant = catalog.merchants.find((item) => item.id === cart.items[0].merchantId);
    const order: Omit<Order, 'id' | 'orderCode' | 'createdAt'> = {
      merchantId: cart.items[0].merchantId,
      merchantName: merchant?.name ?? cart.items[0].bag.merchantName,
      items: cart.items.map((item) => ({
        bagId: item.bag.id,
        bagName: item.bag.name,
        imageUrl: item.bag.imageUrl,
        quantity: item.quantity,
        unitPrice: item.bag.discountPrice,
        totalPrice: item.bag.discountPrice * item.quantity,
      })),
      totalOriginalPrice: cart.summary.original,
      totalDiscountPrice: cart.summary.subtotal,
      discountAmount: draft.discountAmount,
      finalAmount: Math.max(0, cart.summary.subtotal - draft.discountAmount),
      status: draft.paymentMethod === 'cash' ? 'pending' : 'confirmed',
      paymentMethod: draft.paymentMethod,
      paymentStatus: draft.paymentMethod === 'cash' ? 'pending' : 'success',
      pickupTime: draft.pickupTime,
      pickupAddress: merchant?.address ?? 'Địa chỉ cửa hàng',
    };
    const created = await customerService.createOrder(order);
    setOrders((current) => [created, ...current]);
    cart.clear();
    setIsSubmitting(false);
    setHistory([{ name: 'success', orderId: created.id }]);
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
    if (route.name === 'search') return <SearchPage bags={catalog.bags} merchants={catalog.merchants} onBack={back} onOpenBag={(bag) => push({ name: 'bag', id: bag.id })} onAdd={addToCart} />;
    if (route.name === 'bags') return <BagsPage bags={catalog.bags} categories={catalog.categories} onBack={back} onOpen={(bag) => push({ name: 'bag', id: bag.id })} onAdd={addToCart} />;
    if (route.name === 'bag') return <BagDetailPage bag={selectedBag} merchant={selectedMerchant} onBack={back} onMerchant={() => selectedMerchant && push({ name: 'merchant', id: selectedMerchant.id })} onAdd={addToCart} onBuyNow={buyNow} />;
    if (route.name === 'merchant') return <MerchantDetailPage merchant={selectedMerchant} bags={catalog.bags.filter((bag) => bag.merchantId === route.id)} onBack={back} onOpenBag={(bag) => push({ name: 'bag', id: bag.id })} onAdd={addToCart} />;
    if (route.name === 'brand') return <BrandDetailPage brand={selectedBrand} stores={catalog.merchants.filter((merchant) => merchant.brandId === route.id)} onBack={back} onOpenMerchant={(merchant) => push({ name: 'merchant', id: merchant.id })} />;
    if (route.name === 'checkout' && auth.user) return <CheckoutPage items={cart.items} subtotal={cart.summary.subtotal} user={auth.user} vouchers={vouchers} onBack={back} onContinue={(draft) => push({ name: 'payment', draft })} />;
    if (route.name === 'payment') return <PaymentPage draft={route.draft} total={Math.max(0, cart.summary.subtotal - route.draft.discountAmount)} isSubmitting={isSubmitting} onBack={back} onConfirm={() => confirmPayment(route.draft)} />;
    if (route.name === 'success' && selectedOrder) return <OrderSuccessPage order={selectedOrder} onOrders={() => openTab('orders')} onHome={home} />;
    if (route.name === 'order' && selectedOrder)
      return (
        <OrderDetailPage
          order={selectedOrder}
          onBack={back}
          onReview={() => push({ name: 'review', id: selectedOrder.id })}
          onReport={() => push({ name: 'report', id: selectedOrder.id })}
          onUpdateOrder={(updated) => {
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? updated : o))
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
    if ((route.name === 'review' || route.name === 'report') && selectedOrder)
      return (
        <OrderFeedbackPage
          mode={route.name}
          order={selectedOrder}
          onBack={back}
          onSubmit={(feedback) => {
            if (route.name === 'review') {
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
              window.alert('Đã gửi báo cáo sự cố. Đội ngũ CSKH GoSavingFood sẽ sớm liên hệ lại.');
            }
            back();
          }}
        />
      );
    if (route.name === 'notifications') return <NotificationsPage notifications={notifications} onBack={back} onReadAll={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))} />;
    if (route.name === 'location') return <SelectLocationPage currentLocation={location} onBack={back} onSelect={(nextLocation) => { setLocation(nextLocation); back(); }} />;
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
        {renderScreen()}
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

      <AuthModal />
    </>
  );
}

export default function App() {
  return <AuthProvider><CustomerApp /></AuthProvider>;
}
