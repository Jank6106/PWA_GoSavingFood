import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Khi cuộn quá banner (khoảng 180px), kích hoạt header gốc
      setIsScrolled(window.scrollY > 180);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`customer-header ${isScrolled ? 'is-solid' : 'is-transparent'}`}>
      <div className="customer-brand">
        <div className="customer-logo" aria-hidden="true">
          <img src="/logo.svg" alt="GoSavingFood Logo" className="customer-logo-img" />
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
