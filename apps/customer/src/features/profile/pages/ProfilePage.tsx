import { errorMessage } from '../../../shared/utils/errors';
import { useState, useRef } from 'react';
import {
  Bell,
  Camera,
  ChevronRight,
  Gift,
  HelpCircle,
  Info,
  Loader2,
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
import { compressAvatarFile } from '../../../shared/utils/imageCompression';
import { customerService } from '../../../services/customer.service';
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

  return <AuthenticatedProfilePage {...props} user={props.user} />;
}

function AuthenticatedProfilePage(props: ProfilePageProps & {user: User}) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(props.user.name);
  const [phone, setPhone] = useState(props.user.phone);
  const [email, setEmail] = useState(props.user.email || '');
  const [avatar, setAvatar] = useState(props.user.avatar || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Sync name, phone, email with props.user if updated externally (e.g. from onboarding modal)
  const [userInputs, setUserInputs] = useState<readonly unknown[] | null>(null);
  // Prop-backed drafts are reset before stale values can be committed.
  if (userInputs === null || [props.user?.name, props.user?.phone, props.user?.email, isEditing].some((value, index) => !Object.is(value, userInputs[index]))) {
    setUserInputs([props.user?.name, props.user?.phone, props.user?.email, isEditing]);

    if (!isEditing && props.user) {
      setName(props.user.name || '');
      setPhone(props.user.phone || '');
      setEmail(props.user.email || '');
    }

  }

  // Sync avatar with props.user.avatar if updated externally
  const [avatarInputs, setAvatarInputs] = useState<readonly unknown[] | null>(null);
  // Prop-backed drafts are reset before stale values can be committed.
  if (avatarInputs === null || [props.user?.avatar, isUploadingAvatar].some((value, index) => !Object.is(value, avatarInputs[index]))) {
    setAvatarInputs([props.user?.avatar, isUploadingAvatar]);

    if (!isUploadingAvatar) {
      setAvatar(props.user?.avatar || '');
    }

  }

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

  /**
   * Xử lý đổi ảnh đại diện với quy trình:
   * 1. 0ms Optimistic UI (URL.createObjectURL)
   * 2. Đồng bộ tức thời vào Global State / AuthContext
   * 3. Nén ảnh chuẩn 400x400 px, WebP/JPEG chất lượng 0.8 (< 100KB)
   * 4. Upload Supabase Storage bucket 'avatars'
   * 5. Cập nhật Database (users & auth user_metadata)
   * 6. Tự động rollback khi gặp sự cố
   */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value để cho phép chọn lại cùng 1 file
    e.target.value = '';

    if (!props.user?.id) {
      setToastFeedback('Vui lòng đăng nhập lại để đổi ảnh đại diện.');
      setTimeout(() => setToastFeedback(null), 3000);
      return;
    }

    const previousAvatar = avatar;
    // Bước 1 & 2: Optimistic UI - Hiển thị ngay lập tức trong 0ms
    const optimisticUrl = URL.createObjectURL(file);
    setAvatar(optimisticUrl);
    props.onUpdateProfile?.({ avatar: optimisticUrl });
    setIsUploadingAvatar(true);

    try {
      // Bước 3: Nén ảnh phía client (Canvas API, center-crop 1:1, max 400x400, quality 0.8)
      const compressed = await compressAvatarFile(file, { size: 400, quality: 0.8 });

      // Bước 4 & 5: Upload Storage và lưu vào Database
      const permanentUrl = await customerService.uploadAvatar(
        props.user.id,
        compressed.blob,
        compressed.contentType
      );

      // Cập nhật URL vĩnh viễn từ Storage
      setAvatar(permanentUrl);
      props.onUpdateProfile?.({ avatar: permanentUrl });

      setToastFeedback('Đã cập nhật ảnh đại diện thành công!');
      setTimeout(() => {
        setToastFeedback(null);
      }, 2500);
    } catch (err: unknown) {
      console.error('[ProfilePage] Upload avatar error:', err);
      // Rollback về ảnh cũ khi thất bại
      setAvatar(previousAvatar);
      props.onUpdateProfile?.({ avatar: previousAvatar });
      setToastFeedback(errorMessage(err) || 'Không thể tải ảnh lên. Vui lòng thử lại.');
      setTimeout(() => {
        setToastFeedback(null);
      }, 3200);
    } finally {
      URL.revokeObjectURL(optimisticUrl);
      setIsUploadingAvatar(false);
    }
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

  const initialLetter = (props.user.name?.trim().charAt(0) || 'U').toUpperCase();

  return (
    <div className="customer-screen customer-profile-screen">
      {/* Toast Feedback */}
      {toastFeedback && (
        <div className="customer-profile-toast-notice" role="status">
          <Bell size={16} />
          <span>{toastFeedback}</span>
        </div>
      )}

      {/* Profile Header (Bố cục căn giữa hiện đại) */}
      <section className="customer-profile-header-center">
        <div className="customer-profile-avatar-wrapper">
          <div
            className="customer-profile-avatar-circle"
            onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
            role="button"
            tabIndex={0}
            title="Nhấn để đổi ảnh đại diện"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={props.user.name}
                className="customer-profile-avatar-img"
              />
            ) : (
              <div className="customer-profile-avatar-initials">
                {initialLetter}
              </div>
            )}

            {/* Spinner loading khi đang xử lý upload */}
            {isUploadingAvatar && (
              <div className="customer-profile-avatar-loading-overlay">
                <Loader2 size={26} className="customer-profile-spinner" />
              </div>
            )}
          </div>

          {/* Nút Action Badge (Camera) ở góc dưới bên phải avatar */}
          <button
            type="button"
            className="customer-profile-camera-badge"
            onClick={() => avatarInputRef.current?.click()}
            title="Đổi ảnh đại diện"
            aria-label="Đổi ảnh đại diện"
            disabled={isUploadingAvatar}
          >
            {isUploadingAvatar ? (
              <Loader2 size={14} className="customer-profile-badge-spinner" />
            ) : (
              <Camera size={15} />
            )}
          </button>

          {/* Input file ẩn hỗ trợ Camera và File Picker */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="customer-profile-file-input"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>

        {/* Họ tên in đậm rõ ràng ngay bên dưới avatar */}
        <div className="customer-profile-header-details">
          <h1 className="customer-profile-name">{props.user.name}</h1>
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
