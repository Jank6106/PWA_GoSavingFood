import { Clock3, MapPin, MessageSquareText, TriangleAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
      <section className="customer-pickup-code" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <QRCodeSVG value={order.qrCode || order.orderCode} size={150} level="M" />
        </div>
        <span>Mã nhận hàng: <strong>{order.orderCode}</strong></span>
      </section>
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
