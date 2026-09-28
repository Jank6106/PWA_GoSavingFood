import React from 'react';
import { Button } from '@gosavingfood/ui';

interface AuthRequiredStateProps {
  title?: string;
  loginLabel?: string;
  onLogin: () => void;
  icon?: React.ReactNode;
  description?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function AuthRequiredState({
  title = 'Đăng nhập hoặc đăng ký để bắt đầu',
  loginLabel = 'Đăng nhập / Đăng ký',
  onLogin,
}: AuthRequiredStateProps) {
  return (
    <div className="customer-screen customer-gated-screen">
      <div className="customer-gated-logo" aria-hidden="true">
        <img src="/logo.png" alt="GoSavingFood Logo" className="customer-gated-logo-img" />
      </div>
      <h1 className="customer-gated-title">{title}</h1>
      <Button size="lg" onClick={onLogin} className="customer-gated-btn">
        {loginLabel}
      </Button>
    </div>
  );
}
