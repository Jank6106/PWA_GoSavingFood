import { useState } from 'react';
import { Dialog, Button, Input } from '@gosavingfood/ui';
import { KeyRound, Smartphone, UserRound } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

export function AuthModal() {
  const { isAuthOpen, hideAuthModal, login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('customer@example.com');
  const [password, setPassword] = useState('Password123!');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!identifier.trim() || (mode === 'register' && !name.trim())) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await login(name, identifier, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Xác thực không thành công.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isAuthOpen}
      onClose={hideAuthModal}
      title={mode === 'login' ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản GoSavingFood'}
      className="customer-auth-dialog"
      footer={
        <Button fullWidth size="lg" isLoading={isSubmitting} onClick={submit}>
          {mode === 'login' ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
        </Button>
      }
    >
      <div className="customer-auth-content">
        <div className="customer-auth-mark">🌱</div>
        <p>Đăng nhập để giữ giỏ hàng, theo dõi đơn và xem tác động xanh của bạn.</p>

        {errorMessage && (
          <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>
            {errorMessage}
          </div>
        )}

        {mode === 'register' && (
          <Input
            label="Họ và tên"
            value={name}
            onChange={(event) => setName(event.target.value)}
            leftIcon={<UserRound size={18} />}
            placeholder="Nguyễn Văn A"
          />
        )}
        <Input
          label="Email hoặc Số điện thoại"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          leftIcon={<Smartphone size={18} />}
          placeholder="customer@example.com"
        />
        <Input
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          leftIcon={<KeyRound size={18} />}
          placeholder="••••••••"
        />
        <div className="customer-auth-switch">
          <span>{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span>
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
