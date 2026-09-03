import React from 'react';
import { Home, ShoppingBag, ReceiptText, User } from 'lucide-react';
import type { CustomerTab } from '../../shared/types/customer.types';

interface BottomNavProps {
  activeTab: CustomerTab;
  onTabChange: (tab: CustomerTab) => void;
  cartCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  cartCount = 0,
}) => {
  const navItems: { tab: CustomerTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      tab: 'home',
      label: 'Trang chủ',
      icon: <Home size={22} strokeWidth={2} />,
    },
    {
      tab: 'cart',
      label: 'Giỏ hàng',
      icon: <ShoppingBag size={22} strokeWidth={2} />,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      tab: 'orders',
      label: 'Đơn hàng',
      icon: <ReceiptText size={22} strokeWidth={2} />,
    },
    {
      tab: 'profile',
      label: 'Cá nhân',
      icon: <User size={22} strokeWidth={2} />,
    },
  ];

  return (
    <nav className="customer-bottom-nav" aria-label="Thanh điều hướng chính">
      <div className="customer-bottom-nav-inner">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              className={`customer-nav-btn ${isActive ? 'customer-nav-btn--active' : ''}`}
              onClick={() => onTabChange(item.tab)}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="customer-nav-icon-wrap">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="customer-nav-badge" aria-label={`${item.badge} món`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="customer-nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
