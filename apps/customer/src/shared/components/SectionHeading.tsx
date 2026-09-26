import type { ReactNode } from 'react';

interface SectionHeadingProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeading({ icon, title, subtitle, actionLabel, onAction }: SectionHeadingProps) {
  return (
    <div className="customer-section-heading">
      <div>{icon && <span>{icon}</span>}<div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>
      {actionLabel && onAction && <button type="button" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
