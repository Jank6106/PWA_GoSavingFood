import { Bell } from 'lucide-react';
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
}: AppHeaderProps) {
  const isImageAvatar = avatar && (avatar.startsWith('http') || avatar.startsWith('data:image/'));

  return (
    <header className="merchant-app-header">
      <div className="merchant-app-header-inner">
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
            <Bell size={19} />
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
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'contain', display: 'block' }}
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

