import { useMemo, useState } from 'react';
import { ChevronRight, Clock3, MapPin } from 'lucide-react';
import { Badge, Button, EmptyState } from '@gosavingfood/ui';
import type { Order, OrderStatus } from '../../../shared/types/customer.types';

interface OrdersPageProps {
  orders: Order[];
  isAuthenticated: boolean;
  onLogin: () => void;
  onOpenOrder: (order: Order) => void;
}

const filters: Array<{ id: 'all' | OrderStatus; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'ready_for_pickup', label: 'Chờ lấy' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
];

const statusMeta: Record<OrderStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' }> = {
  pending: { label: 'Chờ xác nhận', variant: 'warning' },
  confirmed: { label: 'Chờ xác nhận', variant: 'warning' },
  preparing: { label: 'Đang chuẩn bị', variant: 'warning' },
  ready_for_pickup: { label: 'Chờ lấy', variant: 'success' },
  completed: { label: 'Đã hoàn thành', variant: 'neutral' },
  cancelled: { label: 'Đã hủy', variant: 'error' },
};

export function OrdersPage({ orders, isAuthenticated, onLogin, onOpenOrder }: OrdersPageProps) {
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const visibleOrders = useMemo(() => orders.filter((order) => filter === 'all' || order.status === filter), [filter, orders]);
  if (!isAuthenticated) return <div className="customer-screen customer-gated-screen"><div className="customer-gated-icon">📦</div><h1>Theo dõi đơn hàng của bạn</h1><p>Đăng nhập để nhận cập nhật và xem mã lấy hàng.</p><Button size="lg" onClick={onLogin}>Đăng nhập ngay</Button></div>;
  return (
    <div className="customer-screen">
      <div className="customer-page-heading"><div><h1>Đơn hàng</h1><p>Theo dõi hành trình giải cứu món ngon</p></div></div>
      <div className="customer-filter-tabs">{filters.map((item) => <button type="button" key={item.id} className={filter === item.id ? 'is-active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
      {!visibleOrders.length ? <EmptyState title="Chưa có đơn phù hợp" description="Các đơn của bạn sẽ xuất hiện tại đây." /> : <div className="customer-orders-list">{visibleOrders.map((order) => {
        const status = statusMeta[order.status];
        return <button key={order.id} type="button" className="customer-order-card" onClick={() => onOpenOrder(order)}><div className="customer-order-card-top"><span><small>{order.orderCode}</small><strong>{order.merchantName}</strong></span><Badge variant={status.variant}>{status.label}</Badge></div><div className="customer-order-products">{order.items.map((item) => <span key={item.bagId}>{item.quantity}× {item.bagName}</span>)}</div><div className="customer-order-meta"><span><Clock3 size={14} /> {order.pickupTime}</span><span><MapPin size={14} /> {order.pickupAddress}</span></div><div className="customer-order-card-bottom"><span>Tổng cộng <strong>{order.finalAmount.toLocaleString('vi-VN')}đ</strong></span><ChevronRight size={19} /></div></button>;
      })}</div>}
    </div>
  );
}
