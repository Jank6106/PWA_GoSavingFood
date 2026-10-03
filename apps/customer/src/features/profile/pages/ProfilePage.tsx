import { useState, useRef } from 'react';
import {
  Bell,
  Camera,
  ChevronRight,
  Gift,
  HelpCircle,
  Info,
  LogOut,
  Mail,
  Pencil,
  Phone,
  ReceiptText,
  Share2,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Badge, Button, Input } from '@gosavingfood/ui';
import { AuthRequiredState } from '../../../shared/components';
import type { Order, User, Voucher } from '../../../shared/types/customer.types';
import {
  VoucherPopup,
  HelpSupportModal,
  VersionHistoryModal,
  PolicyModal,
  DeleteAccountModal,
} from '../components';

interface ProfilePageProps {
  user: User | null;
  orders?: Order[];
  vouchers?: Voucher[];
  isStandalone?: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOrders: () => void;
  onUpdateProfile?: (updates: Partial<User>) => void;
  onNotifications?: () => void;
  onLocation?: () => void;
  onInstall?: () => void;
  onDeleteAccount?: () => void | Promise<void>;
}

export function ProfilePage(props: ProfilePageProps) {
  if (!props.user) {
    return <AuthRequiredState onLogin={props.onLogin} />;
  }

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(props.user.name);
  const [phone, setPhone] = useState(props.user.phone);
  const [email, setEmail] = useState(props.user.email || '');
  const [avatar, setAvatar] = useState(props.user.avatar || '');
  const [coverImage, setCoverImage] = useState(props.user.coverImage || '');

  // New states for modals and notification switch
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('gsf_notifications_enabled') !== 'false';
  });
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

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

  const handleToggleNotifications = () => {
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    localStorage.setItem('gsf_notifications_enabled', String(nextVal));
    setToastFeedback(
      nextVal
        ? 'Đã bật nhận thông báo từ GoSavingFood'
        : 'Đã tắt nhận thông báo từ GoSavingFood'
    );
    setTimeout(() => {
      setToastFeedback(null);
    }, 2200);
  };

  const completedOrders = props.orders?.filter((o) => o.status === 'completed') ?? [];
  const mealsSaved = completedOrders.length;
  const totalSavings = completedOrders.reduce(
    (sum, o) => sum + Math.max(0, o.totalOriginalPrice - o.finalAmount),
    0
  );

  return (
    <div className="customer-screen customer-profile-screen">
      {/* Toast Feedback */}
      {toastFeedback && (
        <div className="customer-profile-toast-notice" role="status">
          <Bell size={16} />
          <span>{toastFeedback}</span>
        </div>
      )}

      {/* Profile Header & Cover */}
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

      {/* Impact Stats */}
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

      {/* Card 1: Quản lý thông tin & Đơn hàng, Voucher */}
      <section className="customer-menu-card">
        <div className="customer-profile-accordion">
          <button
            type="button"
            className="customer-accordion-trigger"
            onClick={toggleInfoAccordion}
            aria-expanded={isInfoOpen}
          >
            <span>
              <UserRound size={19} /> Thông tin cá nhân
            </span>
            <ChevronRight
              size={18}
              className={`customer-accordion-chevron ${isInfoOpen ? 'is-open' : ''}`}
            />
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
          <span>
            <ReceiptText size={19} /> Đơn hàng của tôi
          </span>
          <ChevronRight size={18} />
        </button>

        {/* Voucher Button triggering slide-up popup */}
        <button
          type="button"
          onClick={() => setIsVoucherOpen(true)}
          className="customer-menu-item-button"
        >
          <span>
            <Gift size={19} /> Mã giảm giá của tôi
          </span>
          <div className="customer-menu-right-meta">
            <span className="customer-menu-badge-pill">4 mã ưu đãi</span>
            <ChevronRight size={18} />
          </div>
        </button>
      </section>

      {/* Card 2: Tiện ích & Thông báo */}
      <section className="customer-menu-card">
        {/* Notification Toggle Switch */}
        <div className="customer-menu-item-row customer-menu-item-switch">
          <span>
            <Bell size={19} />
            <span className="customer-switch-text">
              <strong>Nhận thông báo</strong>
              <small>Đơn hàng sẵn sàng & ưu đãi mới</small>
            </span>
          </span>
          <label className="customer-switch-toggle" aria-label="Bật hoặc tắt nhận thông báo">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={handleToggleNotifications}
            />
            <span className="customer-switch-slider" />
          </label>
        </div>

        <button
          type="button"
          onClick={() =>
            navigator.share?.({
              title: 'GoSavingFood - Giải cứu thực phẩm ngon',
              url: window.location.href,
            })
          }
        >
          <span>
            <Share2 size={19} /> Chia sẻ ứng dụng
          </span>
          <ChevronRight size={18} />
        </button>
      </section>

      {/* Card 3: Trợ giúp, Chính sách & Phiên bản */}
      <section className="customer-menu-card">
        {/* Help & FAQ with Admin Contact */}
        <button type="button" onClick={() => setIsHelpOpen(true)}>
          <span>
            <HelpCircle size={19} /> Trợ giúp & FAQ
          </span>
          <div className="customer-menu-right-meta">
            <span className="customer-menu-badge-pill customer-menu-badge-pill--admin">
              Hỗ trợ Admin
            </span>
            <ChevronRight size={18} />
          </div>
        </button>

        {/* Policies */}
        <button type="button" onClick={() => setIsPolicyOpen(true)}>
          <span>
            <ShieldCheck size={19} /> Chính sách & Điều khoản
          </span>
          <ChevronRight size={18} />
        </button>

        {/* Version info */}
        <button type="button" onClick={() => setIsVersionOpen(true)}>
          <span>
            <Info size={19} /> Phiên bản ứng dụng
          </span>
          <div className="customer-menu-right-meta">
            <span className="customer-version-badge-inline">v1.2.0</span>
            <ChevronRight size={18} />
          </div>
        </button>
      </section>

      {/* Account Actions: Đăng xuất & Xóa tài khoản */}
      <section className="customer-profile-bottom-actions">
        <button
          type="button"
          className="customer-logout-button"
          onClick={props.onLogout}
        >
          <LogOut size={18} /> Đăng xuất
        </button>

        <button
          type="button"
          className="customer-delete-account-button"
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2 size={18} /> Xóa tài khoản
        </button>
      </section>

      {/* Modals & Popups */}
      <VoucherPopup
        isOpen={isVoucherOpen}
        onClose={() => setIsVoucherOpen(false)}
        vouchers={props.vouchers}
      />

      <HelpSupportModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        user={props.user}
      />

      <VersionHistoryModal
        isOpen={isVersionOpen}
        onClose={() => setIsVersionOpen(false)}
      />

      <PolicyModal
        isOpen={isPolicyOpen}
        onClose={() => setIsPolicyOpen(false)}
      />

      <DeleteAccountModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirmDelete={async () => {
          localStorage.removeItem('gsf_notifications_enabled');
          if (props.onDeleteAccount) {
            await props.onDeleteAccount();
          } else {
            props.onLogout();
          }
        }}
      />
    </div>
  );
}
