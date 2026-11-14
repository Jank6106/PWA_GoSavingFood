import { useMemo, useState } from 'react';
import { ChevronRight, Clock3, MapPin } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { AuthRequiredState, OrderStatusBadge, PageHeading } from '../../../shared/components';
import type { Order } from '../../../shared/types/customer.types';

interface OrdersPageProps {
  orders: Order[];
  isAuthenticated: boolean;
  onLogin: () => void;
  onOpenOrder: (order: Order) => void;
}

type FilterId = 'all' | 'pending_payment' | 'pending' | 'preparing' | 'ready_for_pickup' | 'completed' | 'cancelled';

const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending_payment', label: 'Chờ thanh toán' },
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'preparing', label: 'Đang xử lý' },
  { id: 'ready_for_pickup', label: 'Chờ lấy' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
];

function formatPickupTimeDisplay(pickupTime?: string): string {
  if (!pickupTime) return '11:00 - 14:00';
  if (pickupTime.includes('T') || (pickupTime.includes('-') && pickupTime.includes(':'))) {
    try {
      const d = new Date(pickupTime);
      if (!isNaN(d.getTime())) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${hours}:${minutes} · ${day}/${month}`;
      }
    } catch {}
  }
  return pickupTime;
}

const matchesFilter = (order: Order, filterId: FilterId): boolean => {
  if (filterId === 'all') return true;
  if (filterId === 'pending_payment') {
    return order.status === 'pending_payment';
  }
  if (filterId === 'pending') {
    return order.status === 'paid' || order.status === 'pending';
  }
  if (filterId === 'preparing') {
    return order.status === 'preparing' || order.status === 'confirmed';
  }
  if (filterId === 'ready_for_pickup') {
    return order.status === 'ready_for_pickup';
  }
  if (filterId === 'completed') {
    return order.status === 'completed' || order.status === 'picked_up';
  }
  if (filterId === 'cancelled') {
    return order.status === 'cancelled' || order.status === 'expired';
  }
  return false;
};

export function OrdersPage({ orders, isAuthenticated, onLogin, onOpenOrder }: OrdersPageProps) {
  const [filter, setFilter] = useState<FilterId>('all');

  // Hiển thị đầy đủ đơn hàng của khách hàng (bao gồm đơn đang chờ thanh toán VietQR)
  const validOrders = useMemo(
    () => orders,
    [orders]
  );

  // 2. Tính toán số lượng đơn thực tế cho từng trạng thái từ danh sách đơn hợp lệ
  const tabCounts = useMemo(() => {
    const counts: Record<FilterId, number> = {
      all: 0,
      pending_payment: 0,
      pending: 0,
      preparing: 0,
      ready_for_pickup: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const order of validOrders) {
      if (matchesFilter(order, 'pending_payment')) counts.pending_payment++;
      else if (matchesFilter(order, 'pending')) counts.pending++;
      else if (matchesFilter(order, 'preparing')) counts.preparing++;
      else if (matchesFilter(order, 'ready_for_pickup')) counts.ready_for_pickup++;
      else if (matchesFilter(order, 'completed')) counts.completed++;
      else if (matchesFilter(order, 'cancelled')) counts.cancelled++;
    }
    return counts;
  }, [validOrders]);

  // 3. Danh sách đơn hiển thị theo tab hiện tại
  const visibleOrders = useMemo(
    () => validOrders.filter((order) => matchesFilter(order, filter)),
    [filter, validOrders]
  );

  if (!isAuthenticated) return <AuthRequiredState onLogin={onLogin} />;
  return (
    <div className="customer-screen">
      <PageHeading title="Đơn hàng" />
      <div className="customer-filter-tabs">
        {filters.map((item) => {
          const count = item.id !== 'all' ? tabCounts[item.id] : 0;
          return (
            <button
              type="button"
              key={item.id}
              className={filter === item.id ? 'is-active' : ''}
              onClick={() => setFilter(item.id)}
            >
              <span>{item.label}</span>
              {count > 0 && <span className="customer-tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>
      {!visibleOrders.length ? (
        <EmptyState title="Chưa có đơn phù hợp" />
      ) : (
        <div className="customer-orders-list">
          {visibleOrders.map((order) => {
            return (
              <button
                key={order.id}
                type="button"
                className="customer-order-card"
                onClick={() => onOpenOrder(order)}
              >
                <div className="customer-order-card-top">
                  <span>
                    <small>{order.orderCode}</small>
                    <strong>{order.merchantName}</strong>
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="customer-order-products">
                  {order.items.map((item) => (
                    <span key={item.bagId}>
                      {item.quantity}× {item.bagName}
                    </span>
                  ))}
                </div>
                <div className="customer-order-meta">
                  <span>
                    <Clock3 size={14} /> {formatPickupTimeDisplay(order.pickupTime)}
                  </span>
                  <span>
                    <MapPin size={14} /> {order.pickupAddress}
                  </span>
                </div>
                <div className="customer-order-card-bottom">
                  <span>
                    Tổng cộng <strong>{order.finalAmount.toLocaleString('vi-VN')}đ</strong>
                  </span>
                  <ChevronRight size={19} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
