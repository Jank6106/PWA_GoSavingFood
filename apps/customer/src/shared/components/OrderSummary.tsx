import type { ReactNode } from 'react';

interface SummaryRow {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'saving' | 'total';
}

interface OrderSummaryProps {
  title?: string;
  rows: SummaryRow[];
  note?: ReactNode;
  action?: ReactNode;
}

export function OrderSummary({ title, rows, note, action }: OrderSummaryProps) {
  return (
    <section className="customer-order-summary">
      {title && <h2>{title}</h2>}
      {rows.map((row) => (
        <p key={row.label} className={row.tone === 'saving' ? 'is-saving' : row.tone === 'total' ? 'is-total' : ''}>
          <span>{row.label}</span><strong>{row.value}</strong>
        </p>
      ))}
      {note && <div>{note}</div>}
      {action}
    </section>
  );
}
