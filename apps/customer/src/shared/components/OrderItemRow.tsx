interface OrderItemRowProps {
  imageUrl?: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export function OrderItemRow({ imageUrl, name, quantity, unitPrice }: OrderItemRowProps) {
  return (
    <div className="customer-checkout-item">
      <img src={imageUrl} alt="" />
      <span><strong>{name}</strong><small>{quantity} × {unitPrice.toLocaleString('vi-VN')}đ</small></span>
      <b>{(quantity * unitPrice).toLocaleString('vi-VN')}đ</b>
    </div>
  );
}
