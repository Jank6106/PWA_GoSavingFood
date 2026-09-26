import { Button } from '@gosavingfood/ui';

interface AuthRequiredStateProps {
  icon: string;
  title: string;
  description: string;
  loginLabel?: string;
  secondaryLabel?: string;
  onLogin: () => void;
  onSecondary?: () => void;
}

export function AuthRequiredState({
  icon,
  title,
  description,
  loginLabel = 'Đăng nhập / Đăng ký',
  secondaryLabel,
  onLogin,
  onSecondary,
}: AuthRequiredStateProps) {
  return (
    <div className="customer-screen customer-gated-screen">
      <div className="customer-gated-icon">{icon}</div>
      <h1>{title}</h1>
      <p>{description}</p>
      <Button size="lg" onClick={onLogin}>{loginLabel}</Button>
      {secondaryLabel && onSecondary && (
        <button type="button" onClick={onSecondary}>{secondaryLabel}</button>
      )}
    </div>
  );
}
