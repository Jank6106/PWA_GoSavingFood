import { Clock3, MapPin, Phone, Star } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components/ScreenHeader';
import { ProductCard } from '../../home/components/ProductCard';
import type { Merchant, SurpriseBag } from '../../../shared/types/customer.types';

interface MerchantDetailPageProps {
  merchant: Merchant | null;
  bags: SurpriseBag[];
  onBack: () => void;
  onOpenBag: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => void;
}

export function MerchantDetailPage({ merchant, bags, onBack, onOpenBag, onAdd }: MerchantDetailPageProps) {
  if (!merchant) return <div className="customer-screen"><ScreenHeader title="Cửa hàng" onBack={onBack} /><EmptyState title="Không tìm thấy cửa hàng" /></div>;
  return <div className="customer-detail-screen"><section className="customer-merchant-hero" style={{ background: merchant.banner }}><ScreenHeader title="Cửa hàng" onBack={onBack} /><div><span>{merchant.logo}</span><h1>{merchant.name}</h1><p>{merchant.description}</p><div><strong><Star size={15} fill="currentColor" /> {merchant.rating}</strong><strong>{merchant.distance.toLocaleString('vi-VN')} km</strong><strong>{bags.length} túi</strong></div></div></section><div className="customer-detail-content"><div className="customer-store-facts"><span><MapPin size={17} /> {merchant.address}</span><span><Clock3 size={17} /> {merchant.openingHours}</span><span><Phone size={17} /> {merchant.phone}</span></div><div className="customer-section-heading"><div><span>🎁</span><div><h2>Túi đang bán</h2><p>Nhận trực tiếp tại cửa hàng</p></div></div></div>{bags.length ? <div className="customer-bag-grid">{bags.map((bag) => <ProductCard key={bag.id} bag={bag} onOpen={onOpenBag} onAdd={onAdd} />)}</div> : <EmptyState title="Chưa có túi hôm nay" />}</div></div>;
}
