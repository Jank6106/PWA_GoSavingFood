import { Bell } from 'lucide-react';

interface AppHeaderProps {
  storeName: string;
  title?: string;
  subtitle?: string;
  isOpen: boolean;
  unreadCount: number;
  showStatusToggle?: boolean;
  onToggleStatus: () => void;
  onNotificationPress: () => void;
  onProfilePress: () => void;
}

export function AppHeader({ storeName, title, subtitle, isOpen, unreadCount, showStatusToggle = true, onToggleStatus, onNotificationPress, onProfilePress }: AppHeaderProps) {
  return <header className="merchant-app-header"><div className="merchant-app-header-inner"><div className="merchant-header-brand"><span><img src="/logo.svg" alt="GoSavingFood Logo" className="merchant-header-logo-img" /></span><div><strong>{title ?? storeName}</strong>{subtitle && <small>{subtitle}</small>}</div></div><div className="merchant-header-actions">{showStatusToggle && <button type="button" className={`merchant-store-status ${isOpen ? 'is-open' : 'is-closed'}`} onClick={onToggleStatus}><i /><span>Trạng thái:</span><b>{isOpen ? 'Mở cửa' : 'Đóng cửa'}</b></button>}<button type="button" className="merchant-header-icon" aria-label="Thông báo" onClick={onNotificationPress}><Bell size={19} />{unreadCount > 0 && <b>{unreadCount}</b>}</button><button type="button" className="merchant-profile-button" aria-label="Mở trang cá nhân" onClick={onProfilePress}>GS</button></div></div></header>;
}
