import { CheckCircle2, Clock, Headphones, ImageUp, KeyRound, LogOut, Mail, MapPin, MessageSquare, Pencil, Phone, Save, Send, ShoppingBag, Sparkles, Star, Trash2, X } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { compressImageFile, optimizeImageUrl } from '../../utils/browser';
import type { StoreImageUpdate, StoreProfile, StoreUpdateInput } from '../../types';
import { Button, Field, Modal, TextAreaField } from '../ui';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80';
const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80';

const isImage = (value?: string | null) =>
  Boolean(value && (value.startsWith('data:image/') || value.startsWith('http')));

export function StoreCoverHeader({
  profile,
  saving,
  onSaveImages,
}: {
  profile: StoreProfile;
  saving: boolean;
  onSaveImages: (input: StoreImageUpdate) => void;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const changeImage = async (
    event: ChangeEvent<HTMLInputElement>,
    field: keyof StoreImageUpdate
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Avatar: tỉ lệ 1:1, nén tối ưu 300px, quality 0.8 (~15-30KB)
    // Ảnh bìa: tỉ lệ 16:9, nén tối ưu 1000px, quality 0.8 (~60-100KB)
    const image =
      field === 'avatar'
        ? await compressImageFile(file, 300, 0.8)
        : await compressImageFile(file, 1000, 0.8);

    if (image) onSaveImages({ [field]: image });
    event.target.value = '';
  };

  const coverSrc =
    !coverFailed && profile.coverImage
      ? optimizeImageUrl(profile.coverImage, 1000, 80)
      : DEFAULT_COVER;

  const avatarSrc =
    !avatarFailed && profile.avatar
      ? optimizeImageUrl(profile.avatar, 300, 80)
      : DEFAULT_AVATAR;

  return (
    <section className="merchant-store-cover">
      <img
        src={coverSrc}
        alt="Không gian cửa hàng"
        loading="lazy"
        onError={() => setCoverFailed(true)}
      />
      <label className="merchant-cover-image-action">
        <ImageUp size={15} /> Thay ảnh bìa
        <input
          type="file"
          accept="image/*"
          onChange={(event) => void changeImage(event, 'coverImage')}
          disabled={saving}
        />
      </label>
      <div className="merchant-store-cover-overlay">
        <label className="merchant-avatar-edit">
          {isImage(avatarSrc) ? (
            <img
              src={avatarSrc}
              alt="Ảnh đại diện cửa hàng"
              loading="lazy"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            profile.avatar
          )}
          <span>
            <Pencil size={13} />
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => void changeImage(event, 'avatar')}
            disabled={saving}
          />
        </label>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{profile.name}</h1>
            <span className={`merchant-cover-status-badge ${profile.isOpen ? 'is-open' : 'is-closed'}`}>
              <span className="merchant-cover-status-dot" />
              {profile.isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
            </span>
          </div>
          <p>{profile.description}</p>
          <small>
            <MapPin size={14} /> {profile.address}
          </small>
        </div>
      </div>
      <div className="merchant-impact-grid">
        <div>
          <ShoppingBag size={20} />
          <span>
            <strong>{(profile.totalRescuedBags ?? 0).toLocaleString('vi-VN')}</strong>
            <small>Túi đã bán</small>
          </span>
        </div>
        <div>
          <Star size={20} fill="#facc15" color="#facc15" />
          <span>
            <strong>{profile.rating ? profile.rating.toFixed(1) : '5.0'} ★</strong>
            <small>Đánh giá sao</small>
          </span>
        </div>
      </div>
    </section>
  );
}

export function StoreInfoFormCard({ profile, saving, onSave }: { profile: StoreProfile; saving: boolean; onSave: (input: StoreUpdateInput) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<StoreUpdateInput>({
    name: profile.name,
    description: profile.description,
    phone: profile.phone,
    address: profile.address,
    openingHours: profile.openingHours || '08:00',
    closingHours: profile.closingHours || '22:00',
  });
  const [profileInputs, setProfileInputs] = useState<readonly unknown[] | null>(null);
  // Reset the draft/cache when its inputs change, before committing stale UI.
  if (profileInputs === null || [profile].some((value, index) => !Object.is(value, profileInputs[index]))) {
    setProfileInputs([profile]);

    setForm({
      name: profile.name,
      description: profile.description,
      phone: profile.phone,
      address: profile.address,
      openingHours: profile.openingHours || '08:00',
      closingHours: profile.closingHours || '22:00',
    });

  }
  const startEditing = () => {
    setForm({
      name: profile.name,
      description: profile.description,
      phone: profile.phone,
      address: profile.address,
      openingHours: profile.openingHours || '08:00',
      closingHours: profile.closingHours || '22:00',
    });
    setIsEditing(true);
  };
  const submit = (event: FormEvent) => { event.preventDefault(); onSave(form); setIsEditing(false); };
  return (
    <section className="merchant-card merchant-settings-card">
      <header>
        <div>
          <h2>Thông tin cửa hàng</h2>
        </div>
        {!isEditing && <Button size="small" variant="outline" onClick={startEditing}><Pencil size={15} /> Thay đổi thông tin</Button>}
      </header>
      <form className="merchant-form" onSubmit={submit}>
        <Field label="Tên cửa hàng" value={form.name ?? ''} disabled={!isEditing} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <TextAreaField label="Giới thiệu" value={form.description ?? ''} disabled={!isEditing} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <div className="merchant-form-grid">
          <Field label="Số điện thoại" icon={<Phone size={17} />} value={form.phone ?? ''} disabled={!isEditing} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <Field label="Địa chỉ" icon={<MapPin size={17} />} value={form.address ?? ''} disabled={!isEditing} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        </div>
        <div className="merchant-form-grid">
          <Field label="Giờ mở cửa" type="time" icon={<Clock size={17} />} value={form.openingHours ?? '08:00'} disabled={!isEditing} onChange={(event) => setForm({ ...form, openingHours: event.target.value })} />
          <Field label="Giờ đóng cửa" type="time" icon={<Clock size={17} />} value={form.closingHours ?? '22:00'} disabled={!isEditing} onChange={(event) => setForm({ ...form, closingHours: event.target.value })} />
        </div>
        {isEditing && (
          <div className="merchant-form-actions">
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}><X size={15} /> Hủy</Button>
            <Button type="submit" loading={saving}><Save size={17} /> Lưu thay đổi</Button>
          </div>
        )}
      </form>
    </section>
  );
}

export function StoreActionsListCard({ onPassword, onSupport, onLogout, onDeleteAccount }: { onPassword: () => void; onSupport: () => void; onLogout: () => void; onDeleteAccount?: () => void }) {
  const actions = [
    { icon: KeyRound, label: 'Đổi mật khẩu', detail: 'Cập nhật mật khẩu đăng nhập', action: onPassword },
    { icon: Headphones, label: 'Liên hệ hỗ trợ', detail: 'Gửi yêu cầu đến GoSavingFood', action: onSupport },
    { icon: LogOut, label: 'Đăng xuất', detail: 'Thoát khỏi tài khoản hiện tại', action: onLogout, danger: true },
    ...(onDeleteAccount ? [{ icon: Trash2, label: 'Xóa tài khoản đối tác', detail: 'Xóa vĩnh viễn cửa hàng và dữ liệu', action: onDeleteAccount, danger: true }] : []),
  ];
  return (
    <section className="merchant-card merchant-settings-actions">
      <h2>Tài khoản & hỗ trợ</h2>
      {actions.map(({ icon: Icon, label, detail, action, danger }) => (
        <button type="button" className={danger ? 'is-danger' : ''} onClick={action} key={label}>
          <span><Icon size={19} /></span>
          <div><strong>{label}</strong><small>{detail}</small></div>
          <b>›</b>
        </button>
      ))}
    </section>
  );
}

export function ChangePasswordModal({
  open,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (oldPassword: string, newPassword: string) => Promise<boolean>;
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const [openInputs, setOpenInputs] = useState<readonly unknown[] | null>(null);
  // Reset the draft/cache when its inputs change, before committing stale UI.
  if (openInputs === null || [open].some((value, index) => !Object.is(value, openInputs[index]))) {
    setOpenInputs([open]);

    if (open) {
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
      setError('');
    }

  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!oldPassword) {
      return setError('Vui lòng nhập mật khẩu hiện tại.');
    }
    if (newPassword.length < 6) {
      return setError('Mật khẩu mới cần ít nhất 6 ký tự.');
    }
    if (newPassword === oldPassword) {
      return setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
    }
    if (newPassword !== confirm) {
      return setError('Mật khẩu xác nhận chưa khớp.');
    }

    try {
      const success = await onSubmit(oldPassword, newPassword);
      if (success) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi đổi mật khẩu.');
    }
  };

  return (
    <Modal open={open} title="Đổi mật khẩu" onClose={onClose} size="small">
      <form className="merchant-form" onSubmit={submit}>
        {error && (
          <div className="merchant-form-error" role="alert">
            {error}
          </div>
        )}
        <Field
          label="Mật khẩu hiện tại"
          isPassword
          value={oldPassword}
          onChange={(event) => {
            setOldPassword(event.target.value);
            if (error) setError('');
          }}
          required
        />
        <Field
          label="Mật khẩu mới"
          isPassword
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
            if (error) setError('');
          }}
          required
        />
        <Field
          label="Xác nhận mật khẩu"
          isPassword
          value={confirm}
          onChange={(event) => {
            setConfirm(event.target.value);
            if (error) setError('');
          }}
          required
        />
        <Button type="submit" fullWidth loading={saving}>
          Cập nhật mật khẩu
        </Button>
      </form>
    </Modal>
  );
}

