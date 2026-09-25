import { Clock3, Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button, EmptyState } from '@gosavingfood/ui';
import type { CartItem } from '../../../shared/types/customer.types';

interface CartPageProps {
  items: CartItem[];
  isAuthenticated: boolean;
  original: number;
  subtotal: number;
  saved: number;
  onLogin: () => void;
  onExplore: () => void;
  onCheckout: () => void;
  onUpdate: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartPage(props: CartPageProps) {
  if (!props.isAuthenticated) {
    return <div className="customer-screen customer-gated-screen"><div className="customer-gated-icon">🛒</div><h1>Đăng nhập để xem giỏ hàng</h1><p>Giữ các túi bạn yêu thích và hoàn tất đặt hàng chỉ trong vài bước.</p><Button size="lg" onClick={props.onLogin}>Đăng nhập / Đăng ký</Button><button type="button" onClick={props.onExplore}>Tiếp tục khám phá</button></div>;
  }
  if (!props.items.length) {
    return <div className="customer-screen"><h1 className="customer-page-title">Giỏ hàng</h1><EmptyState title="Giỏ hàng trống" description="Khám phá các túi thực phẩm ngon đang chờ được giải cứu." action={<Button onClick={props.onExplore}>Khám phá ngay</Button>} /></div>;
  }
  return (
    <div className="customer-screen customer-cart-screen">
      <div className="customer-page-heading"><div><h1>Giỏ hàng</h1><p>Túi được giữ trong 15 phút</p></div><span><Clock3 size={15} /> 14:36</span></div>
      <div className="customer-cart-list">
        {props.items.map((item) => (
          <article key={item.bag.id} className="customer-cart-item">
            <img src={item.bag.imageUrl} alt="" />
            <div><small>{item.bag.merchantName}</small><h2>{item.bag.name}</h2><strong>{item.bag.discountPrice.toLocaleString('vi-VN')}đ</strong><span>{item.bag.pickupStart}–{item.bag.pickupEnd}</span></div>
            <button type="button" className="customer-remove-button" onClick={() => props.onRemove(item.bag.id)}><Trash2 size={17} /></button>
            <div className="customer-stepper"><button type="button" onClick={() => props.onUpdate(item.bag.id, item.quantity - 1)}><Minus size={15} /></button><strong>{item.quantity}</strong><button type="button" onClick={() => props.onUpdate(item.bag.id, item.quantity + 1)}><Plus size={15} /></button></div>
          </article>
        ))}
      </div>
      <section className="customer-order-summary"><h2>Tóm tắt</h2><p><span>Giá gốc</span><del>{props.original.toLocaleString('vi-VN')}đ</del></p><p className="is-saving"><span>Bạn tiết kiệm</span><strong>-{props.saved.toLocaleString('vi-VN')}đ</strong></p><p className="is-total"><span>Tạm tính</span><strong>{props.subtotal.toLocaleString('vi-VN')}đ</strong></p><div><ShieldCheck size={17} /><span>Chỉ thanh toán sau khi kiểm tra lại đơn</span></div><Button fullWidth size="lg" onClick={props.onCheckout}>Tiếp tục đặt hàng</Button></section>
    </div>
  );
}
