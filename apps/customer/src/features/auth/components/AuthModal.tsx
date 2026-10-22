import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Button } from '@gosavingfood/ui';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  LogOut,
  Mail,
  Phone,
  UserRound,
  X,
} from 'lucide-react';
import logoSvg from '../../../assets/logo.svg';
import logoPng from '../../../assets/logo.png';
import { useAuth } from '../../../hooks/useAuth';
import {
  isValidVietnamesePhone,
  validateRecipientPhone,
} from '../../../shared/utils/validation';

export function AuthModal({ onClose }: { onClose?: () => void } = {}) {
  const {
    isAuthOpen,
    hideAuthModal,
    loginWithGoogle,
    user,
    needsProfileCompletion,
    completeProfile,
    logout,
  } = useAuth();

  // State cho Form hoàn tất thông tin cá nhân
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  // UI & loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Đồng bộ thông tin khi user load xong
  useEffect(() => {
    if (user) {
      if (!nameTouched) {
        setProfileName(user.name || '');
      }
      if (!phoneTouched) {
        setProfilePhone(user.phone || '');
      }
    }
  }, [user, nameTouched, phoneTouched]);

  const clearFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleClose = useCallback(() => {
    // Không cho phép đóng nếu tài khoản chưa hoàn tất thông tin bắt buộc
    if (needsProfileCompletion) return;
    clearFeedback();
    setIsSubmitting(false);
    setIsGoogleSubmitting(false);
    hideAuthModal();
    onClose?.();
  }, [needsProfileCompletion, hideAuthModal, onClose]);

  // Nhấn ESC để đóng modal (chỉ khi không bắt buộc onboarding)
  useEffect(() => {
    if (!isAuthOpen || needsProfileCompletion) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthOpen, needsProfileCompletion, handleClose]);

  // Đăng nhập bằng Google
  const handleGoogleLogin = async () => {
    setIsGoogleSubmitting(true);
    clearFeedback();
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập bằng Google không thành công. Vui lòng thử lại.');
      setIsGoogleSubmitting(false);
    }
  };

  // Hoàn tất thông tin cá nhân
  const handleProfileSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    clearFeedback();
    setNameTouched(true);
    setPhoneTouched(true);

    const trimmedName = profileName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn (tối thiểu 2 ký tự).');
      return;
    }

    const phoneValidation = validateRecipientPhone(profilePhone);
    if (!phoneValidation.isValid) {
      setErrorMessage(
        phoneValidation.errorMessage ||
          'Số điện thoại không đúng chuẩn di động Việt Nam (10 số, đầu 03, 05, 07, 08, 09).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await completeProfile({
        name: trimmedName,
        phone: phoneValidation.cleaned,
      });
      setSuccessMessage('Cập nhật thông tin thành công!');
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể lưu thông tin cá nhân. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    if (digitsOnly.length <= 10) {
      setProfilePhone(digitsOnly);
      if (!phoneTouched) setPhoneTouched(true);
      if (errorMessage) setErrorMessage(null);
    }
  };

  const handleLogout = () => {
    clearFeedback();
    logout();
    hideAuthModal();
    onClose?.();
  };

  if (!isAuthOpen) return null;

  const isNameValid = profileName.trim().length >= 2;
  const isPhoneValid = isValidVietnamesePhone(profilePhone);

  return (
    <div
      className="customer-auth-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !needsProfileCompletion) {
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
        <div className="customer-auth-header is-centered relative w-full">
          <h2
            id="customer-auth-title"
            className="text-xl sm:text-2xl font-bold text-[#163e2e] text-center w-full"
          >
            {needsProfileCompletion ? 'Hoàn tất thông tin cá nhân' : 'Đăng nhập'}
          </h2>
          {!needsProfileCompletion && (
            <button
              type="button"
              className="customer-auth-close-btn absolute right-0"
              onClick={handleClose}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Thông báo lỗi / thành công */}
        {errorMessage && (
          <div className="customer-auth-error-banner flex items-start gap-2" role="alert">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="customer-auth-success-banner" role="status">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MÀN HÌNH 1: BƯỚC HOÀN TẤT THÔNG TIN CÁ NHÂN (PROFILE ONBOARDING)         */}
        {/* ========================================================================= */}
        {needsProfileCompletion ? (
          <form className="customer-auth-form" onSubmit={handleProfileSubmit}>
            {/* Trường Email Google (Read-only để minh bạch) */}
            {user?.email && (
              <div className="customer-auth-field">
                <div className="customer-auth-field-header">
                  <label>Tài khoản Google liên kết</label>
                  <span className="customer-auth-badge is-email flex items-center gap-1">
                    <Lock size={10} /> Đã xác thực
                  </span>
                </div>
                <div
                  className="customer-auth-input-wrap"
                  style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', cursor: 'not-allowed' }}
                >
                  <Mail size={18} className="customer-auth-icon" style={{ opacity: 0.6 }} />
                  <input
                    type="email"
                    value={user.email}
                    readOnly
                    disabled
                    style={{ color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
            )}

            {/* Trường Họ và tên */}
            <div className="customer-auth-field">
              <div className="customer-auth-field-header">
                <label>Họ và tên của bạn</label>
                {nameTouched && (
                  <span
                    className={`customer-auth-badge ${isNameValid ? 'is-phone' : 'is-invalid'}`}
                  >
                    {isNameValid ? 'Hợp lệ' : 'Không hợp lệ'}
                  </span>
                )}
              </div>
              <div className={`customer-auth-input-wrap ${nameTouched && !isNameValid ? 'border-red-400' : ''}`}>
                <UserRound size={18} className="customer-auth-icon" />
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => {
                    setProfileName(e.target.value);
                    if (!nameTouched) setNameTouched(true);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onBlur={() => setNameTouched(true)}
                  placeholder="Nhập họ và tên đầy đủ"
                  autoFocus
                />
              </div>
            </div>

            {/* Trường Số điện thoại */}
            <div className="customer-auth-field">
              <div className="customer-auth-field-header">
                <label>Số điện thoại nhận hàng</label>
                {phoneTouched && (
                  <span
                    className={`customer-auth-badge ${isPhoneValid ? 'is-phone' : 'is-invalid'}`}
                  >
                    {isPhoneValid ? 'Hợp lệ' : 'Không hợp lệ'}
                  </span>
                )}
              </div>
              <div className={`customer-auth-input-wrap ${phoneTouched && !isPhoneValid ? 'border-red-400' : ''}`}>
                <Phone size={18} className="customer-auth-icon" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={profilePhone}
                  onChange={handlePhoneInputChange}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="0912345678"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isSubmitting}
              className="customer-auth-submit-btn"
            >
              Lưu
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                className="customer-auth-back-link text-xs text-gray-500 hover:text-red-600 inline-flex items-center gap-1.5 transition-colors"
                onClick={handleLogout}
              >
                <LogOut size={14} /> Đăng xuất hoặc đổi tài khoản khác
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* MÀN HÌNH 2: ĐĂNG NHẬP GOOGLE-ONLY DUY NHẤT                               */
          /* ========================================================================= */
          <div className="customer-auth-brand-wrap">
            {/* Logo Wrapper */}
            <div className="customer-auth-logo-circle">
              <img
                src={logoSvg}
                alt="GoSavingFood Logo"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== logoPng) {
                    target.src = logoPng;
                  }
                }}
                className="customer-auth-logo-img"
              />
            </div>

            {/* Brand Title (Căn giữa chuẩn xác) */}
            <h3 className="customer-auth-brand-name">
              GoSavingFood
            </h3>

            {/* Google Button */}
            <button
              type="button"
              className="customer-auth-google-btn customer-auth-google-btn--primary"
              onClick={handleGoogleLogin}
              disabled={isGoogleSubmitting}
            >
              <svg
                className="customer-auth-google-icon"
                width="22"
                height="22"
                viewBox="0 0 24 24"
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

            {/* Disclaimer */}
            <p className="customer-auth-terms-note">
              Bằng việc tiếp tục, bạn đồng ý với{' '}
              <span className="customer-auth-terms-link">
                Điều khoản dịch vụ
              </span>{' '}
              và{' '}
              <span className="customer-auth-terms-link">
                Chính sách bảo mật
              </span>{' '}
              của GoSavingFood.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
