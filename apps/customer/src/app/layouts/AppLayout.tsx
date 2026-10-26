import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import type { CustomerTab } from '../../shared/types/customer.types';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: CustomerTab;
  cartCount: number;
  ordersBadgeCount?: number;
  location: string;
  unreadCount: number;
  showHeader?: boolean;
  showBottomNav?: boolean;
  onTabChange: (tab: CustomerTab) => void;
  onLocationClick: () => void;
  onNotificationClick: () => void;
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
  onTabChange,
  onLocationClick,
  onNotificationClick,
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
        onTabChange={onTabChange}
        onLocationClick={onLocationClick}
        onNotificationClick={onNotificationClick}
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
