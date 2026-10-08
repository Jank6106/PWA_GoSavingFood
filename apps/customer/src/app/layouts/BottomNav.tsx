import { Compass, ReceiptText, ShoppingBag, UserRound } from 'lucide-react';
import type { CustomerTab } from '../../shared/types/customer.types';

interface BottomNavProps {
  activeTab: CustomerTab;
  cartCount: number;
  onTabChange: (tab: CustomerTab) => void;
}

const items = [
  { tab: 'home' as const, label: 'Khám phá', Icon: Compass },
  { tab: 'cart' as const, label: 'Giỏ hàng', Icon: ShoppingBag },
  { tab: 'orders' as const, label: 'Đơn hàng', Icon: ReceiptText },
  { tab: 'profile' as const, label: 'Cá nhân', Icon: UserRound },
];

export function BottomNav({ activeTab, cartCount, onTabChange }: BottomNavProps) {
  return (
    <nav className="customer-bottom-nav" aria-label="Điều hướng chính">
      <div className="customer-bottom-nav-inner">
        {items.map(({ tab, label, Icon }) => (
          <button
            type="button"
            key={tab}
            className={activeTab === tab ? 'is-active' : ''}
            onClick={() => onTabChange(tab)}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            <span className="customer-nav-icon">
              <Icon size={22} />
              {tab === 'cart' && cartCount > 0 && <span>{cartCount}</span>}
            </span>
            <small>{label}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}
