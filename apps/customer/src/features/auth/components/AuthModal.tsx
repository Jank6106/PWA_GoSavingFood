import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { Button } from '@gosavingfood/ui';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  parseIdentifier,
  evaluatePasswordStrength,
  isValidEmail,
} from '../../../shared/utils/validation';

type AuthViewMode = 'login' | 'register' | 'otp' | 'forgot';

export function AuthModal({ onClose }: { onClose?: () => void } = {}) {
  const {
    isAuthOpen,
    hideAuthModal,
    login,
    loginWithGoogle,
    register,
    sendEmailOtp,
    verifyEmailOtp,
    resetPassword,
  } = useAuth();

  const [mode, setMode] = useState<AuthViewMode>('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Phân tích định danh người dùng nhập
  const identifierInfo = useMemo(() => {
    if (!identifier.trim()) return null;
    return parseIdentifier(identifier);
  }, [identifier]);

  // Phân tích độ mạnh mật khẩu khi đăng ký
  const passwordStrength = useMemo(() => {
    return evaluatePasswordStrength(password);
  }, [password]);

  // Đếm ngược 60s cho gửi lại OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const handleClose = useCallback(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
    setIsGoogleSubmitting(false);
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setOtpSent(false);
    hideAuthModal();
    onClose?.();
  }, [hideAuthModal, onClose]);

  // Nhấn ESC để đóng modal
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

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setOtpSent(false);
  };

  const switchToLogin = () => {
    resetFormState();
    setMode('login');
  };

  const switchToRegister = () => {
    resetFormState();
    setMode('register');
  };

  const switchToOtp = () => {
    resetFormState();
    if (identifierInfo?.type === 'email') {
      setOtpEmail(identifierInfo.normalized);
    }
    setMode('otp');
  };

  const switchToForgot = () => {
    resetFormState();
    if (identifierInfo?.type === 'email') {
      setOtpEmail(identifierInfo.normalized);
    }
    setMode('forgot');
  };

  // Submit Password-based Login / Register
  const submitPasswordAuth = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Kiểm tra định danh
    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập email hoặc số điện thoại.');
      return;
    }

    const parsed = parseIdentifier(identifier);
    if (parsed.type === 'invalid') {
      setErrorMessage(
        parsed.errorMessage || 'Số điện thoại hoặc email không đúng định dạng.'
      );
      return;
    }

    // 2. Kiểm tra tên khi đăng ký
    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Vui lòng nhập họ và tên của bạn.');
        return;
      }
      if (name.trim().length < 2) {
        setErrorMessage('Họ và tên phải có ít nhất 2 ký tự.');
        return;
      }
    }

    // 3. Kiểm tra mật khẩu
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
    try {
      if (mode === 'register') {
        await register(name.trim(), identifier.trim(), password);
      } else {
        await login(identifier.trim(), password);
      }
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Xác thực không thành công.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit gửi mã Email OTP (Cấp độ 2 Supabase Native Free)
  const handleSendEmailOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailToUse = otpEmail.trim().toLowerCase();
    if (!emailToUse || !isValidEmail(emailToUse)) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ (ví dụ: ten@domain.com).');
      return;
    }

    setIsSubmitting(true);
    try {
      await sendEmailOtp(emailToUse);
      setOtpSent(true);
      setOtpCountdown(60);
      setSuccessMessage(
        `Đã gửi mã xác thực 6 số đến ${emailToUse}. Vui lòng kiểm tra hộp thư (cả mục Thư rác/Spam).`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit xác nhận mã Email OTP
  const handleVerifyEmailOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const code = otpCode.trim();
    if (!code || code.length !== 6) {
      setErrorMessage('Vui lòng nhập đúng 6 chữ số mã xác thực OTP.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmailOtp(otpEmail.trim().toLowerCase(), code);
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Mã xác thực không chính xác hoặc đã hết hạn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Forgot Password (Cấp độ 2 Supabase Native Free)
  const handleResetPassword = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailToUse = otpEmail.trim().toLowerCase();
    if (!emailToUse || !isValidEmail(emailToUse)) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ để nhận liên kết khôi phục.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(emailToUse);
      setSuccessMessage(
        `Đã gửi liên kết đặt lại mật khẩu đến ${emailToUse}. Vui lòng mở email để tiếp tục.`
      );
      setOtpCountdown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể gửi email đặt lại mật khẩu.');
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
          <div>
            {(mode === 'otp' || mode === 'forgot') && (
              <button
                type="button"
                className="customer-auth-back-link"
                onClick={switchToLogin}
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
            )}
            <h2 id="customer-auth-title">
              {mode === 'login' && 'Đăng nhập'}
              {mode === 'register' && 'Tạo tài khoản'}
              {mode === 'otp' && 'Đăng nhập qua Email OTP'}
              {mode === 'forgot' && 'Khôi phục mật khẩu'}
            </h2>
          </div>
          <button
            type="button"
            className="customer-auth-close-btn"
            onClick={handleClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab chuyển đổi linh hoạt: Mật khẩu vs OTP không cần mật khẩu */}
        {(mode === 'login' || mode === 'otp') && (
          <div className="customer-auth-tabs">
            <button
              type="button"
              className={`customer-auth-tab ${mode === 'login' ? 'is-active' : ''}`}
              onClick={switchToLogin}
            >
              Mật khẩu (SĐT / Email)
            </button>
            <button
              type="button"
              className={`customer-auth-tab ${mode === 'otp' ? 'is-active' : ''}`}
              onClick={switchToOtp}
            >
              Mã OTP Email (Miễn phí)
            </button>
          </div>
        )}

        {/* Thông báo lỗi / thành công */}
        {errorMessage && (
          <div className="customer-auth-error-banner" role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="customer-auth-success-banner" role="status">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FORM 1: ĐĂNG NHẬP / ĐĂNG KÝ BẰNG MẬT KHẨU (SĐT Việt Nam hoặc Email) */}
        {/* ========================================================================= */}
        {(mode === 'login' || mode === 'register') && (
          <form className="customer-auth-form" onSubmit={submitPasswordAuth}>
            {mode === 'register' && (
              <div className="customer-auth-field">
                <label>Họ và tên</label>
                <div className="customer-auth-input-wrap">
                  <UserRound size={18} className="customer-auth-icon" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    autoComplete="name"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="customer-auth-field">
              <div className="customer-auth-field-header">
                <label>Số điện thoại hoặc Email</label>
                {identifierInfo && (
                  <span
                    className={`customer-auth-badge ${
                      identifierInfo.type === 'phone'
                        ? 'is-phone'
                        : identifierInfo.type === 'email'
                        ? 'is-email'
                        : 'is-invalid'
                    }`}
                  >
                    {identifierInfo.type === 'phone' && '🇻🇳 SĐT Việt Nam'}
                    {identifierInfo.type === 'email' && '✉️ Email hợp lệ'}
                    {identifierInfo.type === 'invalid' && 'Chưa đúng định dạng'}
                  </span>
                )}
              </div>
              <div className="customer-auth-input-wrap">
                {identifierInfo?.type === 'email' ? (
                  <Mail size={18} className="customer-auth-icon" />
                ) : (
                  <Smartphone size={18} className="customer-auth-icon" />
                )}
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="0912345678 hoặc email@domain.com"
                  autoComplete="username"
                  autoFocus={mode === 'login'}
                />
              </div>
            </div>

            <div className="customer-auth-field">
              <div className="customer-auth-field-header">
                <label>Mật khẩu</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="customer-auth-forgot-link"
                    onClick={switchToForgot}
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="customer-auth-input-wrap">
                <Lock size={18} className="customer-auth-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
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

              {/* Thanh đánh giá độ mạnh mật khẩu khi Đăng ký */}
              {mode === 'register' && password.length > 0 && (
                <div className="customer-auth-strength-meter">
                  <div className="customer-auth-strength-bars">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`customer-auth-strength-bar ${
                          passwordStrength.score >= step
                            ? `is-${passwordStrength.level}`
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                  <span className="customer-auth-strength-text">
                    {passwordStrength.feedback}
                  </span>
                </div>
              )}
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
              {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* FORM 2: ĐĂNG NHẬP NHANH BẰNG MÃ OTP QUA EMAIL (100% Free Supabase Native) */}
        {/* ========================================================================= */}
        {mode === 'otp' && (
          <form
            className="customer-auth-form"
            onSubmit={otpSent ? handleVerifyEmailOtp : handleSendEmailOtp}
          >
            <div className="customer-auth-field">
              <label>Địa chỉ Email nhận mã OTP</label>
              <div className="customer-auth-input-wrap">
                <Mail size={18} className="customer-auth-icon" />
                <input
                  type="email"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  placeholder="vidu@gmail.com"
                  autoComplete="email"
                  disabled={otpSent}
                  autoFocus={!otpSent}
                />
              </div>
            </div>

            {otpSent && (
              <div className="customer-auth-field">
                <label>Mã OTP 6 chữ số</label>
                <div className="customer-auth-input-wrap">
                  <KeyRound size={18} className="customer-auth-icon" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="customer-auth-otp-input"
                    autoFocus
                  />
                </div>
                <div className="customer-auth-resend-wrap">
                  <span>Chưa nhận được mã?</span>
                  <button
                    type="button"
                    className="customer-auth-resend-btn"
                    disabled={otpCountdown > 0 || isSubmitting}
                    onClick={handleSendEmailOtp}
                  >
                    {otpCountdown > 0
                      ? `Gửi lại mã (${otpCountdown}s)`
                      : 'Gửi lại mã mới'}
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
              {otpSent ? 'Xác nhận & Đăng nhập' : 'Gửi mã xác thực qua Email'}
            </Button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* FORM 3: KHÔI PHỤC MẬT KHẨU QUA EMAIL (100% Free Supabase Native)          */}
        {/* ========================================================================= */}
        {mode === 'forgot' && (
          <form className="customer-auth-form" onSubmit={handleResetPassword}>
            <div className="customer-auth-field">
              <label>Email đăng ký tài khoản</label>
              <div className="customer-auth-input-wrap">
                <Mail size={18} className="customer-auth-icon" />
                <input
                  type="email"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  placeholder="vidu@gmail.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              disabled={otpCountdown > 0}
              className="customer-auth-submit-btn"
            >
              {otpCountdown > 0
                ? `Đã gửi (thử lại sau ${otpCountdown}s)`
                : 'Gửi liên kết đặt lại mật khẩu'}
            </Button>
          </form>
        )}

        {/* GOOGLE OAUTH DIVIDER & BUTTON (Chỉ hiển thị ở chế độ login / register) */}
        {(mode === 'login' || mode === 'register') && (
          <>
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
              <span>
                {isGoogleSubmitting
                  ? 'Đang chuyển hướng sang Google...'
                  : 'Tiếp tục với Google'}
              </span>
            </button>

            <div className="customer-auth-footer">
              <span>{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span>
              <button
                type="button"
                onClick={mode === 'login' ? switchToRegister : switchToLogin}
              >
                {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
