interface PriceDisplayProps {
  original?: number;
  current: number;
  className?: string;
}

export function PriceDisplay({ original, current, className = '' }: PriceDisplayProps) {
  return (
    <div className={`customer-price-stack ${className}`.trim()}>
      {original !== undefined && <del>{original.toLocaleString('vi-VN')}đ</del>}
      <strong>{current.toLocaleString('vi-VN')}đ</strong>
    </div>
  );
}
