import { ChevronLeft } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { RecommendedBagCard } from '../../../shared/components';
import type { Category, SurpriseBag } from '../../../shared/types/customer.types';

interface BagsPageProps {
  bags: SurpriseBag[];
  categories?: Category[];
  onBack: () => void;
  onOpen: (bag: SurpriseBag) => void;
  onAdd: (bag: SurpriseBag) => void;
}

export function BagsPage({ bags, onBack, onOpen }: BagsPageProps) {
  return (
    <div className="customer-recommended-screen">
      <header className="customer-recommended-header">
        <button
          type="button"
          className="customer-recommended-back"
          onClick={onBack}
          aria-label="Quay lại"
        >
          <ChevronLeft size={28} strokeWidth={2.6} />
        </button>
        <h1 className="customer-recommended-title">Gợi ý cho bạn</h1>
        <div className="customer-recommended-spacer" />
      </header>

      {bags.length > 0 ? (
        <div className="customer-recommended-list">
          {bags.map((bag) => (
            <RecommendedBagCard
              key={bag.id}
              bag={bag}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 16px' }}>
          <EmptyState
            title="Không tìm thấy túi phù hợp"
            description="Hiện tại chưa có túi nào được đề xuất."
          />
        </div>
      )}
    </div>
  );
}
