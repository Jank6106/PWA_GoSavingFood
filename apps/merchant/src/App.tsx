import { useState, useEffect } from 'react';
import './index.css';

interface ProductItem {
  id: number;
  title: string;
  originalPrice: number;
  rescuePrice: number;
  stock: number;
  pickupTime: string;
  active: boolean;
}

export default function App() {
  const [products, setProducts] = useState<ProductItem[]>([
    {
      id: 1,
      title: 'Túi Bí Mật Bánh Mì Tươi Cuối Ngày',
      originalPrice: 80000,
      rescuePrice: 25000,
      stock: 2,
      pickupTime: '18:30 - 20:00',
      active: true,
    },
    {
      id: 2,
      title: 'Khay Bánh Croissant bơ Pháp (Lẻ 3 chiếc)',
      originalPrice: 95000,
      rescuePrice: 35000,
      stock: 5,
      pickupTime: '19:00 - 20:30',
      active: true,
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        setShowIOSPrompt(true);
      } else {
        alert('👉 Trên trình duyệt điện thoại: Nhấn vào menu 3 chấm (⋮) và chọn "Cài đặt ứng dụng" hoặc "Thêm vào Màn hình chính" để tải App Cửa Hàng!');
      }
    }
  };

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newOrigPrice, setNewOrigPrice] = useState('');
  const [newRescuePrice, setNewRescuePrice] = useState('');
  const [newStock, setNewStock] = useState('3');
  const [newPickupTime, setNewPickupTime] = useState('18:00 - 20:00');

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newRescuePrice) return;

    const newItem: ProductItem = {
      id: Date.now(),
      title: newTitle,
      originalPrice: Number(newOrigPrice) || Number(newRescuePrice) * 3,
      rescuePrice: Number(newRescuePrice),
      stock: Number(newStock) || 1,
      pickupTime: newPickupTime,
      active: true,
    };

    setProducts([newItem, ...products]);
    setShowModal(false);
    setNewTitle('');
    setNewOrigPrice('');
    setNewRescuePrice('');
  };

  const handleVerifyCode = () => {
    if (!codeInput) return;
    setVerifyMessage(`✅ Đã xác nhận giao đơn [${codeInput.toUpperCase()}] thành công!`);
    setCodeInput('');
    setTimeout(() => setVerifyMessage(null), 4000);
  };

  return (
    <div className="app-root">
      {/* Header */}
      <header className="glass-header">
        <div className="header-container">
          <div className="logo-badge">
            <div className="logo-icon">🏪</div>
            <div>
              <h1 className="brand-title">Go Saving Food</h1>
              <span className="store-name">Bánh Mì Sài Gòn Bakery 🟢</span>
            </div>
          </div>
          <a
            href="http://localhost:3000"
            style={{
              fontSize: '12px',
              color: '#f59e0b',
              textDecoration: 'none',
              fontWeight: 600,
              background: 'rgba(245, 158, 11, 0.1)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            🏠 Hub Portal
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-content">
        {/* PWA Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(16, 185, 129, 0.1))',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', marginBottom: '2px' }}>
              {isInstalled ? '✅ Cửa Hàng Đã Cài Đặt PWA' : '📲 Quản Lý Bán Hàng PWA Ready'}
            </h4>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              {isInstalled ? 'Ứng dụng hoạt động toàn màn hình trên điện thoại' : 'Cài đặt app quản lý đơn hàng ngay trên màn hình chính'}
            </p>
          </div>
          {!isInstalled && (
            <button
              onClick={handleInstallPWA}
              style={{
                background: '#f59e0b',
                color: '#0f1420',
                fontWeight: 700,
                fontSize: '12px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Cài Đặt App 📲
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-val">680.000đ</div>
            <div className="stat-lbl">Doanh thu hôm nay</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color: '#10b981' }}>18 suất</div>
            <div className="stat-lbl">Đã giải cứu</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color: '#38bdf8' }}>14.5 kg</div>
            <div className="stat-lbl">CO2 Cắt Giảm</div>
          </div>
        </div>

        {/* Create Button */}
        <button className="create-btn" onClick={() => setShowModal(true)}>
          + Đăng Bán Suất Ăn Dư Thừa Mới (30s) 🚀
        </button>

        {/* Products List */}
        <div className="section-head">
          <h3 className="section-title">📦 Đang Đăng Bán Hôn Nay</h3>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{products.length} mặt hàng</span>
        </div>

        <div className="product-list">
          {products.map((p) => (
            <div className="product-item" key={p.id}>
              <div className="product-info">
                <h4>{p.title}</h4>
                <div className="product-meta">
                  <span>Giá giải cứu: <strong style={{ color: '#f59e0b' }}>{p.rescuePrice.toLocaleString('vi-VN')}đ</strong></span>
                  <span>| Số lượng: <strong>{p.stock} suất</strong></span>
                </div>
              </div>
              <span className="toggle-switch">Đang hiển thị PWA</span>
            </div>
          ))}
        </div>

        {/* Order Verification */}
        <div className="verify-box">
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            🔍 Quét / Xác Nhận Đơn Hàng Từ Khách
          </h4>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Nhập mã QR hoặc Mã xác nhận của khách hàng khi tới nhận đồ
          </p>

          <div className="verify-input-group">
            <input
              type="text"
              className="verify-input"
              placeholder="Ví dụ: GSF-8892"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
            />
            <button className="verify-submit-btn" onClick={handleVerifyCode}>
              Xác Nhận ⚡
            </button>
          </div>

          {verifyMessage && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
              {verifyMessage}
            </div>
          )}
        </div>
      </main>

      {/* Modal Add Product */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              ➕ Đăng Suất Ăn Dư Thừa Mới
            </h3>

            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label>Tên món ăn / Túi bí mật</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Túi Bí Mật Bánh Mì Tươi Cuối Ngày"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Giá gốc (VNĐ)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="80000"
                    value={newOrigPrice}
                    onChange={(e) => setNewOrigPrice(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Giá giải cứu (VNĐ)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="25000"
                    value={newRescuePrice}
                    onChange={(e) => setNewRescuePrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Số lượng bán</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Khung giờ nhận đồ</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newPickupTime}
                    onChange={(e) => setNewPickupTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={() => setShowModal(false)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="modal-submit">
                  Phát Hành Lên PWA 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Guide for iOS Safari */}
      {showIOSPrompt && (
        <div className="modal-overlay" onClick={() => setShowIOSPrompt(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📲</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
              Cài Đặt App Cửa Hàng Trên iPhone
            </h3>
            <div style={{ textAlign: 'left', fontSize: '13px', color: '#cbd5e1', marginTop: '14px', lineHeight: '1.6' }}>
              <p><strong>Bước 1:</strong> Bấm biểu tượng <strong>Chia sẻ (Share 📤)</strong> ở thanh dưới Safari.</p>
              <p style={{ marginTop: '8px' }}><strong>Bước 2:</strong> Cuộn xuống và chọn <strong>"Thêm vào MH chính" (Add to Home Screen ➕)</strong>.</p>
              <p style={{ marginTop: '8px' }}><strong>Bước 3:</strong> Bấm <strong>"Thêm" (Add)</strong> ở góc trên để cài đặt app quản lý đơn hàng.</p>
            </div>
            <button className="close-btn" onClick={() => setShowIOSPrompt(false)} style={{ width: '100%', marginTop: '16px', background: '#f59e0b', color: '#0f1420', fontWeight: 700 }}>
              Đã Hiểu 👍
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="nav-item active">
          <span style={{ fontSize: '18px' }}>📊</span>
          <span>Tổng Quan</span>
        </div>
        <div className="nav-item">
          <span style={{ fontSize: '18px' }}>➕</span>
          <span>Đăng Bài</span>
        </div>
        <div className="nav-item">
          <span style={{ fontSize: '18px' }}>🧾</span>
          <span>Đơn Hàng</span>
        </div>
        <div className="nav-item">
          <span style={{ fontSize: '18px' }}>⚙️</span>
          <span>Cài Đặt</span>
        </div>
      </nav>
    </div>
  );
}
