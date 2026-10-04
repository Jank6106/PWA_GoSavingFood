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
  isValidVietnamesePhone,
} from '../../../shared/utils/validation';

type AuthMode = 'login' | 'register' | 'forgot';
type RegisterStep = 'input' | 'otp';

export function AuthModal({ onClose }: { onClose?: () => void } = {}) {
  const {
    isAuthOpen,
    hideAuthModal,
    login,
    loginWithGoogle,
    registerInit,
    verifyRegisterOtp,
    resendRegisterOtp,
    resetPassword,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('input');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState('');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');

  // UI & loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Phân tích định danh ô đăng nhập
  const loginIdentifierInfo = useMemo(() => {
    if (!loginIdentifier.trim()) return null;
    return parseIdentifier(loginIdentifier);
  }, [loginIdentifier]);

  // Kiểm tra email đăng ký
  const isRegEmailValid = useMemo(() => {
    if (!regEmail.trim()) return null;
    return isValidEmail(regEmail);
  }, [regEmail]);

  // Kiểm tra số điện thoại đăng ký (nếu có nhập)
  const isRegPhoneValid = useMemo(() => {
    if (!regPhone.trim()) return null;
    return isValidVietnamesePhone(regPhone);
  }, [regPhone]);

  // Phân tích độ mạnh mật khẩu khi đăng ký
  const passwordStrength = useMemo(() => {
    return evaluatePasswordStrength(regPassword);
  }, [regPassword]);

  // Đếm ngược 60s cho gửi lại mã OTP đăng ký / reset password
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
    setLoginPassword('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegOtpCode('');
    setRegisterStep('input');
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

  const clearFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const switchToLogin = () => {
    clearFeedback();
    setMode('login');
    setRegisterStep('input');
  };

  const switchToRegister = () => {
    clearFeedback();
    setMode('register');
    setRegisterStep('input');
    // Nếu ở ô login có nhập email hợp lệ, điền sẵn vào email đăng ký
    if (loginIdentifierInfo?.type === 'email') {
      setRegEmail(loginIdentifierInfo.normalized);
    }
  };

  const switchToForgot = () => {
    clearFeedback();
    if (loginIdentifierInfo?.type === 'email') {
      setForgotEmail(loginIdentifierInfo.normalized);
    }
    setMode('forgot');
  };

  // ---------------------------------------------------------
  // 1. SUBMIT ĐĂNG NHẬP (Email / Số điện thoại + Mật khẩu)
  // ---------------------------------------------------------
  const handleLoginSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    clearFeedback();

    if (!loginIdentifier.trim()) {
      setErrorMessage('Vui lòng nhập email hoặc số điện thoại.');
      return;
    }

    const parsed = parseIdentifier(loginIdentifier);
    if (parsed.type === 'invalid') {
      setErrorMessage(
        parsed.errorMessage || 'Số điện thoại hoặc email không đúng định dạng.'
      );
      return;
    }

    if (!loginPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(loginIdentifier.trim(), loginPassword);
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập không thành công.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // 2. BƯỚC 1 ĐĂNG KÝ: Nhập thông tin & Gửi mã OTP về Mail
  // ---------------------------------------------------------
  const handleRegisterInitSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    clearFeedback();

    if (!regName.trim() || regName.trim().length < 2) {
      setErrorMessage('Họ và tên phải có ít nhất 2 ký tự.');
      return;
    }

    if (!regEmail.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email để nhận mã OTP xác thực.');
      return;
    }

    if (!isValidEmail(regEmail)) {
      setErrorMessage('Địa chỉ email không đúng định dạng (ví dụ: ten@domain.com).');
      return;
    }

    if (regPhone.trim() && !isValidVietnamesePhone(regPhone)) {
      setErrorMessage(
        'Số điện thoại không đúng chuẩn di động Việt Nam (10 số, đầu 03, 05, 07, 08, 09).'
      );
      return;
    }

    if (!regPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (!regConfirmPassword) {
      setErrorMessage('Vui lòng xác nhận lại mật khẩu.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerInit(
        regName.trim(),
        regEmail.trim(),
        regPassword,
        regPhone.trim()
      );

      // Nếu Supabase đã tự động kích hoạt tài khoản
      if (res.autoConfirmed) {
        handleClose();
        return;
      }

      setRegisterStep('otp');
      setOtpCountdown(60);
      setSuccessMessage(
        `Mã xác thực 6 chữ số đã được gửi đến email ${regEmail.trim().toLowerCase()}. Vui lòng kiểm tra hộp thư (cả mục Thư rác/Spam).`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể đăng ký tài khoản. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // 3. BƯỚC 2 ĐĂNG KÝ: Xác thực 6 số OTP trong Mail
  // ---------------------------------------------------------
  const handleVerifyRegisterOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    clearFeedback();

    const code = regOtpCode.trim();
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      setErrorMessage('Vui lòng nhập đúng 6 chữ số mã OTP gửi trong email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyRegisterOtp(regEmail.trim().toLowerCase(), code);
      handleClose();
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Mã xác thực không chính xác hoặc đã hết hạn. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gửi lại mã OTP đăng ký
  const handleResendRegisterOtp = async () => {
    clearFeedback();
    setIsSubmitting(true);
    try {
      await resendRegisterOtp(regEmail.trim().toLowerCase());
      setOtpCountdown(60);
      setSuccessMessage(
        `Đã gửi lại mã OTP mới đến ${regEmail.trim().toLowerCase()}. Vui lòng kiểm tra hộp thư.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // 4. QUÊN MẬT KHẨU: Gửi link khôi phục qua email
  // ---------------------------------------------------------
  const handleResetPassword = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    clearFeedback();

    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!targetEmail || !isValidEmail(targetEmail)) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ để nhận liên kết khôi phục.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(targetEmail);
      setSuccessMessage(
        `Đã gửi liên kết đặt lại mật khẩu đến ${targetEmail}. Vui lòng mở email để tiếp tục.`
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
    clearFeedback();
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
        {/* Header Modal */}
        <div className="customer-auth-header">
          <div>
            {mode === 'forgot' && (
              <button
                type="button"
                className="customer-auth-back-link"
                onClick={switchToLogin}
              >
                <ArrowLeft size={16} /> Quay lại đăng nhập
              </button>
            )}
            {mode === 'register' && registerStep === 'otp' && (
              <button
                type="button"
                className="customer-auth-back-link"
                onClick={() => {
                  clearFeedback();
                  setRegisterStep('input');
                }}
              >
                <ArrowLeft size={16} /> Chỉnh sửa thông tin
              </button>
            )}
            <h2 id="customer-auth-title">
              {mode === 'login' && 'Đăng nhập'}
              {mode === 'register' && registerStep === 'input' && 'Tạo tài khoản mới'}
              {mode === 'register' && registerStep === 'otp' && 'Xác thực OTP Email'}
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
        {/* FORM ĐĂNG NHẬP (Chỉ Email/SĐT + Mật khẩu, KHÔNG CÓ OTP ĐĂNG NHẬP)        */}
        {/* ========================================================================= */}
        {mode === 'login' && (
          <form className="customer-auth-form" onSubmit={handleLoginSubmit}>
            <div className="customer-auth-field">
              <div className="customer-auth-field-header">
                <label>Email hoặc số điện thoại</label>
                {loginIdentifierInfo && (
                  <span
                    className={`customer-auth-badge ${
                      loginIdentifierInfo.type === 'phone'
                        ? 'is-phone'
                        : loginIdentifierInfo.type === 'email'
                        ? 'is-email'
                        : 'is-invalid'
                    }`}
                  >
                    {loginIdentifierInfo.type === 'phone' && '🇻🇳 SĐT Việt Nam'}
                    {loginIdentifierInfo.type === 'email' && '✉️ Email hợp lệ'}
                    {loginIdentifierInfo.type === 'invalid' && 'Chưa đúng định dạng'}
                  </span>
                )}
              </div>
              <div className="customer-auth-input-wrap">
                {loginIdentifierInfo?.type === 'email' ? (
                  <Mail size={18} className="customer-auth-icon" />
                ) : (
                  <Smartphone size={18} className="customer-auth-icon" />
                )}
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="0912345678 hoặc email@domain.com"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="customer-auth-field">
              <div className="customer-auth-field-header">
                <label>Mật khẩu</label>
                <button
                  type="button"
                  className="customer-auth-forgot-link"
                  onClick={switchToForgot}
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="customer-auth-input-wrap">
                <Lock size={18} className="customer-auth-icon" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="customer-auth-eye-btn"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              className="customer-auth-submit-btn"
            >
              Đăng nhập
            </Button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* FORM ĐĂNG KÝ BƯỚC 1: Nhập thông tin & Gửi mã xác thực về Email           */}
        {/* ========================================================================= */}
        {mode === 'register' && registerStep === 'input' && (
          <form className="customer-auth-form" onSubmit={handleRegisterInitSubmit}>
            <div className="customer-auth-field">
              <label>Họ và tên</label>
              <div className="customer-auth-input-wrap">
                <UserRound size={18} className="customer-auth-icon" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>

            <div className="customer-auth-field">
              <div className="customer-auth-field-header">
                <label>Email (Nhận mã OTP xác thực)</label>
                {isRegEmailValid !== null && (
                  <span
                    className={`customer-auth-badge ${
                      isRegEmailValid ? 'is-email' : 'is-invalid'
                    }`}
                  >
                    {isRegEmailValid ? '✉️ Email hợp lệ' : 'Email chưa đúng'}
                  </span>
                )}
              </div>
              <div className="customer-auth-input-wrap">
                <Mail size={18} className="customer-auth-icon" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="vidu@gmail.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="customer-auth-field">
              <div className="customer-auth-field-header">
                <label>Số điện thoại (Tùy chọn)</label>
                {isRegPhoneValid !== null && (
                  <span
                    className={`customer-auth-badge ${
                      isRegPhoneValid ? 'is-phone' : 'is-invalid'
                    }`}
                  >
                    {isRegPhoneValid ? '🇻🇳 SĐT hợp lệ' : 'Chưa đúng chuẩn VN'}
                  </span>
                )}
              </div>
              <div className="customer-auth-input-wrap">
                <Smartphone size={18} className="customer-auth-icon" />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0912345678 (tùy chọn)"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="customer-auth-field">
              <label>Mật khẩu</label>
              <div className="customer-auth-input-wrap">
                <Lock size={18} className="customer-auth-icon" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mật khẩu tối thiểu 6 ký tự"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="customer-auth-eye-btn"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {regPassword.length > 0 && (
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

            <div className="customer-auth-field">
              <label>Xác nhận mật khẩu</label>
              <div className="customer-auth-input-wrap">
                <Lock size={18} className="customer-auth-icon" />
                <input
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="customer-auth-eye-btn"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  aria-label={showRegConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              className="customer-auth-submit-btn"
            >
              Tiếp tục & Nhận mã OTP Email
            </Button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* FORM ĐĂNG KÝ BƯỚC 2: Nhập mã OTP 6 số trong Mail để kích hoạt tài khoản   */}
        {/* ========================================================================= */}
        {mode === 'register' && registerStep === 'otp' && (
          <form className="customer-auth-form" onSubmit={handleVerifyRegisterOtp}>
            <div className="customer-auth-field">
              <label>Nhập mã xác thực 6 số gửi đến {regEmail}</label>
              <div className="customer-auth-input-wrap">
                <KeyRound size={18} className="customer-auth-icon" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={regOtpCode}
                  onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, ''))}
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
                  onClick={handleResendRegisterOtp}
                >
                  {otpCountdown > 0
                    ? `Gửi lại mã (${otpCountdown}s)`
                    : 'Gửi lại mã mới'}
                </button>
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                💡 <i>Mẹo: Mã OTP có hiệu lực trong <b>5 phút</b>. Vui lòng kiểm tra kỹ cả mục <b>Thư rác (Spam)</b> hoặc <b>Quảng cáo</b>.</i>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              className="customer-auth-submit-btn"
            >
              Xác nhận & Hoàn tất đăng ký
            </Button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* FORM KHÔI PHỤC MẬT KHẨU                                                   */}
        {/* ========================================================================= */}
        {mode === 'forgot' && (
          <form className="customer-auth-form" onSubmit={handleResetPassword}>
            <div className="customer-auth-field">
              <label>Email đăng ký tài khoản</label>
              <div className="customer-auth-input-wrap">
                <Mail size={18} className="customer-auth-icon" />
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
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

        {/* GOOGLE OAUTH DIVIDER & BUTTON (Chỉ hiển thị ở login hoặc register step 1) */}
        {(mode === 'login' || (mode === 'register' && registerStep === 'input')) && (
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
