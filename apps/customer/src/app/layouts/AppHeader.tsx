import { Bell, Leaf } from 'lucide-react';

interface AppHeaderProps {
  location?: string;
  unreadCount: number;
  onLocationClick?: () => void;
  onNotificationClick: () => void;
}

export function AppHeader({
  unreadCount,
  onNotificationClick,
}: AppHeaderProps) {
  return (
    <header className="customer-header">
      <div className="customer-brand">
        <div className="customer-logo" aria-hidden="true">
          <Leaf size={22} strokeWidth={2.4} />
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
    </header>
  );
}
