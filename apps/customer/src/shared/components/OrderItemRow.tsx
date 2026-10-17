import { ChevronRight } from 'lucide-react';

interface OrderItemRowProps {
  imageUrl?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  onClick?: () => void;
}

const DEFAULT_BAG_IMAGE = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80';

export function OrderItemRow({ imageUrl, name, quantity, unitPrice, onClick }: OrderItemRowProps) {
  const content = (
    <>
      <img
        src={imageUrl || DEFAULT_BAG_IMAGE}
        alt={name}
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== DEFAULT_BAG_IMAGE) {
            target.src = DEFAULT_BAG_IMAGE;
          }
        }}
      />
      <span>
        <strong>{name}</strong>
        <small>{quantity} × {unitPrice.toLocaleString('vi-VN')}đ</small>
      </span>
      <b>{(quantity * unitPrice).toLocaleString('vi-VN')}đ</b>
      {onClick && <ChevronRight size={16} className="customer-order-item-arrow" />}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="customer-checkout-item is-clickable"
        onClick={onClick}
        title={`Xem chi tiết ${name}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="customer-checkout-item">
      {content}
    </div>
  );
}

