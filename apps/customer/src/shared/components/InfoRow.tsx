import type { ReactNode } from 'react';

interface InfoRowProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

export function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="customer-info-row">
      {icon}
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  );
}
