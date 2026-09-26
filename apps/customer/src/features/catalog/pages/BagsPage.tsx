import { useMemo, useState } from 'react';
import { Coffee, Croissant, Gift, LayoutGrid, Leaf, UtensilsCrossed } from 'lucide-react';
import { Chip } from '@gosavingfood/ui';
import { BagCard, ScreenHeader, SearchField } from '../../../shared/components';
import type { Category, SurpriseBag } from '../../../shared/types/customer.types';

const categoryIcons: Record<string, typeof LayoutGrid> = {
  all: LayoutGrid,
  bakery: Croissant,
  meat: UtensilsCrossed,
  vegetarian: Leaf,
  beverage: Coffee,
  other: Gift,
};

interface BagsPageProps { bags: SurpriseBag[]; categories: Category[]; onBack: () => void; onOpen: (bag: SurpriseBag) => void; onAdd: (bag: SurpriseBag) => void; }

export function BagsPage({ bags, categories, onBack, onOpen, onAdd }: BagsPageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const visible = useMemo(() => bags.filter((bag) => (category === 'all' || bag.category === category) && `${bag.name} ${bag.merchantName}`.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN'))), [bags, category, query]);
  return (
    <div className="customer-screen">
      <ScreenHeader title="Tất cả túi" subtitle={`${visible.length} lựa chọn hôm nay`} onBack={onBack} />
      <SearchField value={query} onChange={setQuery} placeholder="Tìm túi thực phẩm..." />
      <div className="customer-category-track">
        {categories.map((item) => {
          const Icon = categoryIcons[item.id] ?? LayoutGrid;
          return (
            <Chip key={item.id} selected={category === item.id} onClick={() => setCategory(item.id)}>
              <Icon size={14} /> {item.label}
            </Chip>
          );
        })}
      </div>
      <div className="customer-bag-grid">
        {visible.map((bag) => <BagCard key={bag.id} bag={bag} onOpen={onOpen} onAdd={onAdd} />)}
      </div>
    </div>
  );
}
