import { useMemo, useState } from 'react';
import { ChevronRight, Clock3, MapPin } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { AuthRequiredState, OrderStatusBadge, PageHeading } from '../../../shared/components';
import type { Order, OrderStatus } from '../../../shared/types/customer.types';

interface OrdersPageProps {
  orders: Order[];
  isAuthenticated: boolean;
  onLogin: () => void;
  onOpenOrder: (order: Order) => void;
}

const filters: Array<{ id: 'all' | OrderStatus; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Đang xử lý' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'ready_for_pickup', label: 'Chờ lấy' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
];

export function OrdersPage({ orders, isAuthenticated, onLogin, onOpenOrder }: OrdersPageProps) {
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (filter === 'all') return true;
        if (filter === 'pending') {
          return order.status === 'pending';
        }
        if (filter === 'confirmed') {
          return order.status === 'confirmed' || order.status === 'preparing';
        }
        if (filter === 'ready_for_pickup') {
          return order.status === 'ready_for_pickup';
        }
        if (filter === 'completed') {
          return order.status === 'completed' || order.status === 'picked_up';
        }
        return order.status === filter;
      }),
    [filter, orders]
  );
  if (!isAuthenticated) return <AuthRequiredState onLogin={onLogin} />;
  return (
    <div className="customer-screen">
      <PageHeading title="Đơn hàng" />
      <div className="customer-filter-tabs">{filters.map((item) => <button type="button" key={item.id} className={filter === item.id ? 'is-active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
      {!visibleOrders.length ? <EmptyState title="Chưa có đơn phù hợp" description="Các đơn của bạn sẽ xuất hiện tại đây." /> : <div className="customer-orders-list">{visibleOrders.map((order) => {
        return <button key={order.id} type="button" className="customer-order-card" onClick={() => onOpenOrder(order)}><div className="customer-order-card-top"><span><small>{order.orderCode}</small><strong>{order.merchantName}</strong></span><OrderStatusBadge status={order.status} /></div><div className="customer-order-products">{order.items.map((item) => <span key={item.bagId}>{item.quantity}× {item.bagName}</span>)}</div><div className="customer-order-meta"><span><Clock3 size={14} /> {order.pickupTime}</span><span><MapPin size={14} /> {order.pickupAddress}</span></div><div className="customer-order-card-bottom"><span>Tổng cộng <strong>{order.finalAmount.toLocaleString('vi-VN')}đ</strong></span><ChevronRight size={19} /></div></button>;
      })}</div>}
    </div>
  );
}
