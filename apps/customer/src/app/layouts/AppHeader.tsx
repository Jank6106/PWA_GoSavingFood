import { useEffect, useRef, useState } from 'react';
import { Bell, Compass, MapPin, ReceiptText, ShoppingBag, UserRound } from 'lucide-react';
import logoSvg from '../../assets/logo.svg';
import logoPng from '../../assets/logo.png';
import { optimizeImageUrl } from '../../services/customer.service';
import type { CustomerTab, NotificationItem } from '../../shared/types/customer.types';

interface AppHeaderProps {
  location?: string;
  unreadCount: number;
  activeTab?: CustomerTab;
  activeNav?: string;
  cartCount?: number;
  ordersBadgeCount?: number;
  showOnMobile?: boolean;
  notifications?: NotificationItem[];
  onTabChange?: (tab: CustomerTab) => void;
  onLocationClick?: () => void;
  onNotificationClick: () => void;
  onSelectNotification?: (item: NotificationItem) => void;
}

export function AppHeader({
  location,
  unreadCount,
  activeTab = 'home',
  activeNav,
  cartCount = 0,
  ordersBadgeCount = 0,
  showOnMobile = true,
  notifications = [],
  onTabChange,
  onLocationClick,
  onNotificationClick,
  onSelectNotification,
}: AppHeaderProps) {
  const currentNav = activeNav || activeTab;
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isNotificationOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

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
            className={`customer-desktop-nav-link ${currentNav === 'home' ? 'is-active' : ''}`}
            onClick={() => onTabChange?.('home')}
          >
            <Compass size={18} />
            <span>Khám phá</span>
          </button>

          <button
            type="button"
            className={`customer-desktop-nav-link ${currentNav === 'orders' ? 'is-active' : ''}`}
            onClick={() => onTabChange?.('orders')}
          >
            <ReceiptText size={18} />
            <span>Đơn hàng</span>
            {ordersBadgeCount > 0 && (
              <span className="customer-desktop-badge">{ordersBadgeCount}</span>
            )}
          </button>

          <div className="customer-desktop-nav-notif-wrapper" ref={popoverRef}>
            <button
              type="button"
              className={`customer-desktop-nav-link ${isNotificationOpen || currentNav === 'notifications' ? 'is-active' : ''}`}
              onClick={() => setIsNotificationOpen((prev) => !prev)}
              aria-expanded={isNotificationOpen}
              aria-haspopup="dialog"
            >
              <Bell size={18} />
              <span>Thông báo</span>
              {unreadCount > 0 && (
                <span className="customer-desktop-badge">{unreadCount}</span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="customer-notification-popover" role="dialog" aria-label="Thông báo">
                <div className="customer-notification-popover-arrow" />
                <div className="customer-notification-popover-header">
                  <span>Thông Báo Mới Nhận</span>
                </div>

                <div className="customer-notification-popover-list">
                  {notifications && notifications.length > 0 ? (
                    notifications.slice(0, 5).map((item) => {
                      const hasOrder = Boolean(
                        item.data?.orderId ||
                        item.data?.order_id ||
                        item.data?.orderCode ||
                        item.data?.order_code ||
                        (item.body + ' ' + item.title).match(/GSF-[A-Z0-9-]{4,30}/i) ||
                        item.icon === 'order'
                      );
                      const hasBag = Boolean(item.data?.bagId || item.data?.bag_id);
                      const hasMerchant = Boolean(item.data?.merchantId || item.data?.merchant_id);
                      const hasTarget = hasOrder || hasBag || hasMerchant;

                      return (
                        <div
                          key={item.id}
                          className={`customer-notification-popover-item ${item.read ? 'is-read' : 'is-unread'} ${hasTarget ? 'is-clickable' : ''}`}
                          onClick={() => {
                            if (hasTarget) {
                              onSelectNotification?.(item);
                              setIsNotificationOpen(false);
                            }
                          }}
                        >
                          <div className={`customer-notification-popover-thumb ${item.imageUrl ? 'is-product' : 'is-logo'}`}>
                            <img
                              src={optimizeImageUrl(item.imageUrl, 100, 75) || logoSvg}
                              alt=""
                              className="customer-notification-thumb-img"
                              onError={(e) => {
                                if (e.currentTarget.src !== logoPng) {
                                  e.currentTarget.src = logoPng;
                                }
                              }}
                            />
                          </div>
                          <div className="customer-notification-popover-content">
                            <strong className="customer-notification-popover-title">
                              {item.title}
                            </strong>
                            <p className="customer-notification-popover-desc">
                              {item.body}
                            </p>
                            <small className="customer-notification-popover-time">
                              {item.time}
                            </small>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="customer-notification-popover-empty">
                      <span>Chưa có thông báo nào</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="customer-notification-popover-footer"
                  onClick={() => {
                    setIsNotificationOpen(false);
                    onNotificationClick();
                  }}
                >
                  Xem tất cả
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`customer-desktop-nav-link ${currentNav === 'cart' ? 'is-active' : ''}`}
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
            className={`customer-desktop-nav-link ${currentNav === 'profile' ? 'is-active' : ''}`}
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
