import { Check, Copy } from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components';
import type { CheckoutDraft } from '../../../shared/types/customer.types';

interface PaymentPageProps { draft: CheckoutDraft; total: number; isSubmitting: boolean; onBack: () => void; onConfirm: () => void; }

export function PaymentPage({ draft, total, isSubmitting, onBack, onConfirm }: PaymentPageProps) {
  if (draft.paymentMethod === 'cash') return <div className="customer-screen"><ScreenHeader title="Xác nhận thanh toán" onBack={onBack} /><section className="customer-payment-card"><div className="customer-payment-icon">💵</div><h1>Thanh toán tại cửa hàng</h1><p>Bạn sẽ thanh toán <strong>{total.toLocaleString('vi-VN')}đ</strong> khi đến nhận món.</p><Button fullWidth size="lg" isLoading={isSubmitting} onClick={onConfirm}>Hoàn tất đặt hàng</Button></section></div>;
  return <div className="customer-screen"><ScreenHeader title="Thanh toán" subtitle={draft.paymentMethod === 'momo' ? 'Quét bằng ứng dụng MoMo' : 'Quét bằng ứng dụng ngân hàng'} onBack={onBack} /><section className="customer-payment-card"><div className="customer-qr-code" aria-label="Mã QR mô phỏng">{Array.from({ length: 64 }).map((_, index) => <i key={index} className={(index * 7 + index % 5) % 3 === 0 ? 'is-dark' : ''} />)}</div><h1>{total.toLocaleString('vi-VN')}đ</h1><p>Nội dung: <strong>GSF {draft.phone.slice(-4)}</strong></p><div className="customer-bank-info"><p><span>Ngân hàng</span><strong>MB Bank</strong></p><p><span>Số tài khoản</span><strong>0901234589 <Copy size={15} /></strong></p><p><span>Chủ tài khoản</span><strong>GO SAVING FOOD</strong></p></div><div className="customer-payment-note"><Check size={18} /><span>Đơn sẽ được xác nhận ngay sau khi thanh toán thành công.</span></div><Button fullWidth size="lg" isLoading={isSubmitting} onClick={onConfirm}>Tôi đã thanh toán</Button></section></div>;
}
