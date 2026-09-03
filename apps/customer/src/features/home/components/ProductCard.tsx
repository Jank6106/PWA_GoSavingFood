import React from 'react';
import { Clock, MapPin, Plus } from 'lucide-react';
import { Card, Badge, Button } from '@gosavingfood/ui';
import type { ProductDeal } from '../../../shared/types/customer.types';

interface ProductCardProps {
  deal: ProductDeal;
  onAddToCart: (deal: ProductDeal) => void;
  onViewDetails?: (deal: ProductDeal) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  deal,
  onAddToCart,
  onViewDetails,
}) => {
  return (
    <Card className="customer-deal-card">
      <div
        className="customer-deal-img-wrapper"
        onClick={() => onViewDetails?.(deal)}
        role={onViewDetails ? 'button' : undefined}
        tabIndex={onViewDetails ? 0 : undefined}
      >
        <div className="customer-deal-icon-bg" aria-hidden="true">
          <span>{deal.icon}</span>
        </div>
        <div className="customer-deal-badges">
          <Badge variant="offer">-{deal.discountPercentage}%</Badge>
          <Badge variant="neutral">
            <MapPin size={11} strokeWidth={2.5} />
            {deal.distance}
          </Badge>
        </div>
      </div>

      <div className="customer-deal-body">
        <div className="customer-deal-shop">{deal.shopName}</div>
        <h3
          className="customer-deal-title"
          onClick={() => onViewDetails?.(deal)}
        >
          {deal.title}
        </h3>

        <div className="customer-deal-pickup">
          <Clock size={13} strokeWidth={2} />
          <span>Lấy món: <strong>{deal.pickupTime}</strong></span>
        </div>

        <div className="customer-deal-footer">
          <div className="customer-deal-pricing">
            <span className="customer-deal-original">
              {deal.originalPrice.toLocaleString('vi-VN')}đ
            </span>
            <span className="customer-deal-rescue">
              {deal.rescuePrice.toLocaleString('vi-VN')}đ
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onAddToCart(deal)}
            aria-label={`Thêm ${deal.title} vào giỏ`}
            leftIcon={<Plus size={16} strokeWidth={2.5} />}
          >
            Cứu món
          </Button>
        </div>

        <div className="customer-deal-stock">
          Còn lại {deal.stock} suất hôm nay
        </div>
      </div>
    </Card>
  );
};
