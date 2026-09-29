import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Button } from '@gosavingfood/ui';
import { Eye, EyeOff, Lock, Smartphone, UserRound, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

export function AuthModal() {
  const { isAuthOpen, hideAuthModal, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setErrorMessage(null);
    setIsSubmitting(false);
    setConfirmPassword('');
    hideAuthModal();
  }, [hideAuthModal]);

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
