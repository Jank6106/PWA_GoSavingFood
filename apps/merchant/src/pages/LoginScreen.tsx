import {
  Headphones,
  Info,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Field } from '../components/ui';
import type { AuthUser, LoginCredentials } from '../types';
import logoSvg from '../assets/logo.svg';
import logoPng from '../assets/logo.png';

interface LoginScreenProps {
  loading: boolean;
  error: string | null;
  onLogin: (credentials: LoginCredentials) => Promise<AuthUser | null>;
  onClearError: () => void;
  onExploreDemo?: () => void;
}

export function LoginScreen({
  loading,
  error,
  onLogin,
  onClearError,
}: LoginScreenProps) {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleLoginSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError('');
    onClearError();

    const trimmed = loginIdentifier.trim();
    if (!trimmed) {
      return setLocalError('Vui lòng nhập email, số điện thoại hoặc tên đăng nhập.');
    }

    if (!loginPassword) {
      return setLocalError('Vui lòng nhập mật khẩu.');
    }

    await onLogin({ username: trimmed, password: loginPassword });
  };

  return (
    <main className="merchant-auth-page">
      <section className="merchant-auth-card">
        {/* 1. Header nhận diện thương hiệu GoSavingFood */}
        <div className="merchant-auth-brand">
          <div className="merchant-auth-logo-badge">
            <img
              src={logoSvg}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== logoPng) {
                  target.src = logoPng;
                }
              }}
              alt="GoSavingFood Logo"
              className="merchant-auth-logo-img"
            />
          </div>

          <h1 className="merchant-auth-title">GoSavingFood Merchant</h1>
        </div>

        {/* 2. Hiển thị thông báo lỗi nếu có */}
        {(localError || error) && (
          <div className="merchant-form-error" role="alert" style={{ marginBottom: 18 }}>
            {localError || error}
          </div>
        )}

        {/* 3. Form Đăng nhập Tối giản (TUYỆT ĐỐI KHÔNG CÓ TAB HOẶC LINK ĐĂNG KÝ) */}
        <form className="merchant-form" onSubmit={handleLoginSubmit} noValidate>
          <Field
            label="Email hoặc Số điện thoại"
            icon={<Mail size={18} />}
            type="text"
            value={loginIdentifier}
            onChange={(event) => {
              setLoginIdentifier(event.target.value);
              if (localError || error) {
                setLocalError('');
                onClearError();
              }
            }}
            placeholder="partner@gosavingfood.app hoặc 0912345678"
            autoComplete="username"
            autoFocus
            required
          />

          <Field
            label="Mật khẩu"
            icon={<LockKeyhole size={18} />}
            isPassword
            value={loginPassword}
            onChange={(event) => {
              setLoginPassword(event.target.value);
              if (localError || error) {
                setLocalError('');
                onClearError();
              }
            }}
            placeholder="Nhập mật khẩu tài khoản"
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            size="large"
            fullWidth
            loading={loading}
            style={{
              marginTop: 6,
              background: 'var(--primary, #005639)',
              fontWeight: 750,
              fontSize: 15,
              height: 48,
              borderRadius: 12,
            }}
          >
            Đăng nhập
          </Button>

          {/* 4. Ghi chú tài khoản đối tác ký kết hợp đồng (Thay thế hoàn toàn chức năng Đăng ký) */}
          <div className="merchant-contract-notice">
            <div className="merchant-contract-notice-icon">
              <Info size={16} />
            </div>
            <div className="merchant-contract-notice-text">
              <strong>Tài khoản cấp theo hợp đồng</strong>
              <p>
                Tài khoản đối tác được cấp bởi Ban quản trị GoSavingFood khi ký kết hợp đồng. Liên hệ hotline để được hỗ trợ.
              </p>
            </div>
          </div>

          {/* 5. Hotline liên hệ hỗ trợ kỹ thuật */}
          <div className="merchant-auth-hotline">
            <Headphones size={13} />
            <span>
              Hotline hỗ trợ đối tác: <a href="tel:02838228899">028 3822 8899</a>
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}
