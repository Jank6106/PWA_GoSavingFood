import { useState, useEffect } from 'react';
import { AppHeader } from './app/layouts/AppHeader';
import { BottomNav } from './app/layouts/BottomNav';
import { HomePage } from './features/home/pages/HomePage';
import { CartPage } from './features/cart/pages/CartPage';
import { OrdersPage } from './features/orders/pages/OrdersPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { Dialog, Button, Badge } from '@gosavingfood/ui';
import { Clock, MapPin, Plus, Share2 } from 'lucide-react';
import type {
  ProductDeal,
  CartItem,
  CustomerOrder,
  CustomerTab,
} from './shared/types/customer.types';

const INITIAL_DEALS: ProductDeal[] = [
  {
    id: 'deal-1',
    shopName: 'Bánh Mì Sài Gòn Bakery',
    title: 'Túi Bí Mật Bánh Mì Tươi Cuối Ngày',
    category: 'bag',
    originalPrice: 80000,
    rescuePrice: 25000,
    discountPercentage: 68,
    pickupTime: '18:30 - 20:00',
    distance: '400m',
    stock: 3,
    icon: '🥖',
    description: 'Bao gồm 3-4 loại bánh mì tươi thơm ngon được nướng trong ngày (bánh mì bơ tỏi, croissant, bánh mì mè đen). Chất lượng tuyệt hảo.',
  },
  {
    id: 'deal-2',
    shopName: 'Quán Cơm Bento Mẹ Nấu',
    title: 'Suất Cơm Trưa Bento Thập Cẩm',
    category: 'rice',
    originalPrice: 65000,
    rescuePrice: 22000,
    discountPercentage: 66,
    pickupTime: '13:30 - 15:00',
    distance: '800m',
    stock: 4,
    icon: '🍱',
    description: 'Cơm nóng sốt kèm món mặn (sườn nướng hoặc cá kho), canh rau theo mùa và trứng chiên. Đóng hộp giấy bảo vệ môi trường.',
  },
  {
    id: 'deal-3',
    shopName: 'Le Petit Paris Cafe',
    title: 'Túi Bánh Ngọt French Pastry',
    category: 'bakery',
    originalPrice: 120000,
    rescuePrice: 45000,
    discountPercentage: 62,
    pickupTime: '19:00 - 21:00',
    distance: '1.2km',
    stock: 2,
    icon: '🥐',
    description: 'Bánh sừng bò ngàn lớp, bánh Danish trái cây tươi hoặc tart trứng béo ngậy chuẩn công thức bánh Pháp cao cấp.',
  },
  {
    id: 'deal-4',
    shopName: 'Healthy Green Salad Bar',
    title: 'Salad Ức Gà Áp Chảo & Rau Củ Tươi',
    category: 'healthy',
    originalPrice: 75000,
    rescuePrice: 29000,
    discountPercentage: 61,
    pickupTime: '17:00 - 19:00',
    distance: '1.5km',
    stock: 5,
    icon: '🥗',
    description: 'Xà lách thuỷ canh giòn ngọt, ức gà áp chảo sốt mè rang, trứng luộc lòng đào và cà chua bi organic.',
  },
];

