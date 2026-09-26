import {
  Coffee,
  Croissant,
  Gift,
  LayoutGrid,
  Leaf,
  UtensilsCrossed,
} from 'lucide-react';
import type { Category, FoodCategory } from '../../../shared/types/customer.types';

interface CategoryBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: FoodCategory) => void;
}

const categoryIcons: Record<string, typeof LayoutGrid> = {
  all: LayoutGrid,
  bakery: Croissant,
  meat: UtensilsCrossed,
  vegetarian: Leaf,
  beverage: Coffee,
  other: Gift,
};

export function CategoryBar({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryBarProps) {
  return (
    <div className="customer-category-bar" role="tablist" aria-label="Danh mục thực phẩm">
      {categories.map((item) => {
        const isSelected = selectedCategory === item.id;
        const IconComponent = categoryIcons[item.id] ?? LayoutGrid;

        return (
          <button
            key={item.id}
            type="button"
            className={`customer-category-pill ${isSelected ? 'is-active' : ''}`}
            onClick={() => onSelectCategory(item.id)}
            role="tab"
            aria-selected={isSelected}
          >
            <div className="customer-category-circle">
              <IconComponent size={22} strokeWidth={isSelected ? 2.3 : 1.8} />
            </div>
            <span className="customer-category-text">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
