import { Clock3, ShieldCheck, Trash2 } from 'lucide-react';
import { Button, EmptyState } from '@gosavingfood/ui';
import { AuthRequiredState, OrderSummary, PageHeading, QuantityStepper } from '../../../shared/components';
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
    return <AuthRequiredState icon="🛒" title="Đăng nhập để xem giỏ hàng" description="Giữ các túi bạn yêu thích và hoàn tất đặt hàng chỉ trong vài bước." secondaryLabel="Tiếp tục khám phá" onLogin={props.onLogin} onSecondary={props.onExplore} />;
  }
  if (!props.items.length) {
    return <div className="customer-screen"><h1 className="customer-page-title">Giỏ hàng</h1><EmptyState title="Giỏ hàng trống" description="Khám phá các túi thực phẩm ngon đang chờ được giải cứu." action={<Button onClick={props.onExplore}>Khám phá ngay</Button>} /></div>;
  }
  return (
    <div className="customer-screen customer-cart-screen">
      <PageHeading title="Giỏ hàng" subtitle="Túi được giữ trong 15 phút" action={<span><Clock3 size={15} /> 14:36</span>} />
      <div className="customer-cart-list">
        {props.items.map((item) => (
          <article key={item.bag.id} className="customer-cart-item">
            <img src={item.bag.imageUrl} alt="" />
            <div><small>{item.bag.merchantName}</small><h2>{item.bag.name}</h2><strong>{item.bag.discountPrice.toLocaleString('vi-VN')}đ</strong><span>{item.bag.pickupStart}–{item.bag.pickupEnd}</span></div>
            <button type="button" className="customer-remove-button" onClick={() => props.onRemove(item.bag.id)}><Trash2 size={17} /></button>
            <QuantityStepper value={item.quantity} max={Math.min(item.bag.quantity, item.bag.maxQuantity)} onChange={(quantity) => props.onUpdate(item.bag.id, quantity)} />
          </article>
        ))}
      </div>
      <OrderSummary
        title="Tóm tắt"
        rows={[
          { label: 'Giá gốc', value: <del>{props.original.toLocaleString('vi-VN')}đ</del> },
          { label: 'Bạn tiết kiệm', value: `-${props.saved.toLocaleString('vi-VN')}đ`, tone: 'saving' },
          { label: 'Tạm tính', value: `${props.subtotal.toLocaleString('vi-VN')}đ`, tone: 'total' },
        ]}
        note={<><ShieldCheck size={17} /><span>Chỉ thanh toán sau khi kiểm tra lại đơn</span></>}
        action={<Button fullWidth size="lg" onClick={props.onCheckout}>Tiếp tục đặt hàng</Button>}
      />
    </div>
  );
}
