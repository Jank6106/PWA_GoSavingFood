import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  Phone,
  QrCode,
  TicketPercent,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import {
  FormSection,
  InfoRow,
  OrderItemRow,
  OrderSummary,
  ScreenHeader,
} from '../../../shared/components';
import { validateRecipientPhone } from '../../../shared/utils/validation';
import { getBagTimingInfo } from '../../../shared/utils/bagTiming';
import type { CartItem, CheckoutDraft, User, Voucher } from '../../../shared/types/customer.types';
import { customerService } from '../../../services/customer.service';

interface CheckoutPageProps {
  items: CartItem[];
  subtotal: number;
  user: User;
  vouchers: Voucher[];
  isSubmitting?: boolean;
  onBack: () => void;
  onContinue: (draft: CheckoutDraft) => void;
}

export function CheckoutPage({ items, subtotal, user, vouchers, isSubmitting = false, onBack, onContinue }: CheckoutPageProps) {
  const pickupTime = `${items[0]?.bag.pickupStart ?? '18:00'} - ${items[0]?.bag.pickupEnd ?? '20:00'}`;
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [customInputCode, setCustomInputCode] = useState('');
  const [customVoucher, setCustomVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [note, setNote] = useState('');
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);

  const voucherRef = useRef<HTMLDivElement>(null);

  // Mặc định điền Họ tên và Số điện thoại từ tài khoản đã đăng nhập
  // Nếu người dùng chưa chủ động chỉnh sửa (!nameTouched / !phoneTouched) thì tiếp tục đồng bộ
  useEffect(() => {
    if (!nameTouched && user.name) {
      setName(user.name);
    }
  }, [user.name, nameTouched]);

  useEffect(() => {
    if (!phoneTouched && user.phone) {
      setPhone(user.phone);
    }
  }, [user.phone, phoneTouched]);

  // Validation
  const isNameValid = name.trim().length >= 2;
  const phoneValidation = validateRecipientPhone(phone);
  const isPhoneValid = phoneValidation.isValid;
  const invalidTimingItem = items.find((item) => !getBagTimingInfo(item.bag).canOrder);
  const timingError = invalidTimingItem ? getBagTimingInfo(invalidTimingItem.bag).detailMessage : null;
  const isFormValid = isNameValid && isPhoneValid && !timingError;

  const voucher =
    (customVoucher &&
    customVoucher.code === voucherCode.trim().toUpperCase() &&
    customVoucher.isActive &&
    subtotal >= customVoucher.minOrderValue
      ? customVoucher
      : null) ||
    vouchers.find(
      (item) =>
        item.code === voucherCode.trim().toUpperCase() &&
        item.isActive &&
        subtotal >= item.minOrderValue
    );
  const discountAmount = voucher ? Math.min(subtotal, voucher.discountValue) : 0;
  const total = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (voucherRef.current && !voucherRef.current.contains(event.target as Node)) {
        setIsVoucherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyCustomCode = async () => {
    const rawCode = customInputCode.trim().toUpperCase();
    if (!rawCode) return;
    setVoucherError(null);
    setIsApplyingVoucher(true);

    try {
      // 1. Kiểm tra trong danh sách public vouchers trước
      const existing = vouchers.find((item) => item.code.toUpperCase() === rawCode);
      if (existing) {
        if (!existing.isActive) {
          setVoucherError('Mã ưu đãi không còn hiệu lực.');
          setIsApplyingVoucher(false);
          return;
        }
        if (subtotal < existing.minOrderValue) {
          setVoucherError(
            `Đơn hàng chưa đạt mức tối thiểu ${existing.minOrderValue.toLocaleString('vi-VN')}đ.`
          );
          setIsApplyingVoucher(false);
          return;
        }
        setVoucherCode(existing.code);
        setCustomVoucher(existing);
        setVoucherError(null);
        setIsVoucherOpen(false);
        setIsApplyingVoucher(false);
        return;
      }

      // 2. Tra cứu mã từ server (hỗ trợ mã ẩn như TMU2026 và kiểm tra giới hạn 1 lần/tài khoản)
      const fetchedVoucher = await customerService.getVoucherByCode(rawCode, user.id);
      if (!fetchedVoucher || !fetchedVoucher.isActive) {
        setVoucherError('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
        setIsApplyingVoucher(false);
        return;
      }

      if (fetchedVoucher.isAlreadyUsed) {
        setVoucherError('Bạn đã sử dụng mã ưu đãi này rồi (chỉ áp dụng 1 lần/tài khoản).');
        setIsApplyingVoucher(false);
        return;
      }

      if (subtotal < fetchedVoucher.minOrderValue) {
        setVoucherError(
          `Đơn hàng chưa đạt mức tối thiểu ${fetchedVoucher.minOrderValue.toLocaleString('vi-VN')}đ.`
        );
        setIsApplyingVoucher(false);
        return;
      }

      setVoucherCode(fetchedVoucher.code);
      setCustomVoucher(fetchedVoucher);
      setVoucherError(null);
      setIsVoucherOpen(false);
    } catch {
      setVoucherError('Không thể áp dụng mã ưu đãi lúc này. Vui lòng thử lại.');
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Chỉ cho phép nhập các chữ số thuần túy (0-9), tối đa 10 chữ số
    const digitsOnly = event.target.value.replace(/\D/g, '');
    if (digitsOnly.length <= 10) {
      setPhone(digitsOnly);
      if (!phoneTouched) setPhoneTouched(true);
    }
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    if (!nameTouched) setNameTouched(true);
  };

  return (
    <div className="customer-screen customer-checkout-screen">
      <ScreenHeader title="Xác nhận đơn hàng" onBack={onBack} />

      <div className="customer-checkout-content">
        <div className="customer-checkout-form-col">
          <FormSection title="Thông tin người nhận">
        <label className="customer-field-label">
          <div className="customer-field-label-header">
            <span>Họ và tên người nhận</span>
            {nameTouched && !isNameValid && (
              <span className="customer-field-counter is-error">Tối thiểu 2 ký tự</span>
            )}
          </div>
          <span
            className={`customer-input-wrap ${
              nameTouched && !isNameValid ? 'has-error' : ''
            } ${isNameValid && nameTouched ? 'is-valid' : ''}`}
          >
            <UserIcon size={18} />
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              onBlur={() => setNameTouched(true)}
              placeholder="Nhập họ và tên người nhận"
            />
            {isNameValid && nameTouched && (
              <Check size={18} className="customer-field-success-icon" />
            )}
          </span>
          {nameTouched && !isNameValid && (
            <span className="customer-field-error-msg">
              <AlertCircle size={14} />
              <span>Vui lòng nhập họ và tên người nhận (ít nhất 2 ký tự).</span>
            </span>
          )}
        </label>

        <label className="customer-field-label">
          <span>Số điện thoại người nhận</span>
          <span
            className={`customer-input-wrap ${
              phoneTouched && !isPhoneValid ? 'has-error' : ''
            } ${isPhoneValid ? 'is-valid' : ''}`}
          >
            <Phone size={18} />
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              onBlur={() => setPhoneTouched(true)}
              placeholder="0912345678"
              inputMode="numeric"
              maxLength={10}
            />
            {isPhoneValid && (
              <Check size={18} className="customer-field-success-icon" />
            )}
          </span>
          {phoneTouched && !isPhoneValid && (
            <span className="customer-field-error-msg">
              <AlertCircle size={14} />
              <span>Số điện thoại chưa hợp lệ</span>
            </span>
          )}
        </label>
      </FormSection>

      <FormSection title="Thông tin nhận hàng">
        <InfoRow icon={<MapPin size={19} />} label="Địa điểm" value={items[0]?.bag.merchantName} />
        <InfoRow icon={<Clock3 size={19} />} label="Khung giờ nhận" value={pickupTime} />
      </FormSection>

      <FormSection title="Đơn hàng">
        {items.map((item) => (
          <OrderItemRow
            key={item.bag.id}
            imageUrl={item.bag.imageUrl}
            name={item.bag.name}
            quantity={item.quantity}
            unitPrice={item.bag.discountPrice}
          />
        ))}
      </FormSection>

      <FormSection title="Khuyến mãi">
        <div className="customer-dropdown-container" ref={voucherRef}>
          <label className="customer-field-label">
            <span>Mã giảm giá</span>
            <button
              type="button"
              className={`customer-custom-select-trigger ${isVoucherOpen ? 'is-open' : ''}`}
              onClick={() => {
                setIsVoucherOpen(!isVoucherOpen);
              }}
            >
              <div className="customer-select-trigger-left">
                <TicketPercent size={18} />
                <div className="customer-voucher-selected-info">
                  {voucher ? (
                    <>
                      <strong className="customer-voucher-applied-code">{voucher.code}</strong>
                      <span className="customer-voucher-applied-desc">
                        -Giảm {discountAmount.toLocaleString('vi-VN')}đ
                      </span>
                    </>
                  ) : voucherCode ? (
                    <strong className="customer-voucher-applied-code">{voucherCode}</strong>
                  ) : (
                    <span className="customer-voucher-placeholder">
                      Chọn hoặc nhập mã khuyến mãi
                    </span>
                  )}
                </div>
              </div>

              <div className="customer-select-trigger-right">
                {voucher && <span className="customer-voucher-badge">Đã áp dụng</span>}
                {voucherCode && !voucher && (
                  <span className="customer-voucher-invalid-tag">Không khả dụng</span>
                )}
                <ChevronDown
                  size={18}
                  className={`customer-select-chevron ${isVoucherOpen ? 'is-rotated' : ''}`}
                />
              </div>
            </button>
          </label>

          {isVoucherOpen && (
            <div className="customer-custom-dropdown-menu customer-voucher-dropdown-menu">
              {/* Ô nhập mã ưu đãi tùy chọn */}
              <div
                className="customer-voucher-inline-input"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={customInputCode}
                  onChange={(e) => {
                    setCustomInputCode(e.target.value.toUpperCase());
                    if (voucherError) setVoucherError(null);
                  }}
                  placeholder="Nhập mã ưu đãi..."
                  disabled={isApplyingVoucher}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCustomCode();
                    }
                  }}
                />
                <button
                  type="button"
                  className="customer-voucher-apply-btn"
                  onClick={handleApplyCustomCode}
                  disabled={!customInputCode.trim() || isApplyingVoucher}
                >
                  {isApplyingVoucher ? '...' : 'Áp dụng'}
                </button>
              </div>

              {voucherError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#dc2626',
                    backgroundColor: '#fef2f2',
                    borderRadius: '8px',
                    margin: '4px 10px 8px 10px',
                    border: '1px solid #fee2e2',
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{voucherError}</span>
                </div>
              )}

              {/* Danh sách voucher có sẵn */}
              <div className="customer-voucher-list-options">
                {vouchers
                  .filter((item) => !item.isHidden)
                  .map((item) => {
                    const isEligible = subtotal >= item.minOrderValue;
                    const isSelected = voucher?.code === item.code;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!isEligible}
                        className={`customer-voucher-option-card ${
                          isSelected ? 'is-selected' : ''
                        } ${!isEligible ? 'is-disabled' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            setVoucherCode('');
                            setCustomInputCode('');
                            setCustomVoucher(null);
                            setVoucherError(null);
                          } else {
                            setVoucherCode(item.code);
                            setCustomInputCode(item.code);
                            setCustomVoucher(item);
                            setVoucherError(null);
                          }
                          setIsVoucherOpen(false);
                        }}
                      >
                        <div className="customer-voucher-card-left">
                          <div className="customer-voucher-card-code-row">
                            <strong>{item.code}</strong>
                            <span className="customer-voucher-val">
                              Giảm {item.discountValue.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                          {!isEligible && (
                            <small className="customer-voucher-min-alert">
                              Đơn tối thiểu {item.minOrderValue.toLocaleString('vi-VN')}đ
                            </small>
                          )}
                        </div>
                        <div className="customer-voucher-card-right">
                          {isSelected ? (
                            <Check size={18} className="customer-dropdown-check" />
                          ) : (
                            <span className="customer-voucher-apply-tag">
                              {isEligible ? 'Chọn mã' : 'Chưa đủ'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {voucherCode && (
                <button
                  type="button"
                  className="customer-voucher-clear-btn"
                  onClick={() => {
                    setVoucherCode('');
                    setCustomInputCode('');
                    setCustomVoucher(null);
                    setVoucherError(null);
                    setIsVoucherOpen(false);
                  }}
                >
                  Bỏ chọn voucher
                </button>
              )}
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Phương thức thanh toán">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#ffffff',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid #dce5df',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <QrCode size={18} />
          </div>
          <strong style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 650 }}>
            Chuyển khoản
          </strong>
        </div>
      </FormSection>

      <FormSection title="Ghi chú">
        <textarea
          className="customer-checkout-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ghi chú cho quán (tuỳ chọn)..."
        />
      </FormSection>

      {timingError && (
        <div
          style={{
            margin: '16px 0',
            padding: '12px 16px',
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 12,
            color: '#9a3412',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ⚠️ {invalidTimingItem?.bag.name}: {timingError}
        </div>
      )}

        </div>

        <div className="customer-checkout-summary-col">
          <OrderSummary
            rows={[
              { label: 'Tạm tính', value: `${subtotal.toLocaleString('vi-VN')}đ` },
              { label: 'Khuyến mãi', value: `-${discountAmount.toLocaleString('vi-VN')}đ`, tone: 'saving' },
              { label: 'Tổng thanh toán', value: `${total.toLocaleString('vi-VN')}đ`, tone: 'total' },
            ]}
            action={
              <Button
                fullWidth
                size="lg"
                disabled={!isFormValid || isSubmitting}
                onClick={() => {
                  if (isSubmitting) return;
                  setNameTouched(true);
                  setPhoneTouched(true);
                  if (!isFormValid) return;

                  onContinue({
                    customerName: name.trim(),
                    phone: phoneValidation.cleaned,
                    pickupTime,
                    voucherCode: voucher?.code,
                    discountAmount,
                    note,
                    paymentMethod: 'payos_vietqr',
                  });
                }}
              >
                {isSubmitting ? 'Đang khởi tạo đơn hàng...' : 'Tiếp tục thanh toán'}
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