const INITIAL_ORDERS: CustomerOrder[] = [
  {
    id: 'ord-101',
    orderCode: 'GSF-8821',
    shopName: 'Bánh Mì Sài Gòn Bakery',
    items: [
      {
        product: INITIAL_DEALS[0],
        quantity: 1,
      },
    ],
    totalAmount: 25000,
    pickupTime: '18:30 - 20:00 hôm nay',
    pickupAddress: '42 Nguyễn Huệ, P. Bến Nghé, Quận 1',
    status: 'ready',
    createdAt: new Date().toISOString(),
  },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<CustomerTab>('home');
  const [deals] = useState<ProductDeal[]>(INITIAL_DEALS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>(INITIAL_ORDERS);
  const [selectedDeal, setSelectedDeal] = useState<ProductDeal | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  useEffect(() => {
    // Kiểm tra PWA standalone
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true) ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(standalone));
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        setShowIOSPrompt(true);
      } else {
        alert(
          '👉 Để cài đặt GoSavingFood:\n1. Bấm nút 3 chấm (⋮) trên trình duyệt.\n2. Chọn "Cài đặt ứng dụng" hoặc "Thêm vào Màn hình chính".'
        );
      }
    }
  };

  // Thêm vào giỏ hàng
  const handleAddToCart = (deal: ProductDeal) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === deal.id);
      if (existing) {
        if (existing.quantity >= deal.stock) {
          alert(`Rất tiếc, chỉ còn ${deal.stock} suất cho món này!`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === deal.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product: deal, quantity: 1 }];
    });
  };

  // Cập nhật số lượng
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  // Xóa khỏi giỏ
  const handleRemoveItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  // Đặt hàng từ giỏ
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    setTimeout(() => {
      const randomCode = `GSF-${Math.floor(1000 + Math.random() * 9000)}`;
      const total = cart.reduce(
        (sum, item) => sum + item.product.rescuePrice * item.quantity,
        0
      );
      const firstShop = cart[0].product.shopName;

      const newOrder: CustomerOrder = {
        id: `ord-${Date.now()}`,
        orderCode: randomCode,
        shopName: firstShop,
        items: [...cart],
        totalAmount: total,
        pickupTime: 'Hôm nay theo khung giờ từng món',
        pickupAddress: 'Địa chỉ cửa hàng trên hóa đơn',
        status: 'ready',
        createdAt: new Date().toISOString(),
      };

      setOrders((prev) => [newOrder, ...prev]);
      setCart([]);
      setIsCheckingOut(false);
      setActiveTab('orders');
    }, 600);
  };

  // Tổng số lượng món trong giỏ
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="customer-app-shell">
      {/* Header */}
      <AppHeader
        isStandalone={isStandalone}
        onInstallClick={handleInstallClick}
      />

      {/* Main Screen Content */}
      <main className="customer-main-content">
        {activeTab === 'home' && (
          <HomePage
            deals={deals}
            onAddToCart={handleAddToCart}
            onViewDetails={(deal) => setSelectedDeal(deal)}
          />
        )}

        {activeTab === 'cart' && (
          <CartPage
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            onGoHome={() => setActiveTab('home')}
            isCheckingOut={isCheckingOut}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersPage
            orders={orders}
            onGoHome={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePage
            isStandalone={isStandalone}
            onInstallClick={handleInstallClick}
          />
        )}
      </main>

      {/* Bottom Navigation với 4 mục chính */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        cartCount={totalCartCount}
      />

      {/* Dialog chi tiết suất ăn khi click vào */}
      {selectedDeal && (
        <Dialog
          isOpen={Boolean(selectedDeal)}
          onClose={() => setSelectedDeal(null)}
          title={selectedDeal.title}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <Button
                variant="outline"
                size="md"
                style={{ flex: 1 }}
                onClick={() => setSelectedDeal(null)}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                size="md"
                style={{ flex: 2 }}
                leftIcon={<Plus size={18} strokeWidth={2.5} />}
                onClick={() => {
                  handleAddToCart(selectedDeal);
                  setSelectedDeal(null);
                }}
              >
                Thêm vào giỏ ({selectedDeal.rescuePrice.toLocaleString('vi-VN')}đ)
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                fontSize: '48px',
                textAlign: 'center',
                backgroundColor: 'var(--color-primary-soft)',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              {selectedDeal.icon}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <Badge variant="offer">Giảm {selectedDeal.discountPercentage}%</Badge>
              <Badge variant="neutral">
                <MapPin size={12} /> {selectedDeal.distance}
              </Badge>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <strong>Quán:</strong> {selectedDeal.shopName}
            </p>

            <p style={{ fontSize: '14px', lineHeight: '20px', color: 'var(--color-text-primary)' }}>
              {selectedDeal.description}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <Clock size={16} strokeWidth={2} />
              <span>Khung giờ nhận: <strong>{selectedDeal.pickupTime}</strong></span>
            </div>
          </div>
        </Dialog>
      )}

      {/* Dialog hướng dẫn cài đặt iOS */}
      {showIOSPrompt && (
        <Dialog
          isOpen={showIOSPrompt}
          onClose={() => setShowIOSPrompt(false)}
          title="Cài đặt trên iPhone / iPad"
          footer={
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setShowIOSPrompt(false)}
            >
              Đã hiểu
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px', lineHeight: '22px' }}>
            <p>
              1. Bấm vào biểu tượng <strong>Chia sẻ (Share <Share2 size={14} style={{ display: 'inline' }} />)</strong> ở thanh dưới trình duyệt Safari.
            </p>
            <p>
              2. Cuộn xuống và chọn <strong>"Thêm vào Màn hình chính" (Add to Home Screen ➕)</strong>.
            </p>
            <p>
              3. Bấm <strong>"Thêm" (Add)</strong> ở góc trên bên phải để hoàn tất!
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
