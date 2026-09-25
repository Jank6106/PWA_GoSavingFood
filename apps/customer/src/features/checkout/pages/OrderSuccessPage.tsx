import { CheckCircle2, Clock3, MapPin } from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import type { Order } from '../../../shared/types/customer.types';

interface OrderSuccessPageProps { order: Order; onOrders: () => void; onHome: () => void; }

export function OrderSuccessPage({ order, onOrders, onHome }: OrderSuccessPageProps) {
  return <div className="customer-screen customer-success-screen"><CheckCircle2 size={62} /><h1>Đặt hàng thành công!</h1><p>Hãy đến đúng giờ và đưa mã nhận hàng cho cửa hàng.</p><section className="customer-ticket"><div><span>MÃ NHẬN HÀNG</span><strong>{order.orderCode}</strong></div><div className="customer-ticket-code">{order.orderCode.slice(-4)}</div><p><Clock3 size={17} /><span><small>Khung giờ nhận</small><strong>{order.pickupTime}</strong></span></p><p><MapPin size={17} /><span><small>Địa điểm</small><strong>{order.pickupAddress}</strong></span></p><footer><span>Tổng thanh toán</span><strong>{order.finalAmount.toLocaleString('vi-VN')}đ</strong></footer></section><Button fullWidth size="lg" onClick={onOrders}>Xem đơn hàng</Button><button type="button" onClick={onHome}>Về trang chủ</button></div>;
}
