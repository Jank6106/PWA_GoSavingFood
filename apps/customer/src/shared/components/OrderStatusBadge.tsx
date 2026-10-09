import { Badge } from '@gosavingfood/ui';
import type { OrderStatus } from '../types/customer.types';

const statusMeta: Record<string, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' | 'primary' }> = {
  pending_payment: { label: 'Chờ thanh toán', variant: 'warning' },
  pending: { label: 'Chờ xác nhận', variant: 'warning' },
  paid: { label: 'Chờ xác nhận', variant: 'warning' },
  preparing: { label: 'Đang xử lý', variant: 'primary' },
  confirmed: { label: 'Đang xử lý', variant: 'primary' },
  ready_for_pickup: { label: 'Chờ lấy', variant: 'success' },
  picked_up: { label: 'Hoàn thành', variant: 'neutral' },
  completed: { label: 'Hoàn thành', variant: 'neutral' },
  cancelled: { label: 'Đã hủy', variant: 'error' },
  expired: { label: 'Hết hạn', variant: 'error' },
};

export function OrderStatusBadge({ status, readyLabel }: { status: OrderStatus | string; readyLabel?: string }) {
  const meta = statusMeta[status] || { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant}>{status === 'ready_for_pickup' && readyLabel ? readyLabel : meta.label}</Badge>;
}
