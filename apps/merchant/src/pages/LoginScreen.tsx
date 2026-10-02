import {
  Building2,
  LockKeyhole,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  UserCheck,
  UserRound,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Field, SelectField } from '../components/ui';
import type { AuthUser, LoginCredentials, MerchantRegisterInput } from '../types';
import {
  evaluatePasswordStrength,
  isValidEmail,
  isValidVietnamesePhone,
} from '../utils/validation';

interface LoginScreenProps {
  loading: boolean;
  error: string | null;
  onLogin: (credentials: LoginCredentials) => Promise<AuthUser | null>;
  onRegister?: (input: MerchantRegisterInput) => Promise<AuthUser | null>;
  onClearError: () => void;
}

export function LoginScreen({
  loading,
  error,
  onLogin,
  onRegister,
  onClearError,
}: LoginScreenProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCategory, setRegCategory] = useState('bakery');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [localError, setLocalError] = useState('');

  const switchTab = (nextTab: 'login' | 'register') => {
    setTab(nextTab);
    setLocalError('');
    onClearError();
  };

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

  const handleRegisterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError('');
    onClearError();

    if (!regName.trim() || regName.trim().length < 2) {
      return setLocalError('Vui lòng nhập họ và tên người đại diện (tối thiểu 2 ký tự).');
    }

    if (!regStoreName.trim() || regStoreName.trim().length < 2) {
      return setLocalError('Vui lòng nhập tên quán / cửa hàng (tối thiểu 2 ký tự).');
    }

    if (!isValidVietnamesePhone(regPhone)) {
      return setLocalError('Số điện thoại không hợp lệ. Vui lòng nhập số di động 10 số (ví dụ: 0912345678).');
    }

    if (!isValidEmail(regEmail)) {
      return setLocalError('Địa chỉ email không đúng định dạng (ví dụ: cuahang@gmail.com).');
    }

    if (!regAddress.trim() || regAddress.trim().length < 5) {
      return setLocalError('Vui lòng nhập địa chỉ quán cụ thể để khách hàng đến nhận túi.');
    }

    if (!regPassword || regPassword.length < 6) {
      return setLocalError('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    if (regPassword !== regConfirmPassword) {
      return setLocalError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
    }

    if (!onRegister) {
      return setLocalError('Chức năng đăng ký tạm thời không khả dụng.');
    }

    await onRegister({
      name: regName.trim(),
      storeName: regStoreName.trim(),
      phone: regPhone.trim(),
      email: regEmail.trim(),
      address: regAddress.trim(),
      category: regCategory,
      password: regPassword,
    });
  };

  const pwdStrength = evaluatePasswordStrength(regPassword);

  return (
    <main className="merchant-auth-page">
      <section className="merchant-auth-card">
        <div className="merchant-auth-brand">
          <span>
            <Store size={30} />
          </span>
          <h1>GoSavingFood Đối Tác</h1>
          <div>
            <ShieldCheck size={14} /> Cổng Cửa Hàng & Tiệm Ăn
          </div>
          <p>
            Đồng hành giảm lãng phí thực phẩm, tăng thêm doanh thu từ những suất ăn ngon cuối ngày.
          </p>
        </div>

        {/* Tab switcher: Đăng nhập vs Đăng ký */}
        <div className="merchant-auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={`merchant-auth-tab ${tab === 'login' ? 'is-active' : ''}`}
            onClick={() => switchTab('login')}
          >
            <UserRound size={16} /> Đăng nhập
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'register'}
            className={`merchant-auth-tab ${tab === 'register' ? 'is-active' : ''}`}
            onClick={() => switchTab('register')}
          >
            <Building2 size={16} /> Đăng ký mở quán
          </button>
        </div>

        {(localError || error) && (
          <div className="merchant-form-error" style={{ marginBottom: 16 }}>
            {localError || error}
          </div>
        )}

        {tab === 'login' ? (
          <form className="merchant-form" onSubmit={handleLoginSubmit}>
            <Field
              label="Email hoặc Số điện thoại"
              icon={<UserRound size={18} />}
              value={loginIdentifier}
              onChange={(event) => setLoginIdentifier(event.target.value)}
              placeholder="VD: 0912345678 hoặc quan@gmail.com"
              autoComplete="username"
              autoFocus
              required
            />
            <Field
              label="Mật khẩu"
              icon={<LockKeyhole size={18} />}
              isPassword
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
            />
            <Button type="submit" size="large" fullWidth loading={loading}>
              Đăng nhập quản lý
            </Button>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: '1px dashed rgba(0, 86, 57, 0.3)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  color: 'var(--primary, #005639)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onClick={() => {
                  setLoginIdentifier('merchant@gosavingfood.vn');
                  setLoginPassword('Password123!');
                }}
              >
                ⚡ Điền tài khoản demo (Quán mẫu)
              </button>
            </div>

            <div className="merchant-auth-link">
              Chưa có tài khoản đối tác?
              <button type="button" onClick={() => switchTab('register')}>
                Đăng ký mở quán ngay
              </button>
            </div>
          </form>
        ) : (
          <form className="merchant-form" onSubmit={handleRegisterSubmit}>
            <Field
              label="Họ và tên chủ quán / Đại diện"
              icon={<UserCheck size={18} />}
              value={regName}
              onChange={(event) => setRegName(event.target.value)}
              placeholder="VD: Nguyễn Văn A"
              autoComplete="name"
              required
            />
            <Field
              label="Tên quán / Cửa hàng"
              icon={<Store size={18} />}
              value={regStoreName}
              onChange={(event) => setRegStoreName(event.target.value)}
              placeholder="VD: Tiệm Bánh Mì Sài Gòn"
              required
            />
            <div className="merchant-form-grid">
              <Field
                label="Số điện thoại di động"
                icon={<Phone size={18} />}
                type="tel"
                value={regPhone}
                onChange={(event) => setRegPhone(event.target.value)}
                placeholder="VD: 0912345678"
                autoComplete="tel"
                required
              />
              <Field
                label="Email liên hệ"
                icon={<UserRound size={18} />}
                type="email"
                value={regEmail}
                onChange={(event) => setRegEmail(event.target.value)}
                placeholder="cuahang@gmail.com"
                autoComplete="email"
                required
              />
            </div>
            <Field
              label="Địa chỉ cửa hàng"
              icon={<MapPin size={18} />}
              value={regAddress}
              onChange={(event) => setRegAddress(event.target.value)}
              placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"
              required
            />
            <SelectField
              label="Loại hình kinh doanh"
              value={regCategory}
              onChange={(event) => setRegCategory(event.target.value)}
            >
              <option value="bakery">Tiệm Bánh ngọt & Bánh mì</option>
              <option value="other">Quán Cơm & Món nóng (Việt/Á/Âu)</option>
              <option value="vegetarian">Quán Ăn Chay / Đồ xanh Healthy</option>
              <option value="beverage">Quán Trà sữa & Cà phê, Đồ uống</option>
              <option value="raw_food">Cửa hàng Trái cây & Thực phẩm tươi</option>
            </SelectField>
            <div className="merchant-form-grid">
              <Field
                label="Mật khẩu"
                icon={<LockKeyhole size={18} />}
                isPassword
                value={regPassword}
                onChange={(event) => setRegPassword(event.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete="new-password"
                required
              />
              <Field
                label="Xác nhận mật khẩu"
                icon={<LockKeyhole size={18} />}
                isPassword
                value={regConfirmPassword}
                onChange={(event) => setRegConfirmPassword(event.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                required
              />
            </div>
            {regPassword.length > 0 && (
              <small
                style={{
                  fontSize: 12,
                  marginTop: -6,
                  color:
                    pwdStrength.level === 'weak' || pwdStrength.level === 'too_short'
                      ? '#ef4444'
                      : '#005639',
                  fontWeight: 600,
                }}
              >
                Độ mạnh mật khẩu: {pwdStrength.feedback}
              </small>
            )}

            <Button type="submit" size="large" fullWidth loading={loading}>
              Đăng ký mở quán ngay
            </Button>

            <div className="merchant-auth-link">
              Đã có tài khoản đối tác?
              <button type="button" onClick={() => switchTab('login')}>
                Đăng nhập ngay
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
