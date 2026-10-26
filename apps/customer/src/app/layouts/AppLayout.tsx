import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import type { CustomerTab, NotificationItem } from '../../shared/types/customer.types';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: CustomerTab;
  cartCount: number;
  ordersBadgeCount?: number;
  location: string;
  unreadCount: number;
  showHeader?: boolean;
  showBottomNav?: boolean;
  notifications?: NotificationItem[];
  onTabChange: (tab: CustomerTab) => void;
  onLocationClick: () => void;
  onNotificationClick: () => void;
  onSelectNotification?: (item: NotificationItem) => void;
}

export function AppLayout({
  children,
  activeTab,
  cartCount,
  ordersBadgeCount = 0,
  location,
  unreadCount,
  showHeader = true,
  showBottomNav = true,
  notifications,
  onTabChange,
  onLocationClick,
  onNotificationClick,
  onSelectNotification,
}: AppLayoutProps) {
  return (
    <div className="customer-app-shell">
      <AppHeader
        location={location}
        unreadCount={unreadCount}
        activeTab={activeTab}
        cartCount={cartCount}
        ordersBadgeCount={ordersBadgeCount}
        showOnMobile={showHeader}
        notifications={notifications}
        onTabChange={onTabChange}
        onLocationClick={onLocationClick}
        onNotificationClick={onNotificationClick}
        onSelectNotification={onSelectNotification}
      />
      <main className={showBottomNav ? 'customer-main-content has-navigation' : 'customer-main-content'}>
        {children}
      </main>
      {showBottomNav && (
        <BottomNav
          activeTab={activeTab}
          cartCount={cartCount}
          ordersBadgeCount={ordersBadgeCount}
          onTabChange={onTabChange}
        />
      )}
    </div>
  );
}
