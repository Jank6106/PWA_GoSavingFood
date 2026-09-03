import React from 'react';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'offer' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  icon,
  className = '',
  ...props
}) => {
  const classNames = ['gsf-badge', `gsf-badge--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} {...props}>
      {icon && <span className="gsf-badge-icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
