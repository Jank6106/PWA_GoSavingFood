import { useState } from 'react';
import { Clock3, MapPin, TicketPercent } from 'lucide-react';
import { Button, Input } from '@gosavingfood/ui';
import {
  FormSection,
  InfoRow,
  OrderItemRow,
  OrderSummary,
  ScreenHeader,
} from '../../../shared/components';
import type { CartItem, CheckoutDraft, PaymentMethod, User, Voucher } from '../../../shared/types/customer.types';

interface CheckoutPageProps {
  items: CartItem[];
  subtotal: number;
  user: User;
  vouchers: Voucher[];
  onBack: () => void;
  onContinue: (draft: CheckoutDraft) => void;
}

const paymentMethods: Array<{ id: PaymentMethod; icon: string; label: string }> = [
  { id: 'banking', icon: '🏦', label: 'Chuyển khoản' },
  { id: 'momo', icon: '🩷', label: 'Ví MoMo' },
  { id: 'cash', icon: '💵', label: 'Tại cửa hàng' },
];

export function CheckoutPage({ items, subtotal, user, vouchers, onBack, onContinue }: CheckoutPageProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [pickupTime, setPickupTime] = useState(`${items[0]?.bag.pickupStart ?? '18:00'} - ${items[0]?.bag.pickupEnd ?? '20:00'}`);
  const [voucherCode, setVoucherCode] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('banking');
  const voucher = vouchers.find((item) => item.code === voucherCode.trim().toUpperCase() && item.isActive && subtotal >= item.minOrderValue);
  const discountAmount = voucher?.discountValue ?? 0;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <div className="customer-screen customer-checkout-screen">
      <ScreenHeader title="Xác nhận đơn hàng" subtitle="Kiểm tra thông tin trước khi thanh toán" onBack={onBack} />

      <FormSection title="Thông tin khách hàng">
        <Input label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} />
        <Input label="Số điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" />
      </FormSection>

      <FormSection title="Thông tin nhận hàng">
        <InfoRow icon={<MapPin size={19} />} label="Địa điểm" value={items[0]?.bag.merchantName} />
        <label className="customer-field-label">
          <span>Khung giờ nhận</span>
          <span className="customer-select-wrap">
            <Clock3 size={18} />
            <select value={pickupTime} onChange={(event) => setPickupTime(event.target.value)}>
              <option>{items[0]?.bag.pickupStart} - {items[0]?.bag.pickupEnd}</option>
              <option>19:30 - 20:30</option>
              <option>20:00 - 21:00</option>
            </select>
          </span>
        </label>
      </FormSection>

      <FormSection title="Đơn hàng">
        {items.map((item) => (
          <OrderItemRow key={item.bag.id} imageUrl={item.bag.imageUrl} name={item.bag.name} quantity={item.quantity} unitPrice={item.bag.discountPrice} />
        ))}
      </FormSection>

      <FormSection title="Khuyến mãi">
        <div className="customer-voucher-input">
          <TicketPercent size={19} />
          <input value={voucherCode} onChange={(event) => setVoucherCode(event.target.value)} placeholder="Nhập mã voucher" />
          <span>{voucher ? 'Đã áp dụng' : ''}</span>
        </div>
        {vouchers.map((item) => (
          <button type="button" className="customer-voucher-suggestion" key={item.id} onClick={() => setVoucherCode(item.code)}>
            <strong>{item.code}</strong><span>{item.description}</span>
          </button>
        ))}
      </FormSection>

      <FormSection title="Phương thức thanh toán">
        <div className="customer-payment-options">
          {paymentMethods.map((method) => (
            <button type="button" key={method.id} className={paymentMethod === method.id ? 'is-selected' : ''} onClick={() => setPaymentMethod(method.id)}>
              <span>{method.icon}</span><strong>{method.label}</strong>
            </button>
          ))}
        </div>
        <label className="customer-field-label">
          <span>Ghi chú cho cửa hàng</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: Không lấy dụng cụ dùng một lần" />
        </label>
      </FormSection>

      <OrderSummary
        rows={[
          { label: 'Tạm tính', value: `${subtotal.toLocaleString('vi-VN')}đ` },
          { label: 'Khuyến mãi', value: `-${discountAmount.toLocaleString('vi-VN')}đ`, tone: 'saving' },
          { label: 'Tổng thanh toán', value: `${total.toLocaleString('vi-VN')}đ`, tone: 'total' },
        ]}
        action={
          <Button fullWidth size="lg" disabled={!name.trim() || !phone.trim()} onClick={() => onContinue({ customerName: name, phone, pickupTime, voucherCode: voucher?.code, discountAmount, note, paymentMethod })}>
            Tiếp tục thanh toán
          </Button>
        }
      />
    </div>
  );
}
