import { Bell, ChevronDown, MapPin } from 'lucide-react';

interface AppHeaderProps {
  location: string;
  unreadCount: number;
  onLocationClick: () => void;
  onNotificationClick: () => void;
}

export function AppHeader({
  location,
  unreadCount,
  onLocationClick,
  onNotificationClick,
}: AppHeaderProps) {
  return (
    <header className="customer-header">
      <div className="customer-brand">
        <div className="customer-logo" aria-hidden="true">🌱</div>
        <div>
          <div className="customer-brand-name">GoSavingFood</div>
          <button type="button" className="customer-location-trigger" onClick={onLocationClick}>
            <MapPin size={13} />
            <span>{location}</span>
            <ChevronDown size={13} />
          </button>
        </div>
      </div>
      <button type="button" className="customer-round-button" onClick={onNotificationClick} aria-label="Thông báo">
        <Bell size={21} />
        {unreadCount > 0 && <span className="customer-notification-count">{unreadCount}</span>}
      </button>
    </header>
  );
}
