import { LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AuthUser, LoginCredentials } from '../types';
import { Button, Field } from '../components/ui';

interface LoginScreenProps {
  loading: boolean;
  error: string | null;
  onLogin: (credentials: LoginCredentials) => Promise<AuthUser | null>;
  onClearError: () => void;
}

export function LoginScreen({ loading, error, onLogin, onClearError }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError('');
    onClearError();
    if (!username.trim()) return setLocalError('Vui lòng nhập số điện thoại hoặc email');
    if (!password) return setLocalError('Vui lòng nhập mật khẩu');
    await onLogin({ username: username.trim(), password });
  };

  return (
    <main className="merchant-auth-page">
      <section className="merchant-auth-card">
        <div className="merchant-auth-brand">
          <span>
            <img src="/logo.svg" alt="GoSavingFood Logo" className="merchant-auth-logo-img" />
          </span>
          <h1>Đăng nhập Đối tác</h1>
          <div>
            <ShieldCheck size={14} /> Kênh Cửa Hàng
          </div>
        </div>

        <form className="merchant-form" onSubmit={submit}>
          <Field
            label="Email hoặc số điện thoại"
            icon={<UserRound size={18} />}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Nhập email hoặc số điện thoại"
            autoComplete="username"
            autoFocus
          />
          <Field
            label="Mật khẩu"
            icon={<LockKeyhole size={18} />}
            isPassword
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
          />
          {(localError || error) && (
            <div className="merchant-form-error">{localError || error}</div>
          )}
          <Button type="submit" size="large" fullWidth loading={loading}>
            Đăng nhập
          </Button>
        </form>
      </section>
    </main>
  );
}