const MERCHANT_TOPICS = [
  '📦 Sự cố đơn hàng & Khách lấy',
  '💳 Quyết toán & Đối soát doanh thu',
  '🏪 Cập nhật hồ sơ & Địa chỉ quán',
  '⚙️ Lỗi ứng dụng / Kỹ thuật',
  '💡 Góp ý tính năng mới',
];

export function SupportModal({
  open,
  onClose,
  onSuccess,
  contactPhone,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contactPhone?: string;
}) {
  const [activeTab, setActiveTab] = useState<'form' | 'hotline'>('form');
  const [selectedTopic, setSelectedTopic] = useState(MERCHANT_TOPICS[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(contactPhone || '');
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  const [phoneInputs, setPhoneInputs] = useState<readonly unknown[] | null>(null);
  // Reset the draft/cache when its inputs change, before committing stale UI.
  if (phoneInputs === null || [contactPhone, phone].some((value, index) => !Object.is(value, phoneInputs[index]))) {
    setPhoneInputs([contactPhone, phone]);

    if (contactPhone && !phone) {
      setPhone(contactPhone);
    }

  }

  const [ticketInputs, setTicketInputs] = useState<readonly unknown[] | null>(null);
  // Reset the draft/cache when its inputs change, before committing stale UI.
  if (ticketInputs === null || [open].some((value, index) => !Object.is(value, ticketInputs[index]))) {
    setTicketInputs([open]);

    if (!open) {
      setSubmittedTicket(null);
      setSubject('');
      setDescription('');
      setActiveTab('form');
    }

  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!description.trim()) return;

    const randomTicket = `GSF-MER-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      const existingRaw = window.localStorage.getItem('gsf_merchant_support_tickets');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.unshift({
        ticketId: randomTicket,
        topic: selectedTopic,
        subject: subject.trim() || selectedTopic,
        description: description.trim(),
        phone: phone.trim(),
        createdAt: new Date().toISOString(),
      });
      window.localStorage.setItem('gsf_merchant_support_tickets', JSON.stringify(existing.slice(0, 20)));
    } catch {
      // Ignore storage error
    }

    setSubmittedTicket(randomTicket);
    onSuccess();
  };

  return (
    <Modal
      open={open}
      title="Trung tâm hỗ trợ Đối tác"
      description="Đội ngũ GoSavingFood sẵn sàng đồng hành và giải quyết nhanh chóng"
      onClose={onClose}
    >
      <div className="merchant-modal-toolbar" style={{ marginBottom: 16 }}>
        <div className="merchant-segmented" style={{ width: '100%' }}>
          <button
            type="button"
            className={activeTab === 'form' ? 'is-active' : ''}
            onClick={() => setActiveTab('form')}
          >
            <Send size={15} style={{ marginRight: 6 }} /> Gửi yêu cầu hỗ trợ
          </button>
          <button
            type="button"
            className={activeTab === 'hotline' ? 'is-active' : ''}
            onClick={() => setActiveTab('hotline')}
          >
            <Headphones size={15} style={{ marginRight: 6 }} /> Hotline & Kênh khẩn
          </button>
        </div>
      </div>

      {activeTab === 'form' ? (
        submittedTicket ? (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{ color: '#16a34a', display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <CheckCircle2 size={52} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Đã gửi yêu cầu thành công!</h3>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: 'var(--primary-soft)',
                border: '1px solid var(--border)',
                borderRadius: 999,
                color: 'var(--primary)',
                fontWeight: 800,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              Mã yêu cầu: #{submittedTicket}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, margin: '0 0 20px' }}>
              Đội ngũ Chăm sóc Đối tác GoSavingFood đã tiếp nhận thông tin và sẽ liên hệ hỗ trợ quán qua số điện thoại <strong>{phone || 'cửa hàng'}</strong> trong vòng 2-4 giờ làm việc.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button fullWidth variant="secondary" onClick={() => setSubmittedTicket(null)}>
                Gửi yêu cầu khác
              </Button>
              <Button fullWidth onClick={onClose}>
                Đã hiểu & Đóng
              </Button>
            </div>
          </div>
        ) : (
          <form className="merchant-form" onSubmit={submit}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: 'var(--primary-soft)', borderRadius: 10, fontSize: 12, color: 'var(--primary)' }}>
              <Sparkles size={16} style={{ flexShrink: 0 }} />
              <span>Hỗ trợ xử lý khẩn cấp sự cố đơn hàng, khiếu nại khách hoặc đối soát doanh thu.</span>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Chủ đề hỗ trợ <b style={{ color: 'var(--danger)' }}>*</b>
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {MERCHANT_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    style={{
                      border: selectedTopic === topic ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: selectedTopic === topic ? 'var(--primary-selected)' : '#fff',
                      color: selectedTopic === topic ? 'var(--primary)' : 'var(--text-secondary)',
                      padding: '6px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedTopic(topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <Field
              label="Tiêu đề yêu cầu"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="VD: Khách không đến nhận đơn GSF-123456..."
            />

            <TextAreaField
              label="Nội dung chi tiết"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cụ thể sự cố hoặc đề xuất để Admin hỗ trợ nhanh nhất..."
              required
            />

            <Field
              label="Số điện thoại nhận phản hồi"
              icon={<Phone size={16} />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
            />

            <Button type="submit" fullWidth>
              <Send size={16} /> Gửi yêu cầu hỗ trợ
            </Button>
          </form>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
          <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: 10, fontSize: 12, color: '#1e40af', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Headphones size={16} style={{ flexShrink: 0 }} />
            <span>Kênh hỗ trợ trực tiếp dành riêng cho Quản lý & Chủ cửa hàng đối tác.</span>
          </div>

          <a
            href="tel:19006868"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              border: '1px solid var(--border)',
              borderRadius: 14,
              textDecoration: 'none',
              color: 'inherit',
              background: '#fff',
              transition: 'background 0.15s ease',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-soft)', display: 'grid', placeItems: 'center', color: 'var(--primary)', flexShrink: 0 }}>
              <Phone size={20} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 14, color: 'var(--primary)' }}>Hotline Tổng đài: 1900 6868</strong>
              <small style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Bấm phím 2 cho Đối tác quán ăn (08:00 - 22:00 hàng ngày)</small>
            </div>
          </a>

          <a
            href="mailto:merchant-support@gosavingfood.vn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              border: '1px solid var(--border)',
              borderRadius: 14,
              textDecoration: 'none',
              color: 'inherit',
              background: '#fff',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0fdf4', display: 'grid', placeItems: 'center', color: '#16a34a', flexShrink: 0 }}>
              <Mail size={20} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 14 }}>merchant-support@gosavingfood.vn</strong>
              <small style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Tiếp nhận hợp đồng, đối soát và báo cáo sự cố 24/7</small>
            </div>
          </a>

          <a
            href="https://zalo.me"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              border: '1px solid var(--border)',
              borderRadius: 14,
              textDecoration: 'none',
              color: 'inherit',
              background: '#fff',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', display: 'grid', placeItems: 'center', color: '#2563eb', flexShrink: 0 }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 14 }}>Zalo OA: GoSavingFood Đối Tác</strong>
              <small style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Kênh chat trực tiếp với Chuyên viên Quản lý Vùng</small>
            </div>
          </a>
        </div>
      )}
    </Modal>
  );
}

export function DeleteMerchantAccountModal({
  open,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText.trim().toUpperCase() === 'XÓA' || confirmText.trim().toUpperCase() === 'XOA';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isConfirmed) return;
    await onSubmit();
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Xóa tài khoản đối tác"
      description="Hành động này mang tính vĩnh viễn và không thể khôi phục"
      onClose={onClose}
      size="small"
    >
      <form className="merchant-form" onSubmit={submit}>
        <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', fontSize: '13px', lineHeight: 1.5 }}>
          ⚠️ Khi xóa tài khoản, tất cả dữ liệu sau sẽ bị <strong>xóa vĩnh viễn</strong> khỏi GoSavingFood:
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li>Toàn bộ thông tin cửa hàng và hồ sơ đối tác.</li>
            <li>Toàn bộ danh mục túi hàng cứu trợ đang bán.</li>
            <li>Lịch sử đơn hàng, thống kê doanh thu và đánh giá.</li>
            <li>Giải phóng số điện thoại & email để có thể đăng ký lại.</li>
          </ul>
        </div>
        <Field
          label='Nhập chữ "XÓA" để xác nhận'
          value={confirmText}
          placeholder='Nhập "XÓA"'
          onChange={(e) => setConfirmText(e.target.value)}
          required
        />
        <div className="merchant-form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="danger" loading={saving} disabled={!isConfirmed}><Trash2 size={16} /> Xác nhận xóa</Button>
        </div>
      </form>
    </Modal>
  );
}
