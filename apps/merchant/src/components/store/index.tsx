import { Clock, Headphones, ImageUp, KeyRound, LogOut, MapPin, Pencil, Phone, Save, Send, ShoppingBag, Star, X } from 'lucide-react';
import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { optimizeImageUrl } from '../../services/utils';
import type { StoreImageUpdate, StoreProfile, StoreUpdateInput } from '../../types';
import { Button, Field, Modal, TextAreaField } from '../ui';

const readImage = (file?: File) => new Promise<string | null>((resolve, reject) => { if (!file) return resolve(null); const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Không thể đọc ảnh.')); reader.readAsDataURL(file); });
const isImage = (value: string) => value.startsWith('data:image/') || value.startsWith('http');

export function StoreCoverHeader({ profile, saving, onSaveImages }: { profile: StoreProfile; saving: boolean; onSaveImages: (input: StoreImageUpdate) => void }) {
  const changeImage = async (event: ChangeEvent<HTMLInputElement>, field: keyof StoreImageUpdate) => { const image = await readImage(event.target.files?.[0]); if (image) onSaveImages({ [field]: image }); event.target.value = ''; };
  return (
    <section className="merchant-store-cover">
      <img src={optimizeImageUrl(profile.coverImage, 800, 75)} alt="Không gian cửa hàng" loading="lazy" />
      <label className="merchant-cover-image-action">
        <ImageUp size={15} /> Thay ảnh bìa
        <input type="file" accept="image/*" onChange={(event) => void changeImage(event, 'coverImage')} disabled={saving} />
      </label>
      <div className="merchant-store-cover-overlay">
        <label className="merchant-avatar-edit">
          {isImage(profile.avatar) ? <img src={optimizeImageUrl(profile.avatar, 160, 80)} alt="Ảnh đại diện cửa hàng" loading="lazy" /> : profile.avatar}
          <span><Pencil size={13} /></span>
          <input type="file" accept="image/*" onChange={(event) => void changeImage(event, 'avatar')} disabled={saving} />
        </label>
        <div>
          <h1>{profile.name}</h1>
          <p>{profile.description}</p>
          <small><MapPin size={14} /> {profile.address}</small>
        </div>
      </div>
      <div className="merchant-impact-grid">
        <div>
          <ShoppingBag size={20} />
          <span>
            <strong>{profile.totalRescuedBags.toLocaleString('vi-VN')}</strong>
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

  useEffect(() => {
    setForm({
      name: profile.name,
      description: profile.description,
      phone: profile.phone,
      address: profile.address,
      openingHours: profile.openingHours || '08:00',
      closingHours: profile.closingHours || '22:00',
    });
  }, [profile]);

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

export function StoreActionsListCard({ onPassword, onSupport, onLogout }: { onPassword: () => void; onSupport: () => void; onLogout: () => void }) { const actions = [{ icon: KeyRound, label: 'Đổi mật khẩu', detail: 'Cập nhật mật khẩu đăng nhập', action: onPassword }, { icon: Headphones, label: 'Liên hệ hỗ trợ', detail: 'Gửi yêu cầu đến GoSavingFood', action: onSupport }, { icon: LogOut, label: 'Đăng xuất', detail: 'Thoát khỏi tài khoản hiện tại', action: onLogout, danger: true }]; return <section className="merchant-card merchant-settings-actions"><h2>Tài khoản & hỗ trợ</h2>{actions.map(({ icon: Icon, label, detail, action, danger }) => <button type="button" className={danger ? 'is-danger' : ''} onClick={action} key={label}><span><Icon size={19} /></span><div><strong>{label}</strong><small>{detail}</small></div><b>›</b></button>)}</section>; }
export function ChangePasswordModal({ open, saving, onClose, onSubmit }: { open: boolean; saving: boolean; onClose: () => void; onSubmit: (oldPassword: string, newPassword: string) => Promise<boolean> }) { const [oldPassword, setOldPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const submit = async (event: FormEvent) => { event.preventDefault(); if (newPassword.length < 6) return setError('Mật khẩu mới cần ít nhất 6 ký tự.'); if (newPassword !== confirm) return setError('Mật khẩu xác nhận chưa khớp.'); if (await onSubmit(oldPassword, newPassword)) onClose(); }; return <Modal open={open} title="Đổi mật khẩu" onClose={onClose} size="small"><form className="merchant-form" onSubmit={submit}><Field label="Mật khẩu hiện tại" isPassword value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required /><Field label="Mật khẩu mới" isPassword value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><Field label="Xác nhận mật khẩu" isPassword value={confirm} onChange={(event) => setConfirm(event.target.value)} error={error} required /><Button type="submit" fullWidth loading={saving}>Cập nhật mật khẩu</Button></form></Modal>; }
export function SupportModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) { const [subject, setSubject] = useState(''); const [description, setDescription] = useState(''); const submit = (event: FormEvent) => { event.preventDefault(); onSuccess(); onClose(); }; return <Modal open={open} title="Liên hệ hỗ trợ" description="Đội ngũ GoSavingFood sẽ phản hồi sớm nhất" onClose={onClose}><form className="merchant-form" onSubmit={submit}><Field label="Chủ đề" value={subject} onChange={(event) => setSubject(event.target.value)} required /><TextAreaField label="Mô tả vấn đề" value={description} onChange={(event) => setDescription(event.target.value)} required /><Button type="submit" fullWidth><Send size={16} /> Gửi yêu cầu</Button></form></Modal>; }
