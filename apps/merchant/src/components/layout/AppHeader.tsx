import { QrCode } from 'lucide-react';
import type { TabRoute } from '../../types';
import { optimizeImageUrl } from '../../services/utils';
import logoSvg from '../../assets/logo.svg';
import logoPng from '../../assets/logo.png';

interface AppHeaderProps {
  storeName: string;
  title?: string;
  subtitle?: string;
  avatar?: string;
  isOpen: boolean;
  unreadCount: number;
  showStatusToggle?: boolean;
  onToggleStatus: () => void;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  activeRoute?: TabRoute;
  onNavigate?: (route: TabRoute) => void;
  orderBadge?: number;
  onOpenQR?: () => void;
}

export function AppHeader({
  storeName,
  title,
  subtitle,
  avatar,
  isOpen,
  unreadCount,
  showStatusToggle = true,
  onToggleStatus,
  onNotificationPress,
  onProfilePress,
  activeRoute = 'bags',
  onNavigate,
  orderBadge = 0,
  onOpenQR,
}: AppHeaderProps) {
  const isImageAvatar = avatar && (avatar.startsWith('http') || avatar.startsWith('data:image/'));

  return (
    <header className="merchant-app-header">
      {/* Mobile Header (Rendered on mobile < 768px) */}
      <div className="merchant-app-header-inner merchant-header-mobile">
        <div className="merchant-header-brand">
          <span>
            <img
              src={logoSvg}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== logoPng) {
                  target.src = logoPng;
                }
              }}
              alt="GoSavingFood Logo"
              className="merchant-header-logo-img"
            />
          </span>
          <div>
            <strong>{title ?? 'Merchant'}</strong>
            {subtitle && <small>{subtitle}</small>}
          </div>
        </div>
        <div className="merchant-header-actions">
          {showStatusToggle && (
            <button
              type="button"
              className={`merchant-store-status ${isOpen ? 'is-open' : 'is-closed'}`}
              onClick={onToggleStatus}
              title={`Cửa hàng đang ${isOpen ? 'Mở cửa' : 'Đóng cửa'}. Bấm để chuyển trạng thái.`}
            >
              <i />
              <span>Trạng thái:</span>
              <b>{isOpen ? 'Mở cửa' : 'Đóng cửa'}</b>
            </button>
          )}
          <button
            type="button"
            className="merchant-header-icon"
            aria-label="Thông báo"
            onClick={onNotificationPress}
            title="Xem thông báo đơn hàng"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unreadCount > 0 && <b>{unreadCount}</b>}
          </button>
          <button
            type="button"
            className="merchant-profile-button"
            aria-label="Mở trang cài đặt & hồ sơ"
            title="Cài đặt & Hồ sơ quán"
            onClick={onProfilePress}
          >
            {isImageAvatar ? (
              <img
                src={optimizeImageUrl(avatar, 120, 80)}
                alt={storeName}
                className="merchant-avatar-img"
              />
            ) : (
              avatar || storeName.slice(0, 2).toUpperCase() || 'GS'
            )}
          </button>
        </div>
      </div>

      {/* Desktop Header (Rendered on desktop >= 768px) */}
      <div className="merchant-app-header-inner merchant-header-desktop">
        {/* Brand: Logo & Title (Giữ nguyên như mobile) */}
        <div className="merchant-header-brand">
          <span>
            <img
              src={logoSvg}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== logoPng) {
                  target.src = logoPng;
                }
              }}
              alt="GoSavingFood Logo"
              className="merchant-header-logo-img"
            />
          </span>
          <div>
            <strong>{title ?? 'Merchant'}</strong>
            {subtitle && <small>{subtitle}</small>}
          </div>
        </div>

        {/* Center Desktop Navigation Tabs - Text-only, phông chữ trắng đồng bộ Customer App */}
        <nav className="merchant-desktop-nav-tabs" aria-label="Điều hướng chính">
          <button
            type="button"
            className={`merchant-desktop-nav-item ${activeRoute === 'bags' ? 'is-active' : ''}`}
            onClick={() => onNavigate?.('bags')}
          >
            <span>Túi hàng</span>
          </button>

          <button
            type="button"
            className={`merchant-desktop-nav-item ${activeRoute === 'orders' ? 'is-active' : ''}`}
            onClick={() => onNavigate?.('orders')}
          >
            <span>Đơn hàng</span>
            {orderBadge > 0 && <b className="merchant-desktop-nav-badge">{orderBadge}</b>}
          </button>

          <button
            type="button"
            className={`merchant-desktop-nav-item ${activeRoute === 'analytics' ? 'is-active' : ''}`}
            onClick={() => onNavigate?.('analytics')}
          >
            <span>Thống kê</span>
          </button>

          <button
            type="button"
            className="merchant-desktop-nav-item"
            onClick={onNotificationPress}
          >
            <span>Thông báo</span>
            {unreadCount > 0 && <b className="merchant-desktop-nav-badge">{unreadCount}</b>}
          </button>

          <button
            type="button"
            className={`merchant-desktop-nav-item ${activeRoute === 'settings' ? 'is-active' : ''}`}
            onClick={() => onNavigate?.('settings')}
          >
            <span>Cài đặt</span>
          </button>
        </nav>

        {/* Right Desktop Actions: Quét mã QR -> Trạng thái mở/đóng cửa -> Avatar */}
        <div className="merchant-header-actions merchant-desktop-actions">
          {onOpenQR && (
            <button
              type="button"
              className="merchant-desktop-qr-btn"
              onClick={onOpenQR}
              title="Quét mã QR đơn hàng"
            >
              <QrCode size={16} />
              <span>Quét mã QR</span>
            </button>
          )}

          {showStatusToggle && (
            <button
              type="button"
              className={`merchant-store-status merchant-store-status--desktop ${isOpen ? 'is-open' : 'is-closed'}`}
              onClick={onToggleStatus}
              title={`Cửa hàng đang ${isOpen ? 'Mở cửa' : 'Đóng cửa'}. Bấm để chuyển trạng thái.`}
            >
              <i />
              <span>Trạng thái:</span>
              <b>{isOpen ? 'Mở cửa' : 'Đóng cửa'}</b>
            </button>
          )}

          <button
            type="button"
            className="merchant-profile-button merchant-profile-button--desktop"
            aria-label="Mở trang cài đặt & hồ sơ"
            title={`${storeName} - Cài đặt & Hồ sơ`}
            onClick={onProfilePress}
          >
            {isImageAvatar ? (
              <img
                src={optimizeImageUrl(avatar, 120, 80)}
                alt={storeName}
                className="merchant-avatar-img"
              />
            ) : (
              avatar || storeName.slice(0, 2).toUpperCase() || 'GS'
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
