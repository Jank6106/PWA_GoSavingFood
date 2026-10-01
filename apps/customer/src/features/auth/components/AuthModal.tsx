import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Button } from '@gosavingfood/ui';
import { Eye, EyeOff, Lock, Smartphone, UserRound, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

export function AuthModal({ onClose }: { onClose?: () => void } = {}) {
  const { isAuthOpen, hideAuthModal, login, loginWithGoogle, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setErrorMessage(null);
    setIsSubmitting(false);
    setIsGoogleSubmitting(false);
    setConfirmPassword('');
    hideAuthModal();
    onClose?.();
  }, [hideAuthModal, onClose]);

  // Press ESC to close modal
  useEffect(() => {
    if (!isAuthOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthOpen, handleClose]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setErrorMessage(null);
    setConfirmPassword('');
  };

  const submit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập email hoặc số điện thoại.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }
    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
        return;
      }
      if (!confirmPassword) {
        setErrorMessage('Vui lòng nhập xác nhận mật khẩu.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Mật khẩu xác nhận không khớp.');
        return;
      }
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (mode === 'register') {
        await register(name.trim(), identifier.trim(), password);
      } else {
        await login(identifier.trim(), password);
      }
      setName('');
      setIdentifier('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Xác thực không thành công.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập bằng Google không thành công.');
      setIsGoogleSubmitting(false);
    }
  };

  if (!isAuthOpen) return null;

  return (
    <div
      className="customer-auth-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="presentation"
    >
      <div
        className="customer-auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-auth-title"
      >
        <div className="customer-auth-header">
          <h2 id="customer-auth-title">
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </h2>
          <button
            type="button"
            className="customer-auth-close-btn"
            onClick={handleClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <form className="customer-auth-form" onSubmit={submit}>
          {errorMessage && (
            <div className="customer-auth-error-banner" role="alert">
              {errorMessage}
            </div>
          )}

          {mode === 'register' && (
            <div className="customer-auth-field">
              <label>Họ và tên</label>
              <div className="customer-auth-input-wrap">
                <UserRound size={18} className="customer-auth-icon" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ và tên"
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="customer-auth-field">
            <label>Email hoặc số điện thoại</label>
            <div className="customer-auth-input-wrap">
              <Smartphone size={18} className="customer-auth-icon" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập email hoặc số điện thoại"
                autoComplete="username"
                autoFocus={mode === 'login'}
              />
            </div>
          </div>

          <div className="customer-auth-field">
            <label>Mật khẩu</label>
            <div className="customer-auth-input-wrap">
              <Lock size={18} className="customer-auth-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="customer-auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="customer-auth-field">
              <label>Xác nhận mật khẩu</label>
              <div className="customer-auth-input-wrap">
                <Lock size={18} className="customer-auth-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="customer-auth-eye-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            className="customer-auth-submit-btn"
          >
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </Button>
        </form>

        <div className="customer-auth-divider">
          <span>hoặc</span>
        </div>

        <button
          type="button"
          className="customer-auth-google-btn"
          onClick={handleGoogleLogin}
          disabled={isSubmitting || isGoogleSubmitting}
        >
          <svg
            className="customer-auth-google-icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isGoogleSubmitting ? 'Đang chuyển hướng sang Google...' : 'Tiếp tục với Google'}</span>
        </button>

        <div className="customer-auth-footer">
          <span>{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span>
          <button type="button" onClick={toggleMode}>
            {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
}
