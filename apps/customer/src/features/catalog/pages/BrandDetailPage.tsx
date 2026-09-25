import { MapPin, Star } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components/ScreenHeader';
import type { Brand, Merchant } from '../../../shared/types/customer.types';

interface BrandDetailPageProps { brand: Brand | null; stores: Merchant[]; onBack: () => void; onOpenMerchant: (merchant: Merchant) => void; }

export function BrandDetailPage({ brand, stores, onBack, onOpenMerchant }: BrandDetailPageProps) {
  if (!brand) return <div className="customer-screen"><ScreenHeader title="Thương hiệu" onBack={onBack} /><EmptyState title="Không tìm thấy thương hiệu" /></div>;
  return <div className="customer-screen"><ScreenHeader title="Thương hiệu" onBack={onBack} /><section className="customer-brand-hero"><div className="customer-brand-logo-large">{brand.logo}</div><div><h1>{brand.name}</h1><p>{brand.description}</p><span><Star size={15} fill="currentColor" /> {brand.rating} · {brand.totalStores} cửa hàng</span></div></section><div className="customer-sustainability-banner"><span>🌿</span><div><strong>Cùng {brand.name} giảm lãng phí</strong><p>{brand.sustainabilityMessage}</p></div></div><div className="customer-section-heading"><div><span>📍</span><div><h2>Cửa hàng gần bạn</h2><p>Sắp xếp theo khoảng cách</p></div></div></div><div className="customer-merchant-list">{stores.map((store) => <button type="button" key={store.id} className="customer-merchant-card" onClick={() => onOpenMerchant(store)}><span className="customer-merchant-logo">{store.logo}</span><span><strong>{store.name}</strong><small><MapPin size={12} /> {store.address}</small><em>{store.isOpen ? 'Đang mở' : 'Đã đóng'} · {store.distance.toLocaleString('vi-VN')} km</em></span></button>)}</div></div>;
}
