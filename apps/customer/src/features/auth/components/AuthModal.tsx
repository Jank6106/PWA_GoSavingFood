import { useState } from 'react';
import { Dialog, Button, Input } from '@gosavingfood/ui';
import { Smartphone, UserRound } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

export function AuthModal() {
  const { isAuthOpen, hideAuthModal, login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('0901234589');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!phone.trim() || (mode === 'register' && !name.trim())) return;
    setIsSubmitting(true);
    await login(name, phone);
    setIsSubmitting(false);
  };

  return (
    <Dialog
      isOpen={isAuthOpen}
      onClose={hideAuthModal}
      title={mode === 'login' ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản GoSavingFood'}
      className="customer-auth-dialog"
      footer={
        <Button fullWidth size="lg" isLoading={isSubmitting} onClick={submit}>
          {mode === 'login' ? 'Đăng nhập bằng OTP' : 'Đăng ký & nhận OTP'}
        </Button>
      }
    >
      <div className="customer-auth-content">
        <div className="customer-auth-mark">🌱</div>
        <p>Đăng nhập để giữ giỏ hàng, theo dõi đơn và xem tác động xanh của bạn.</p>
        {mode === 'register' && (
          <Input
            label="Họ và tên"
            value={name}
            onChange={(event) => setName(event.target.value)}
            leftIcon={<UserRound size={18} />}
            placeholder="Nguyễn Minh Anh"
          />
        )}
        <Input
          label="Số điện thoại"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          leftIcon={<Smartphone size={18} />}
          inputMode="tel"
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
