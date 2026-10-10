import {
  Check,
  CheckCircle2,
  Clock,
  KeyRound,
  LocateFixed,
  LockKeyhole,
  MapPin,
  Phone,
  Sparkles,
  Store,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useStoreProfile } from '../hooks/useStoreProfile';
import { Button, Field, SelectField, TextAreaField } from '../components/ui';

interface FirstTimeSetupScreenProps {
  storeId: string;
  loading: boolean;
  error: string | null;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  onComplete: (storeData?: { name?: string }) => Promise<void>;
}

export function FirstTimeSetupScreen({
  storeId,
  loading,
  error,
  onChangePassword,
  onComplete,
}: FirstTimeSetupScreenProps) {
  const store = useStoreProfile(storeId);

  // Stepper state: 1 (Đổi mật khẩu), 2 (Thông tin quán), 3 (Hoàn tất)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Bước 1: Mật khẩu mới
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Bước 2: Thông tin cửa hàng
  const [name, setName] = useState(() => store.profile?.name && store.profile.name !== 'Cửa hàng' && store.profile.name !== 'Cửa hàng mới' ? store.profile.name : '');
  const [phone, setPhone] = useState(() => store.profile?.phone || '');
  const [address, setAddress] = useState(() => store.profile?.address || '');
  const [latitude, setLatitude] = useState<number | null>(() => store.profile?.latitude && store.profile.latitude !== 0 ? store.profile.latitude : null);
  const [longitude, setLongitude] = useState<number | null>(() => store.profile?.longitude && store.profile.longitude !== 0 ? store.profile.longitude : null);
  const [description, setDescription] = useState(() => store.profile?.description || '');
  const [category, setCategory] = useState(() => store.profile?.category || 'bakery');
  const [openingHours, setOpeningHours] = useState(() => store.profile?.openingHours || '07:00');
  const [closingHours, setClosingHours] = useState(() => store.profile?.closingHours || '21:00');

  const [storeError, setStoreError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');

  // Xử lý Bước 1: Đổi mật khẩu ban đầu
  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError('');

    if (!newPassword || !confirmPassword) {
      return setPasswordError('Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu.');
    }

    if (newPassword.length < 6) {
      return setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự để đảm bảo an toàn.');
    }

    if (newPassword !== confirmPassword) {
      return setPasswordError('Mật khẩu xác nhận chưa khớp với mật khẩu mới.');
    }

    setIsChangingPassword(true);
    try {
      const ok = await onChangePassword('initial', newPassword);
      if (ok) {
        setStep(2);
      } else {
        setPasswordError('Không thể cập nhật mật khẩu. Vui lòng thử lại.');
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Lỗi khi cập nhật mật khẩu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Lấy vị trí GPS Geolocation API
  const handleGetLocation = () => {
    setStoreError('');
    setLocationSuccessMsg('');

    if (!('geolocation' in navigator)) {
      return setStoreError('Trình duyệt của bạn không hỗ trợ định vị GPS. Vui lòng nhập địa chỉ cụ thể.');
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setIsLocating(false);
        setLocationSuccessMsg(`Đã lấy vị trí thành công (${lat}, ${lng})`);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Lỗi Geolocation:', err);
        // Fallback sang tọa độ trung tâm TP.HCM nếu bị chặn quyền
        setLatitude(10.7769);
        setLongitude(106.7009);
        setLocationSuccessMsg('Đã dùng tọa độ mặc định TP.HCM (10.7769, 106.7009)');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Xử lý Bước 2: Lưu thông tin cửa hàng
  const handleStoreSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStoreError('');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName || trimmedName.length < 2) {
      return setStoreError('Vui lòng nhập tên cửa hàng (tối thiểu 2 ký tự).');
    }

    if (!trimmedPhone || trimmedPhone.length < 8) {
      return setStoreError('Vui lòng nhập số điện thoại liên hệ của cửa hàng.');
    }

    if (!trimmedAddress || trimmedAddress.length < 5) {
      return setStoreError('Vui lòng nhập địa chỉ quán cụ thể để khách hàng đến nhận món.');
    }

    // Nếu chưa bấm định vị, tự động cấp tọa độ trung tâm hoặc giữ tọa độ hiện tại
    const finalLat = latitude !== null && latitude !== 0 ? latitude : 10.7769;
    const finalLng = longitude !== null && longitude !== 0 ? longitude : 106.7009;

    try {
      await store.saveProfile({
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        latitude: finalLat,
        longitude: finalLng,
        description: description.trim() || undefined,
        category,
        openingHours,
        closingHours,
      });
      setStep(3);
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : 'Không thể lưu thông tin cửa hàng.');
    }
  };

  // Hoàn tất Onboarding và vào Dashboard
  const handleFinalFinish = async () => {
    await onComplete({ name: name.trim() });
  };

  return (
    <main className="merchant-auth-page merchant-setup-page">
      <section className="merchant-setup-card">
        {/* Stepper chỉ báo tiến độ */}
        <div className="merchant-stepper" aria-label="Tiến độ thiết lập tài khoản">
          {[1, 2, 3].map((val) => (
            <div key={val}>
              <span
                className={val <= step ? 'is-active' : ''}
                style={{
                  fontWeight: 750,
                  transition: 'all 0.2s ease',
                }}
              >
                {val < step ? <Check size={16} /> : val}
              </span>
              {val < 3 && <i className={val < step ? 'is-active' : ''} />}
            </div>
          ))}
        </div>

        {/* ============================================================== */}
        {/* BƯỚC 1: BẮT BUỘC ĐỔI MẬT KHẨU LẦN ĐẦU                         */}
        {/* ============================================================== */}
        {step === 1 && (
          <form className="merchant-form merchant-setup-content" onSubmit={handlePasswordSubmit}>
            <div className="merchant-setup-icon">
              <KeyRound size={28} color="#005639" />
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              Bắt buộc đổi mật khẩu ban đầu
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 20 }}>
              Để bảo mật tài khoản được cấp từ Ban quản trị, vui lòng đặt mật khẩu mới của riêng bạn trước khi sử dụng hệ thống.
            </p>

            {(passwordError || error) && (
              <div className="merchant-form-error" style={{ marginBottom: 16 }}>
                {passwordError || error}
              </div>
            )}

            <Field
              label="Mật khẩu mới (Tối thiểu 6 ký tự)"
              icon={<LockKeyhole size={18} />}
              isPassword
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              autoComplete="new-password"
              autoFocus
              required
            />

            <Field
              label="Xác nhận mật khẩu mới"
              icon={<LockKeyhole size={18} />}
              isPassword
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              required
            />

            <Button
              type="submit"
              size="large"
              fullWidth
              loading={isChangingPassword || loading}
              style={{
                marginTop: 8,
                background: 'var(--primary, #005639)',
                fontWeight: 700,
                height: 48,
                borderRadius: 12,
              }}
            >
              Tiếp tục thiết lập thông tin quán
            </Button>
          </form>
        )}

        {/* ============================================================== */}
        {/* BƯỚC 2: THIẾT LẬP THÔNG TIN CỬA HÀNG CƠ BẢN                   */}
        {/* ============================================================== */}
        {step === 2 && (
          <form className="merchant-form merchant-setup-content" onSubmit={handleStoreSubmit}>
            <div className="merchant-setup-icon">
              <Store size={28} color="#005639" />
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              Thông tin cửa hàng của bạn
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 18 }}>
              Thiết lập thông tin vị trí và liên hệ để khách hàng dễ dàng tìm thấy và đến lấy thực phẩm cứu trợ.
            </p>

            {storeError && (
              <div className="merchant-form-error" style={{ marginBottom: 16 }}>
                {storeError}
              </div>
            )}

            <Field
              label="Tên cửa hàng / Tiệm ăn *"
              icon={<Store size={18} />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Tiệm Bánh Mì Sài Gòn"
              autoFocus
              required
            />

            <Field
              label="Số điện thoại liên hệ *"
              icon={<Phone size={18} />}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0912345678 hoặc 028 3822 8899"
              required
            />

            <TextAreaField
              label="Địa chỉ cụ thể của quán *"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"
              rows={2}
              required
            />

            {/* Khối định vị GPS Geolocation */}
            <div
              style={{
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: 12,
                padding: '12px 14px',
                background: 'var(--primary-soft, #f0fdf4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={18} color="#005639" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#005639' }}>
                    Tọa độ vị trí GPS (Bắt buộc)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#005639',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 86, 57, 0.2)',
                  }}
                >
                  <LocateFixed size={14} />
                  <span>{isLocating ? 'Đang dò GPS...' : 'Lấy vị trí hiện tại'}</span>
                </button>
              </div>

              {locationSuccessMsg ? (
                <div style={{ fontSize: 12, color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={14} /> {locationSuccessMsg}
                </div>
              ) : latitude && longitude ? (
                <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
                  📍 Tọa độ đã ghim: {latitude}, {longitude}
                </div>
              ) : (
                <small style={{ color: 'var(--text-secondary, #64748b)', fontSize: 11.5 }}>
                  Nhấn "Lấy vị trí hiện tại" để tự động ghim vị trí quán lên bản đồ tìm kiếm của khách hàng.
                </small>
              )}
            </div>

            <SelectField
              label="Loại hình thực phẩm chính"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="bakery">Tiệm Bánh ngọt & Bánh mì</option>
              <option value="other">Quán Cơm & Món nóng (Việt/Á/Âu)</option>
              <option value="vegetarian">Quán Ăn Chay / Đồ xanh Healthy</option>
              <option value="beverage">Quán Trà sữa & Cà phê, Đồ uống</option>
              <option value="raw_food">Trái cây & Nông sản tươi</option>
            </SelectField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field
                label="Giờ mở cửa"
                icon={<Clock size={16} />}
                type="time"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
              />
              <Field
                label="Giờ đóng cửa"
                icon={<Clock size={16} />}
                type="time"
                value={closingHours}
                onChange={(e) => setClosingHours(e.target.value)}
              />
            </div>

            <TextAreaField
              label="Mô tả cửa hàng (Tùy chọn)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Cửa hàng cam kết cung cấp món ăn ngon cuối ngày sạch sẽ, an toàn..."
              rows={2}
            />

            <Button
              type="submit"
              size="large"
              fullWidth
              loading={store.saving}
              style={{
                marginTop: 8,
                background: 'var(--primary, #005639)',
                fontWeight: 700,
                height: 48,
                borderRadius: 12,
              }}
            >
              Hoàn tất thiết lập
            </Button>
          </form>
        )}

        {/* ============================================================== */}
        {/* BƯỚC 3: MÀN HÌNH CHÚC MỪNG HOÀN TẤT THIẾT LẬP                 */}
        {/* ============================================================== */}
        {step === 3 && (
          <div className="merchant-setup-content merchant-setup-success">
            <span style={{ color: '#16A34A', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
              <CheckCircle2 size={68} />
            </span>

            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              Chào mừng đối tác đến với GoSavingFood!
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
              Cửa hàng của bạn đã hoàn tất kích hoạt. Bây giờ bạn có thể bắt đầu đăng những túi thực phẩm đầu tiên và nhận đơn giải cứu từ khách hàng.
            </p>

            <Button
              size="large"
              fullWidth
              loading={loading}
              onClick={handleFinalFinish}
              style={{
                background: 'var(--primary, #005639)',
                fontWeight: 700,
                fontSize: 15,
                height: 48,
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Sparkles size={18} />
              <span>Bắt đầu quản lý ngay</span>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
