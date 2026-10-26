import { useEffect, useState } from 'react';
import { Bell, Compass, MapPin, ReceiptText, ShoppingBag, UserRound } from 'lucide-react';
import logoSvg from '../../assets/logo.svg';
import logoPng from '../../assets/logo.png';
import type { CustomerTab } from '../../shared/types/customer.types';

interface AppHeaderProps {
  location?: string;
  unreadCount: number;
  activeTab?: CustomerTab;
  cartCount?: number;
  ordersBadgeCount?: number;
  showOnMobile?: boolean;
  onTabChange?: (tab: CustomerTab) => void;
  onLocationClick?: () => void;
  onNotificationClick: () => void;
}

export function AppHeader({
  location,
  unreadCount,
  activeTab = 'home',
  cartCount = 0,
  ordersBadgeCount = 0,
  showOnMobile = true,
  onTabChange,
  onLocationClick,
  onNotificationClick,
}: AppHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`customer-header ${isScrolled ? 'is-solid' : 'is-transparent'} ${!showOnMobile ? 'hide-on-mobile' : ''}`}>
      {/* 1. Mobile Header (Hiển thị nguyên bản trên màn hình mobile) */}
      <div className="customer-header-inner customer-header-mobile">
        <div className="customer-brand" onClick={() => onTabChange?.('home')} style={{ cursor: 'pointer' }}>
          <div className="customer-logo" aria-hidden="true">
            <img
              src={logoSvg}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== logoPng) {
                  target.src = logoPng;
                }
              }}
              alt="GoSavingFood Logo"
              className="customer-logo-img"
            />
          </div>
          <div className="customer-brand-name">GoSavingFood</div>
        </div>
        <button
          type="button"
          className="customer-round-button"
          onClick={onNotificationClick}
          aria-label="Thông báo"
        >
          <Bell size={21} />
          {unreadCount > 0 && <span className="customer-notification-count">{unreadCount}</span>}
        </button>
      </div>

      {/* 2. Desktop Header (Bố cục chuẩn Shopee Web trên máy tính) */}
      <div className="customer-header-inner customer-header-desktop">
        <div className="customer-desktop-nav-left">
          <div className="customer-brand" onClick={() => onTabChange?.('home')} style={{ cursor: 'pointer' }}>
            <div className="customer-logo" aria-hidden="true">
              <img
                src={logoSvg}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== logoPng) {
                    target.src = logoPng;
                  }
                }}
                alt="GoSavingFood Logo"
                className="customer-logo-img"
              />
            </div>
            <div className="customer-brand-name">GoSavingFood</div>
          </div>

          {location && (
            <button
              type="button"
              className="customer-desktop-location-chip"
              onClick={onLocationClick}
              title="Thay đổi vị trí nhận đồ ăn"
            >
              <MapPin size={15} />
              <span className="customer-desktop-location-text">{location}</span>
            </button>
          )}
        </div>

        <nav className="customer-desktop-nav-links" aria-label="Điều hướng chính">
          <button
            type="button"
            className={`customer-desktop-nav-link ${activeTab === 'home' ? 'is-active' : ''}`}
            onClick={() => onTabChange?.('home')}
          >
            <Compass size={18} />
            <span>Khám phá</span>
          </button>

          <button
            type="button"
            className={`customer-desktop-nav-link ${activeTab === 'orders' ? 'is-active' : ''}`}
            onClick={() => onTabChange?.('orders')}
          >
            <ReceiptText size={18} />
            <span>Đơn hàng</span>
            {ordersBadgeCount > 0 && (
              <span className="customer-desktop-badge">{ordersBadgeCount}</span>
            )}
          </button>

          <button
            type="button"
            className="customer-desktop-nav-link"
            onClick={onNotificationClick}
          >
            <Bell size={18} />
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <span className="customer-desktop-badge">{unreadCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`customer-desktop-nav-link ${activeTab === 'cart' ? 'is-active' : ''}`}
            onClick={() => onTabChange?.('cart')}
          >
            <ShoppingBag size={18} />
            <span>Giỏ hàng</span>
            {cartCount > 0 && (
              <span className="customer-desktop-badge is-cart">{cartCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`customer-desktop-nav-link ${activeTab === 'profile' ? 'is-active' : ''}`}
            onClick={() => onTabChange?.('profile')}
          >
            <UserRound size={18} />
            <span>Cá nhân</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
