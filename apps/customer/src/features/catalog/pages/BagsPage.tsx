import { useMemo, useState } from 'react';
import { EmptyState } from '@gosavingfood/ui';
import { BagCard, ScreenHeader, SearchField } from '../../../shared/components';
import { CategoryBar } from '../../home/components';
import type { Category, FoodCategory, SurpriseBag } from '../../../shared/types/customer.types';

interface BagsPageProps {
  bags: SurpriseBag[];
  categories: Category[];
  onBack: () => void;
  onOpen: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => void;
}

export function BagsPage({ bags, categories, onBack, onOpen, onAdd }: BagsPageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FoodCategory>('all');
  const visible = useMemo(
    () =>
      bags.filter(
        (bag) =>
          (category === 'all' || bag.category === category) &&
          `${bag.name} ${bag.merchantName}`.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN'))
      ),
    [bags, category, query]
  );

  return (
    <div className="customer-screen">
      <ScreenHeader title="Tất cả túi" onBack={onBack} />
      <SearchField value={query} onChange={setQuery} placeholder="Tìm túi thực phẩm..." />
      <CategoryBar
        categories={categories}
        selectedCategory={category}
        onSelectCategory={(id: FoodCategory) => setCategory(id)}
      />
      {visible.length ? (
        <div className="customer-bag-grid">
          {visible.map((bag) => (
            <BagCard key={bag.id} bag={bag} onOpen={onOpen} onAdd={onAdd} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Không tìm thấy túi phù hợp"
          description="Hãy thử chọn danh mục khác hoặc đổi từ khóa tìm kiếm."
        />
      )}
    </div>
  );
}
