import React, { useState, useMemo } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Chip, Input, EmptyState } from '@gosavingfood/ui';
import { ProductCard } from '../components/ProductCard';
import type { ProductDeal } from '../../../shared/types/customer.types';

interface HomePageProps {
  deals: ProductDeal[];
  onAddToCart: (deal: ProductDeal) => void;
  onViewDetails: (deal: ProductDeal) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Tất cả deal' },
  { id: 'bag', label: 'Túi bí mật' },
  { id: 'bakery', label: 'Tiệm bánh' },
  { id: 'rice', label: 'Cơm phần' },
  { id: 'healthy', label: 'Healthy & Salad' },
] as const;

export const HomePage: React.FC<HomePageProps> = ({
  deals,
  onAddToCart,
  onViewDetails,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchCategory =
        selectedCategory === 'all' || deal.category === selectedCategory;
      const matchSearch =
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.shopName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [deals, selectedCategory, searchQuery]);

  return (
    <div className="customer-page-home">
      {/* Banner giới thiệu thân thiện */}
      <section className="customer-hero-card">
        <div className="customer-hero-content">
          <div className="customer-hero-tag">
            <Sparkles size={14} strokeWidth={2.5} />
            <span>Chung tay giảm lãng phí</span>
          </div>
          <h2 className="customer-hero-title">
            Cứu suất ăn ngon hôm nay
          </h2>
          <p className="customer-hero-desc">
            Tiết kiệm tới 70% từ các tiệm bánh và nhà hàng chất lượng quanh bạn.
          </p>
        </div>
        <div className="customer-hero-graphic" aria-hidden="true">
          🥗🥖
        </div>
      </section>

      {/* Thanh tìm kiếm */}
      <div className="customer-search-section">
        <Input
          placeholder="Tìm quán ăn, tiệm bánh hoặc món ngon..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={18} strokeWidth={2} />}
        />
      </div>

      {/* Filter Categories Chips */}
      <div className="customer-categories-scroll" role="toolbar" aria-label="Bộ lọc danh mục">
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            selected={selectedCategory === cat.id}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </Chip>
        ))}
      </div>

      {/* Danh sách deals */}
      <section className="customer-deals-section">
        <div className="customer-section-header">
          <h3 className="customer-section-title">
            {selectedCategory === 'all' ? 'Món ngon nổi bật' : CATEGORIES.find(c => c.id === selectedCategory)?.label}
          </h3>
          <span className="customer-section-count">
            {filteredDeals.length} suất ăn sẵn sàng
          </span>
        </div>

        {filteredDeals.length === 0 ? (
          <EmptyState
            title="Không tìm thấy suất ăn phù hợp"
            description="Hãy thử tìm từ khóa khác hoặc đổi sang danh mục món khác xem sao bạn nhé!"
            action={
              <button
                type="button"
                className="gsf-button gsf-button--outline gsf-button--md"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
              >
                Xem tất cả món
              </button>
            }
          />
        ) : (
          <div className="customer-deals-grid">
            {filteredDeals.map((deal) => (
              <ProductCard
                key={deal.id}
                deal={deal}
                onAddToCart={onAddToCart}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
