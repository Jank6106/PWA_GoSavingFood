import { Clock3, MapPin, MessageSquareText, QrCode, TriangleAlert } from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import {
  FormSection,
  InfoRow,
  OrderItemRow,
  OrderStatusBadge,
  OrderSummary,
  ScreenHeader,
} from '../../../shared/components';
import type { Order } from '../../../shared/types/customer.types';

interface OrderDetailPageProps {
  order: Order;
  onBack: () => void;
  onReview: () => void;
  onReport: () => void;
}

export function OrderDetailPage({ order, onBack, onReview, onReport }: OrderDetailPageProps) {
  const isReady = order.status === 'ready_for_pickup';
  return (
    <div className="customer-screen">
      <ScreenHeader title={order.orderCode} subtitle={order.merchantName} onBack={onBack} />
      <section className="customer-order-status-card">
        <OrderStatusBadge status={order.status} readyLabel="Sẵn sàng nhận món" />
        <h1>{isReady ? 'Hẹn gặp bạn tại cửa hàng!' : 'Cảm ơn bạn đã giải cứu món ngon'}</h1>
        <p>Nhớ kiểm tra khung giờ và mã nhận hàng trước khi đến.</p>
      </section>
      {isReady && <section className="customer-pickup-code"><QrCode size={34} /><span>Mã nhận hàng</span><strong>{order.orderCode}</strong></section>}
      <FormSection title="Chi tiết đơn">
        {order.items.map((item) => <OrderItemRow key={item.bagId} imageUrl={item.imageUrl} name={item.bagName} quantity={item.quantity} unitPrice={item.unitPrice} />)}
      </FormSection>
      <FormSection>
        <InfoRow icon={<Clock3 size={19} />} label="Khung giờ" value={order.pickupTime} />
        <InfoRow icon={<MapPin size={19} />} label="Địa chỉ" value={order.pickupAddress} />
      </FormSection>
      <OrderSummary rows={[{ label: 'Tổng thanh toán', value: `${order.finalAmount.toLocaleString('vi-VN')}đ`, tone: 'total' }]} />
      <div className="customer-secondary-actions">
        <Button variant="outline" onClick={onReview}><MessageSquareText size={18} /> Đánh giá</Button>
        <Button variant="ghost" onClick={onReport}><TriangleAlert size={18} /> Báo cáo sự cố</Button>
      </div>
    </div>
  );
}
