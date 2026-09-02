import { useState, useEffect } from 'react';
import './index.css';

interface Deal {
  id: number;
  shopName: string;
  title: string;
  category: string;
  originalPrice: number;
  rescuePrice: number;
  discount: string;
  pickupTime: string;
  distance: string;
  stock: number;
  icon: string;
}

const mockDeals: Deal[] = [
  {
    id: 1,
    shopName: 'Bánh Mì Sài Gòn Bakery',
    title: 'Túi Bí Mật Bánh Mì Tươi Cuối Ngày',
    category: 'bag',
    originalPrice: 80000,
    rescuePrice: 25000,
    discount: '-68%',
    pickupTime: '18:30 - 20:00',
    distance: '400m',
    stock: 2,
    icon: '🥖',
  },
  {
    id: 2,
    shopName: 'Quán Cơm Mẹ Nấu',
    title: 'Combo Cơm Trưa Bento Thập Cẩm',
    category: 'rice',
    originalPrice: 65000,
    rescuePrice: 20000,
    discount: '-69%',
    pickupTime: '14:00 - 16:00',
    distance: '800m',
    stock: 4,
    icon: '🍱',
  },
  {
    id: 3,
    shopName: 'Le Petit Paris Cafe',
    title: 'Túi Bánh Ngọt French Pastry Vỏ Giòn',
    category: 'bakery',
    originalPrice: 120000,
    rescuePrice: 45000,
    discount: '-62%',
    pickupTime: '19:00 - 21:00',
    distance: '1.2km',
    stock: 1,
    icon: '🍰',
  },
  {
    id: 4,
    shopName: 'Healthy Green Bar',
    title: 'Salad Ức Gà & Trái Cây Tươi Mới',
    category: 'healthy',
    originalPrice: 75000,
    rescuePrice: 28000,
    discount: '-62%',
    pickupTime: '17:00 - 19:00',
    distance: '1.5km',
    stock: 5,
    icon: '🥗',
  },
];

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [orderSuccessCode, setOrderSuccessCode] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [userWantsWeb, setUserWantsWeb] = useState(false);
  const [isJustInstalled, setIsJustInstalled] = useState(false);

  useEffect(() => {
    // Kiểm tra xem ứng dụng có đang mở ở chế độ PWA Standalone (ngoài màn hình chính) hay không
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(standalone));
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsJustInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsJustInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        setShowIOSPrompt(true);
      } else {
        alert(
          '👉 Để tải App về máy:\n1. Bấm nút 3 chấm (⋮) trên góc trình duyệt.\n2. Chọn "Cài đặt ứng dụng" hoặc "Thêm vào Màn hình chính".'
        );
      }
    }
  };

  const filteredDeals =
    selectedCategory === 'all'
      ? mockDeals
      : mockDeals.filter((deal) => deal.category === selectedCategory);

  const handleOrder = (deal: Deal) => {
    setActiveDeal(deal);
    setOrderSuccessCode(`GSF-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // --- NẾU CHƯA MỞ QUA APP (HOẶC CHƯA CHỌN XEM DÙNG THỬ WEB) -> HIỆN TRANG TẢI APP ---
  if (!isStandalone && !userWantsWeb) {
    return (
      <div className="install-landing-container">
        {/* Header */}
        <header className="glass-header">
          <div className="header-container">
            <div className="logo-badge">
              <div className="logo-icon">🍏</div>
              <div>
                <h1 className="brand-title">Go Saving Food</h1>
                <span className="location-chip">Khách Hàng PWA</span>
              </div>
            </div>
            <a
              href="https://gsflandingpage.vercel.app"
              style={{
                fontSize: '12px',
                color: '#38bdf8',
                textDecoration: 'none',
                fontWeight: 600,
                background: 'rgba(56, 189, 248, 0.1)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              🏠 Landing Page
            </a>
          </div>
        </header>

        {/* Download Hero Section */}
        <main className="install-hero">
          <div className="app-preview-badge">
            <div className="big-app-icon">🍏</div>
            <div className="pulse-glow" />
          </div>

          <h2 className="install-title">
            Tải App <span className="highlight-text">Go Saving Food</span> Về Điện Thoại
          </h2>

          <p className="install-desc">
            Vui lòng cài đặt ứng dụng vào Màn hình chính (Home Screen) để trải nghiệm giao diện App mượt mà, thông báo nhận đồ ăn ngon giảm giá 80% tức thì!
          </p>

          {/* Banner thành công nếu vừa bấm install */}
          {isJustInstalled ? (
            <div className="installed-success-box">
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>🎉</div>
              <h4>Đã Cài Đặt Thành Công!</h4>
              <p>
                Hãy trở về Màn hình chính điện thoại và bấm vào biểu tượng <strong>Go Saving Food 🍏</strong> để trải nghiệm ứng dụng.
              </p>
            </div>
          ) : (
            <div className="cta-action-box">
              <button className="main-download-btn" onClick={handleInstallPWA}>
                📲 TẢI & CÀI ĐẶT APP NGAY
              </button>
              <p className="install-note">⚡ Không tốn bộ nhớ · Không cần qua App Store / CH Play</p>
            </div>
          )}

          {/* Hướng dẫn 3 bước */}
          <div className="steps-card">
            <h3 className="steps-heading">Hướng Dẫn Cài Đặt Trong 3 Bước</h3>

            <div className="step-item">
              <div className="step-num">1</div>
              <div className="step-info">
                <strong>Nhấn Nút "Tải & Cài Đặt App"</strong>
                <span>Bấm nút màu xanh ở trên để kích hoạt trình tải của thiết bị.</span>
              </div>
            </div>

            <div className="step-item">
              <div className="step-num">2</div>
              <div className="step-info">
                <strong>Xác Nhận Cài Đặt</strong>
                <span>Chọn "Cài đặt" hoặc "Thêm vào Màn hình chính" (Add to Home Screen).</span>
              </div>
            </div>

            <div className="step-item">
              <div className="step-num">3</div>
              <div className="step-info">
                <strong>Mở App Từ Màn Hình Chính</strong>
                <span>Tìm biểu tượng 🍏 <strong>Go Saving Food</strong> trên điện thoại để bắt đầu săn deal!</span>
              </div>
            </div>
          </div>

          {/* Nút dùng thử trên web */}
          <div className="web-fallback-section">
            <button className="web-fallback-btn" onClick={() => setUserWantsWeb(true)}>
              🌐 Tiếp tục xem trên trình duyệt Web (Không cài đặt) →
            </button>
          </div>
        </main>

        {/* Modal Guide for iOS Safari */}
        {showIOSPrompt && (
          <div className="modal-overlay" onClick={() => setShowIOSPrompt(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📲</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                Cài Đặt App Trên iPhone / iPad
              </h3>
              <div
                style={{
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#cbd5e1',
                  marginTop: '14px',
                  lineHeight: '1.6',
                }}
              >
                <p>
                  <strong>Bước 1:</strong> Bấm biểu tượng <strong>Chia sẻ (Share 📤)</strong> ở thanh dưới trình duyệt Safari.
                </p>
                <p style={{ marginTop: '8px' }}>
                  <strong>Bước 2:</strong> Cuộn xuống và chọn <strong>"Thêm vào MH chính" (Add to Home Screen ➕)</strong>.
                </p>
                <p style={{ marginTop: '8px' }}>
                  <strong>Bước 3:</strong> Bấm <strong>"Thêm" (Add)</strong> ở góc trên bên phải để hoàn tất!
                </p>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowIOSPrompt(false)}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  background: '#10b981',
                  color: '#0b1329',
                  fontWeight: 700,
                }}
              >
                Đã Hiểu 👍
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- KHI ĐÃ VÀO QUA APP (STANDALONE) HOẶC BẤM XEM DÙNG THỬ WEB -> HIỆN GIAO DIỆN APP CHÍNH ---
  return (
    <div className="app-root">
      {/* Header */}
      <header className="glass-header">
        <div className="header-container">
          <div className="logo-badge">
            <div className="logo-icon">🍏</div>
            <div>
              <h1 className="brand-title">Go Saving Food</h1>
              <span className="location-chip">📍 Quận 1, TP.HCM</span>
            </div>
          </div>
          {isStandalone ? (
            <span
              style={{
                fontSize: '11px',
                color: '#10b981',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.15)',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              📱 PWA Standalone Mode
            </span>
          ) : (
            <button
              onClick={() => setUserWantsWeb(false)}
              style={{
                fontSize: '11px',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                cursor: 'pointer',
              }}
            >
              📲 Trang Tải App
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="app-content">
        {/* Banner thông báo */}
        <div className="pwa-banner">
          <div className="pwa-info">
            <h4>{isStandalone ? '⚡ Ứng Dụng Đã Khởi Chạy Từ Màn Hình Chính' : '🌐 Xem Ở Chế Độ Web Preview'}</h4>
            <p>
              {isStandalone
                ? 'Bạn đang trải nghiệm giao diện PWA native tốc độ cao'
                : 'Cài đặt App ra Màn hình chính để nhận thông báo deal tốt nhất'}
            </p>
          </div>
          {!isStandalone && (
            <button className="install-btn" onClick={() => setUserWantsWeb(false)}>
              Tải App 📲
            </button>
          )}
        </div>

        {/* Filter Categories */}
        <div className="filter-scroll">
          <button
            className={`filter-chip ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            🔥 Tất Cả Deal
          </button>
          <button
            className={`filter-chip ${selectedCategory === 'bag' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('bag')}
          >
            🎒 Túi Mật Bí
          </button>
          <button
            className={`filter-chip ${selectedCategory === 'bakery' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('bakery')}
          >
            🥐 Tiệm Bánh
          </button>
          <button
            className={`filter-chip ${selectedCategory === 'rice' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('rice')}
          >
            🍱 Cơm Văn Phòng
          </button>
          <button
            className={`filter-chip ${selectedCategory === 'healthy' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('healthy')}
          >
            🥗 Healthy & Salad
          </button>
        </div>

        {/* Deal Cards */}
        <div className="deal-grid">
          {filteredDeals.map((deal) => (
            <div className="deal-card" key={deal.id}>
              <div className="deal-image-wrapper">
                <span>{deal.icon}</span>
                <span className="discount-badge">{deal.discount}</span>
                <span className="distance-badge">📍 {deal.distance}</span>
              </div>
              <div className="deal-body">
                <div>
                  <div className="shop-name">{deal.shopName}</div>
                  <h3 className="item-title">{deal.title}</h3>
                  <div className="pickup-time">
                    ⏰ Khung giờ nhận: <strong>{deal.pickupTime}</strong>
                  </div>
                </div>
                <div>
                  <div className="price-row">
                    <div>
                      <span className="original-price">
                        {deal.originalPrice.toLocaleString('vi-VN')}đ
                      </span>
                      <div className="rescue-price">
                        {deal.rescuePrice.toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                    <span className="stock-tag">Còn {deal.stock} suất</span>
                  </div>
                  <button className="order-btn" onClick={() => handleOrder(deal)}>
                    Đặt Suất Ăn 🛒
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal Confirm Order */}
      {activeDeal && orderSuccessCode && (
        <div className="modal-overlay" onClick={() => setActiveDeal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎉</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
              Đặt Suất Ăn Thành Công!
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {activeDeal.shopName}
            </p>

            <div className="qr-box">
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>{orderSuccessCode}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  Mã Xác Nhận PWA
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
              Khung giờ lấy: {activeDeal.pickupTime}
            </p>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Vui lòng đến cửa hàng đúng hẹn và đưa mã này cho thu ngân.
            </p>

            <button className="close-btn" onClick={() => setActiveDeal(null)}>
              Đóng Trực Tiếp
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="nav-item active">
          <span style={{ fontSize: '18px' }}>🏠</span>
          <span>Khám phá</span>
        </div>
        <div className="nav-item">
          <span style={{ fontSize: '18px' }}>🎒</span>
          <span>Túi Bí Mật</span>
        </div>
        <div className="nav-item">
          <span style={{ fontSize: '18px' }}>📄</span>
          <span>Đơn Hàng</span>
        </div>
        <div className="nav-item">
          <span style={{ fontSize: '18px' }}>👤</span>
          <span>Tài Khoản</span>
        </div>
      </nav>
    </div>
  );
}
