import { useMemo, useState } from 'react';
import { MapPin, SlidersHorizontal } from 'lucide-react';
import { Chip, EmptyState } from '@gosavingfood/ui';
import { BagCard, ScreenHeader, SearchField } from '../../../shared/components';
import type { Merchant, SurpriseBag } from '../../../shared/types/customer.types';

interface SearchPageProps {
  bags: SurpriseBag[];
  merchants: Merchant[];
  onBack: () => void;
  onOpenBag: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => void;
}

const filters = ['Gần nhất', 'Đang mở', 'Giảm nhiều', 'Đánh giá cao'];

export function SearchPage({ bags, merchants, onBack, onOpenBag, onAdd }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Gần nhất');
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi-VN');
    const list = bags.filter((bag) =>
      `${bag.name} ${bag.merchantName}`.toLocaleLowerCase('vi-VN').includes(normalized)
    );
    return filter === 'Giảm nhiều'
      ? [...list].sort((a, b) => b.originalPrice - b.discountPrice - (a.originalPrice - a.discountPrice))
      : list;
  }, [bags, filter, query]);

  return (
    <div className="customer-screen">
      <ScreenHeader title="Tìm quanh bạn" subtitle={`${merchants.length} cửa hàng đang mở`} onBack={onBack} />
      <SearchField autoFocus value={query} onChange={setQuery} placeholder="Bánh mì, cơm, cửa hàng..." trailing={<SlidersHorizontal size={19} />} />
      <div className="customer-category-track">{filters.map((item) => <Chip key={item} selected={filter === item} onClick={() => setFilter(item)}>{item}</Chip>)}</div>
      <div className="customer-map-panel">
        <div className="customer-map-grid" />
        {merchants.map((merchant, index) => <span key={merchant.id} className={`customer-map-pin pin-${index + 1}`}><MapPin size={18} /></span>)}
        <div><strong>Khu vực Quận 1</strong><small>Vị trí mô phỏng · chờ tích hợp bản đồ</small></div>
      </div>
      <div className="customer-results-heading"><h2>{query ? `Kết quả cho “${query}”` : 'Gợi ý gần bạn'}</h2><span>{results.length} túi</span></div>
      {results.length ? <div className="customer-bag-grid">{results.map((bag) => <BagCard key={bag.id} bag={bag} onOpen={onOpenBag} onAdd={onAdd} />)}</div> : <EmptyState title="Không tìm thấy kết quả" description="Hãy thử một từ khóa hoặc bộ lọc khác." />}
    </div>
  );
}
