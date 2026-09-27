import { ChevronRight } from 'lucide-react';

interface OrderItemRowProps {
  imageUrl?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  onClick?: () => void;
}

export function OrderItemRow({ imageUrl, name, quantity, unitPrice, onClick }: OrderItemRowProps) {
  const content = (
    <>
      <img src={imageUrl} alt={name} />
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

