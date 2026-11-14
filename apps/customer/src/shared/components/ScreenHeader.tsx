import { ArrowLeft } from 'lucide-react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  action?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, action }: ScreenHeaderProps) {
  return (
    <header className={`customer-screen-header ${action ? 'has-action' : ''}`}>
      <button type="button" className="customer-round-button" onClick={onBack} aria-label="Quay lại">
        <ArrowLeft size={21} />
      </button>
      <div className="customer-screen-header-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="customer-screen-action">{action}</div>
    </header>
  );
}
