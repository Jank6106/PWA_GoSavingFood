import { useEffect, useMemo, useState } from 'react';
import { Clock3, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import { Badge, Button, Dialog, EmptyState } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components/ScreenHeader';
import type { Merchant, SurpriseBag } from '../../../shared/types/customer.types';

interface BagDetailPageProps {
  bag: SurpriseBag | null;
  merchant: Merchant | null;
  onBack: () => void;
  onMerchant: () => void;
  onAdd: (bag: SurpriseBag, quantity: number) => void;
  onBuyNow: (bag: SurpriseBag, quantity: number) => void;
}

export function BagDetailPage({ bag, merchant, onBack, onMerchant, onAdd, onBuyNow }: BagDetailPageProps) {
  const [quantity, setQuantity] = useState(1);
  const [isQuantityOpen, setIsQuantityOpen] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const countdown = useMemo(() => {
    if (!bag || now === 0) return '--:--:--';
    const remaining = Math.max(0, new Date(bag.expiresAt).getTime() - now);
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }, [bag, now]);
  if (!bag) return <div className="customer-screen"><ScreenHeader title="Chi tiết túi" onBack={onBack} /><EmptyState title="Không tìm thấy túi" /></div>;
  const discount = Math.round((1 - bag.discountPrice / bag.originalPrice) * 100);
  return (
    <div className="customer-detail-screen">
      <div className="customer-detail-hero"><img src={bag.imageUrl} alt={bag.name} /><div className="customer-detail-header"><ScreenHeader title="Chi tiết túi" onBack={onBack} /></div><Badge variant="error">Giảm {discount}%</Badge></div>
      <div className="customer-detail-content">
        <div className="customer-detail-title"><div><span>{bag.merchantName}</span><h1>{bag.name}</h1></div><div className="customer-detail-price"><del>{bag.originalPrice.toLocaleString('vi-VN')}đ</del><strong>{bag.discountPrice.toLocaleString('vi-VN')}đ</strong></div></div>
        <div className="customer-countdown"><Clock3 size={20} /><span>Hết hạn sau</span><strong>{countdown}</strong></div>
        {merchant && <button type="button" className="customer-merchant-profile" onClick={onMerchant}><span>{merchant.logo}</span><div><strong>{merchant.name}</strong><small><Star size={13} fill="currentColor" /> {merchant.rating} · {merchant.distance.toLocaleString('vi-VN')} km</small></div><em>Xem shop</em></button>}
        <section className="customer-copy-section"><h2>Trong túi có gì?</h2><p>{bag.description}</p><div className="customer-pickup-box"><span>Khung giờ nhận</span><strong>{bag.pickupStart} – {bag.pickupEnd}</strong><small>Vui lòng đến đúng giờ để món ăn vẫn ngon nhất.</small></div></section>
        <section className="customer-review-card"><div><span className="customer-review-avatar">L</span><div><strong>Linh Nguyễn</strong><span>★★★★★</span></div><small>2 ngày trước</small></div><p>Đồ ăn vẫn rất tươi và phần nhận được nhiều hơn mình mong đợi. Sẽ quay lại!</p></section>
      </div>
      <div className="customer-detail-actions"><Button variant="outline" size="lg" onClick={() => setIsQuantityOpen(true)}><ShoppingBag size={19} /> Thêm vào giỏ</Button><Button size="lg" onClick={() => onBuyNow(bag, 1)}>Mua ngay</Button></div>
      <Dialog isOpen={isQuantityOpen} onClose={() => setIsQuantityOpen(false)} title="Chọn số lượng" footer={<Button fullWidth size="lg" onClick={() => { onAdd(bag, quantity); setIsQuantityOpen(false); }}>Thêm {quantity} túi · {(bag.discountPrice * quantity).toLocaleString('vi-VN')}đ</Button>}><div className="customer-quantity-modal"><img src={bag.imageUrl} alt="" /><div><strong>{bag.name}</strong><small>Tối đa {Math.min(bag.quantity, bag.maxQuantity)} túi</small></div><div className="customer-stepper"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={17} /></button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity(Math.min(bag.quantity, bag.maxQuantity, quantity + 1))}><Plus size={17} /></button></div></div></Dialog>
    </div>
  );
}
