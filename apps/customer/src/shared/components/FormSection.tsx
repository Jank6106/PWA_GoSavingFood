import type { ReactNode } from 'react';

interface FormSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, children, className = '' }: FormSectionProps) {
  return (
    <section className={`customer-form-section ${className}`.trim()}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
