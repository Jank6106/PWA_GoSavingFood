import { Badge } from '@gosavingfood/ui';
import type { OrderStatus } from '../types/customer.types';

const statusMeta: Record<OrderStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' }> = {
  pending: { label: 'Chờ xác nhận', variant: 'warning' },
  confirmed: { label: 'Đã xác nhận', variant: 'warning' },
  preparing: { label: 'Đang chuẩn bị', variant: 'warning' },
  ready_for_pickup: { label: 'Chờ lấy', variant: 'success' },
  completed: { label: 'Đã hoàn thành', variant: 'neutral' },
  cancelled: { label: 'Đã hủy', variant: 'error' },
};

export function OrderStatusBadge({ status, readyLabel }: { status: OrderStatus; readyLabel?: string }) {
  const meta = statusMeta[status];
  return <Badge variant={meta.variant}>{status === 'ready_for_pickup' && readyLabel ? readyLabel : meta.label}</Badge>;
}
