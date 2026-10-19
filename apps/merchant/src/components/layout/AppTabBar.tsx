import { BarChart3, FileText, Settings, ShoppingBag } from 'lucide-react';
import type { TabRoute } from '../../types';

const tabs: Array<{ key: TabRoute; label: string; icon: typeof ShoppingBag }> = [
  { key: 'bags', label: 'Túi hàng', icon: ShoppingBag },
  { key: 'orders', label: 'Đơn hàng', icon: FileText },
  { key: 'analytics', label: 'Thống kê', icon: BarChart3 },
  { key: 'settings', label: 'Cài đặt', icon: Settings },
];

export function AppTabBar({ active, orderBadge, onNavigate }: { active: TabRoute; orderBadge: number; onNavigate: (route: TabRoute) => void }) {
  return <nav className="merchant-tab-bar"><div>{tabs.map(({ key, label, icon: Icon }) => <button type="button" key={key} className={active === key ? 'is-active' : ''} onClick={() => onNavigate(key)}><span><Icon size={20} />{key === 'orders' && orderBadge > 0 && <b>{orderBadge}</b>}</span><small>{label}</small></button>)}</div></nav>;
}

