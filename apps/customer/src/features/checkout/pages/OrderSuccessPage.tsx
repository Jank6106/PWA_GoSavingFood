import { CheckCircle2, Clock3, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@gosavingfood/ui';
import type { Order } from '../../../shared/types/customer.types';

interface OrderSuccessPageProps {
  order: Order;
  onOrders: () => void;
  onHome: () => void;
}

export function OrderSuccessPage({ order, onOrders, onHome }: OrderSuccessPageProps) {
  const qrString = order.qrCode || order.orderCode;

  return (
    <div className="customer-screen customer-success-screen">
      <CheckCircle2 size={62} />
      <h1>Đặt hàng thành công!</h1>
      <p>Hãy đến đúng giờ và đưa mã nhận hàng hoặc QR cho cửa hàng quét.</p>

      <section className="customer-ticket">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '12px 0 16px' }}>
          <div style={{ background: '#ffffff', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <QRCodeSVG value={qrString} size={160} level="M" />
          </div>
          <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Mã QR nhận hàng tại quầy</span>
        </div>

        <div>
          <span>MÃ NHẬN HÀNG</span>
          <strong>{order.orderCode}</strong>
        </div>
        <p>
          <Clock3 size={17} />
          <span>
            <small>Khung giờ nhận</small>
            <strong>{order.pickupTime}</strong>
          </span>
        </p>
        <p>
          <MapPin size={17} />
          <span>
            <small>Địa điểm</small>
            <strong>{order.pickupAddress}</strong>
          </span>
        </p>
        <footer>
          <span>Tổng thanh toán</span>
          <strong>{order.finalAmount.toLocaleString('vi-VN')}đ</strong>
        </footer>
      </section>

      <Button fullWidth size="lg" onClick={onOrders}>
        Xem đơn hàng
      </Button>
      <button type="button" onClick={onHome}>
        Về trang chủ
      </button>
    </div>
  );
}
