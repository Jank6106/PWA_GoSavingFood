import type { ReactNode } from 'react';

export function StickyActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`customer-detail-actions ${className}`.trim()}>{children}</div>;
}
