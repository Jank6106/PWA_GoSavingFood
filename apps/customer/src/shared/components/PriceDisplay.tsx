interface PriceDisplayProps {
  original?: number;
  current: number;
  className?: string;
}

export function PriceDisplay({ original, current, className = '' }: PriceDisplayProps) {
  // Chỉ nhận giá hữu hạn (Number.isFinite), không âm, không NaN / Infinity
  const isValidCurrent =
    typeof current === 'number' && Number.isFinite(current) && current >= 0;
  const isValidOriginal =
    typeof original === 'number' && Number.isFinite(original) && original >= 0;

  if (!isValidCurrent || (original !== undefined && (!isValidOriginal || current > original))) {
    return (
      <div
        className={`customer-price-stack is-invalid ${className}`.trim()}
        aria-disabled="true"
      >
        <span
          className="customer-price-unconfirmed"
          style={{ color: 'var(--color-text-secondary)', fontSize: 12.5, fontWeight: 600 }}
        >
          Giá chưa xác nhận
        </span>
      </div>
    );
  }

  return (
    <div className={`customer-price-stack ${className}`.trim()}>
      {isValidOriginal && original > current && (
        <del>{original.toLocaleString('vi-VN')}đ</del>
      )}
      <strong>{current.toLocaleString('vi-VN')}đ</strong>
    </div>
  );
}
