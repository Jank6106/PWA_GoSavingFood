import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  label?: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  success: { bg: '#EEF4E4', color: '#166B4A', border: '#D8ED9B' },
  warning: { bg: '#FEF9ED', color: '#92400E', border: '#F4C95D' },
  danger: { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
  info: { bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' },
  neutral: { bg: '#FAF8F4', color: '#526458', border: '#D9D5CB' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  size = 'md',
}) => {
  // Tự động phân loại nếu variant không truyền vào
  let autoVariant: BadgeVariant = variant || 'neutral';
  const s = status.toUpperCase();

  if (!variant) {
    if (['ACTIVE', 'COMPLETED', 'RESOLVED', 'PAID', 'SUCCESS'].includes(s)) {
      autoVariant = 'success';
    } else if (['PENDING', 'CONFIRMED', 'PROCESSING', 'CHỜ DUYỆT'].includes(s)) {
      autoVariant = 'warning';
    } else if (['CANCELLED', 'REJECTED', 'INACTIVE', 'SUSPENDED', 'FAILED'].includes(s)) {
      autoVariant = 'danger';
    } else if (['READY_FOR_PICKUP', 'OPEN', 'INFO'].includes(s)) {
      autoVariant = 'info';
    }
  }

  const style = variantStyles[autoVariant];
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isSmall ? '2px 8px' : '4px 10px',
        borderRadius: '999px',
        fontSize: isSmall ? '10.5px' : '11.5px',
        fontWeight: '700',
        letterSpacing: '0.02em',
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: style.color,
        }}
      />
      {label || status}
    </span>
  );
};
