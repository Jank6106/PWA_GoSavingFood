import { useState, useRef } from 'react';
import { Camera, ChevronRight, Gift, HelpCircle, LogOut, Mail, Pencil, Phone, ReceiptText, Share2, UserRound } from 'lucide-react';
import { Badge, Button, Input } from '@gosavingfood/ui';
import { AuthRequiredState } from '../../../shared/components';
import type { Order, User } from '../../../shared/types/customer.types';

interface ProfilePageProps {
  user: User | null;
  orders?: Order[];
  isStandalone?: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOrders: () => void;
  onUpdateProfile?: (updates: Partial<User>) => void;
  onNotifications?: () => void;
  onLocation?: () => void;
  onInstall?: () => void;
}

export function ProfilePage(props: ProfilePageProps) {
  if (!props.user) {
    return (
      <AuthRequiredState
        icon="👋"
        title="Xin chào!"
        description="Đăng nhập để quản lý tài khoản và theo dõi tác động xanh của bạn."
        onLogin={props.onLogin}
      />
    );
  }

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(props.user.name);
  const [phone, setPhone] = useState(props.user.phone);
  const [email, setEmail] = useState(props.user.email || '');
  const [avatar, setAvatar] = useState(props.user.avatar || '');
  const [coverImage, setCoverImage] = useState(props.user.coverImage || '');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const toggleInfoAccordion = () => {
    if (isInfoOpen) {
      setIsEditing(false);
      if (props.user) {
        setName(props.user.name);
        setPhone(props.user.phone);
        setEmail(props.user.email || '');
      }
    }
    setIsInfoOpen(!isInfoOpen);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const nextAvatar = reader.result;
        setAvatar(nextAvatar);
        props.onUpdateProfile?.({ avatar: nextAvatar });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const nextCover = reader.result;
        setCoverImage(nextCover);
        props.onUpdateProfile?.({ coverImage: nextCover });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    props.onUpdateProfile?.({
      name: name.trim() || props.user?.name,
      phone: phone.trim() || props.user?.phone,
      email: email.trim(),
    });
    setIsInfoOpen(false);
  };

  const completedOrders = props.orders?.filter((o) => o.status === 'completed') ?? [];
  const mealsSaved = completedOrders.length;
  const totalSavings = completedOrders.reduce(
    (sum, o) => sum + Math.max(0, o.totalOriginalPrice - o.finalAmount),
    0
  );

  return (
    <div className="customer-screen customer-profile-screen">
      <section
        className={`customer-profile-card ${coverImage ? 'has-cover' : ''}`}
        style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
      >
        <button
          type="button"
          className="customer-cover-edit-btn"
          onClick={() => coverInputRef.current?.click()}
          title="Đổi ảnh bìa"
        >
          <Camera size={13} />
          <span>Đổi ảnh bìa</span>
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleCoverFile}
        />

        <div className="customer-avatar-container">
          <div
            className="customer-avatar-wrap"
            onClick={() => avatarInputRef.current?.click()}
            role="button"
            tabIndex={0}
            title="Nhấn để đổi ảnh đại diện"
          >
            {avatar ? (
              <img src={avatar} alt={props.user.name} className="customer-avatar-img" />
            ) : (
              <span className="customer-avatar-initials">{props.user.name.charAt(0)}</span>
            )}
            <div className="customer-avatar-overlay-btn">
              <Camera size={18} />
              <span>Đổi ảnh</span>
            </div>
          </div>
          <button
            type="button"
            className="customer-avatar-badge-btn"
            onClick={() => avatarInputRef.current?.click()}
            title="Đổi ảnh đại diện"
            aria-label="Đổi ảnh đại diện"
          >
            <Camera size={12} />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarFile}
          />
        </div>

        <div className="customer-profile-details">
          <h1>{props.user.name}</h1>
          <Badge variant="success">Người cứu thực phẩm tích cực</Badge>
        </div>
      </section>

      <section>
        <div className="customer-impact-grid">
          <div>
            <strong>{mealsSaved}</strong>
            <span>Bữa ăn đã cứu</span>
          </div>
          <div>
            <strong>{totalSavings.toLocaleString('vi-VN')}đ</strong>
            <span>Đã tiết kiệm</span>
          </div>
        </div>
      </section>

      <section className="customer-menu-card">
        <div className="customer-profile-accordion">
          <button
            type="button"
            className="customer-accordion-trigger"
            onClick={toggleInfoAccordion}
            aria-expanded={isInfoOpen}
          >
            <span><UserRound size={19} /> Thông tin cá nhân</span>
            <ChevronRight size={18} className={`customer-accordion-chevron ${isInfoOpen ? 'is-open' : ''}`} />
          </button>

          {isInfoOpen && (
            <div className="customer-accordion-panel">
              <div className="customer-edit-profile-form">
                <Input
                  label="Họ và tên"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<UserRound size={18} />}
                  placeholder="Nhập họ và tên"
                  disabled={!isEditing}
                />

                <Input
                  label="Số điện thoại mặc định"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<Phone size={18} />}
                  placeholder="090 123 4567"
                  inputMode="tel"
                  disabled={!isEditing}
                />

                <Input
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail size={18} />}
                  placeholder="example@gmail.com"
                  inputMode="email"
                  disabled={!isEditing}
                />

                {!isEditing ? (
                  <div className="customer-panel-actions">
                    <Button
                      fullWidth
                      variant="primary"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil size={14} /> Chỉnh sửa
                    </Button>
                  </div>
                ) : (
                  <div className="customer-panel-actions customer-panel-actions--editing">
                    <Button
                      fullWidth
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (props.user) {
                          setName(props.user.name);
                          setPhone(props.user.phone);
                          setEmail(props.user.email || '');
                        }
                        setIsEditing(false);
                      }}
                    >
                      Hủy
                    </Button>
                    <Button
                      fullWidth
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        handleSaveProfile();
                        setIsEditing(false);
                      }}
                    >
                      Lưu thay đổi
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button type="button" onClick={props.onOrders}>
          <span><ReceiptText size={19} /> Đơn hàng của tôi</span>
          <ChevronRight size={18} />
        </button>

        <button type="button" onClick={() => window.alert('Mã giảm giá có thể dùng tại bước đặt hàng.')}>
          <span><Gift size={19} /> Mã giảm giá của tôi</span>
          <ChevronRight size={18} />
        </button>
      </section>

      <section className="customer-menu-card">
        <button type="button" onClick={() => navigator.share?.({ title: 'GoSavingFood', url: window.location.href })}>
          <span><Share2 size={19} /> Chia sẻ ứng dụng</span>
          <ChevronRight size={18} />
        </button>
        <button type="button" onClick={() => window.alert('Liên hệ hỗ trợ: support@gosavingfood.vn')}>
          <span><HelpCircle size={19} /> Trợ giúp & FAQ</span>
          <ChevronRight size={18} />
        </button>
      </section>

      <button type="button" className="customer-logout-button" onClick={props.onLogout}>
        <LogOut size={18} /> Đăng xuất
      </button>
    </div>
  );
}
