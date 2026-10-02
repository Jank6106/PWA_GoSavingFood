import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  Phone,
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
import type { CartItem, CheckoutDraft, User, Voucher } from '../../../shared/types/customer.types';

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
  const defaultPickup = `${items[0]?.bag.pickupStart ?? '18:00'} - ${items[0]?.bag.pickupEnd ?? '20:00'}`;
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [pickupTime, setPickupTime] = useState(defaultPickup);
  const [voucherCode, setVoucherCode] = useState('');
  const [customInputCode, setCustomInputCode] = useState('');
  const [note, setNote] = useState('');
  const [isPickupOpen, setIsPickupOpen] = useState(false);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);

  const pickupRef = useRef<HTMLDivElement>(null);
  const voucherRef = useRef<HTMLDivElement>(null);

  const voucher = vouchers.find(
    (item) =>
      item.code === voucherCode.trim().toUpperCase() &&
      item.isActive &&
      subtotal >= item.minOrderValue
  );
  const discountAmount = voucher?.discountValue ?? 0;
  const total = Math.max(0, subtotal - discountAmount);

  const pickupOptions = [
    { time: defaultPickup, tag: 'Theo giờ quán' },
    { time: '19:30 - 20:30', tag: 'Ca tối' },
    { time: '20:00 - 21:00', tag: 'Ca muộn' },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickupRef.current && !pickupRef.current.contains(event.target as Node)) {
        setIsPickupOpen(false);
      }
      if (voucherRef.current && !voucherRef.current.contains(event.target as Node)) {
        setIsVoucherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyCustomCode = () => {
    if (!customInputCode.trim()) return;
    setVoucherCode(customInputCode.trim().toUpperCase());
    setIsVoucherOpen(false);
  };

  return (
    <div className="customer-screen customer-checkout-screen">
      <ScreenHeader title="Xác nhận đơn hàng" onBack={onBack} />

      <FormSection title="Thông tin khách hàng">
        <label className="customer-field-label">
          <span>Họ và tên</span>
          <span className="customer-input-wrap">
            <UserIcon size={18} />
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nhập họ và tên"
            />
          </span>
        </label>
        <label className="customer-field-label">
          <span>Số điện thoại</span>
          <span className="customer-input-wrap">
            <Phone size={18} />
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Nhập số điện thoại"
              inputMode="tel"
            />
          </span>
        </label>
      </FormSection>

      <FormSection title="Thông tin nhận hàng">
        <InfoRow icon={<MapPin size={19} />} label="Địa điểm" value={items[0]?.bag.merchantName} />

        <div className="customer-dropdown-container" ref={pickupRef}>
          <label className="customer-field-label">
            <span>Khung giờ nhận</span>
            <button
              type="button"
              className={`customer-custom-select-trigger ${isPickupOpen ? 'is-open' : ''}`}
              onClick={() => {
                setIsPickupOpen(!isPickupOpen);
                setIsVoucherOpen(false);
              }}
            >
              <div className="customer-select-trigger-left">
                <Clock3 size={18} />
                <span className="customer-select-value">{pickupTime}</span>
              </div>
              <ChevronDown
                size={18}
                className={`customer-select-chevron ${isPickupOpen ? 'is-rotated' : ''}`}
              />
            </button>
          </label>

          {isPickupOpen && (
            <div className="customer-custom-dropdown-menu">
              {pickupOptions.map((opt) => {
                const isSelected = pickupTime === opt.time;
                return (
                  <button
                    key={opt.time}
                    type="button"
                    className={`customer-dropdown-option ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setPickupTime(opt.time);
                      setIsPickupOpen(false);
                    }}
                  >
                    <div className="customer-dropdown-option-info">
                      <span className="customer-dropdown-time">{opt.time}</span>
                      {opt.tag && <small className="customer-dropdown-tag">{opt.tag}</small>}
                    </div>
                    {isSelected && <Check size={16} className="customer-dropdown-check" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
                setIsPickupOpen(false);
              }}
            >
              <div className="customer-select-trigger-left">
                <TicketPercent size={18} />
                <div className="customer-voucher-selected-info">
                  {voucher ? (
                    <>
                      <strong className="customer-voucher-applied-code">{voucher.code}</strong>
                      <span className="customer-voucher-applied-desc">
                        -Giảm {voucher.discountValue.toLocaleString('vi-VN')}đ
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
                  onChange={(e) => setCustomInputCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã ưu đãi..."
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
                  disabled={!customInputCode.trim()}
                >
                  Áp dụng
                </button>
              </div>

              {/* Danh sách voucher có sẵn */}
              <div className="customer-voucher-list-options">
                {vouchers.map((item) => {
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
                        } else {
                          setVoucherCode(item.code);
                          setCustomInputCode(item.code);
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
                        <p>{item.description}</p>
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
                    setIsVoucherOpen(false);
                  }}
                >
                  Bỏ áp dụng mã khuyến mãi
                </button>
              )}
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Ghi chú cho cửa hàng">
        <textarea
          className="customer-checkout-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ví dụ: Không lấy dụng cụ dùng một lần, lấy ít cay..."
        />
      </FormSection>

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
            disabled={!name.trim() || !phone.trim() || isSubmitting}
            onClick={() => {
              if (isSubmitting) return;
              onContinue({
                customerName: name,
                phone,
                pickupTime,
                voucherCode: voucher?.code,
                discountAmount,
                note,
                paymentMethod: 'banking',
              });
            }}
          >
            {isSubmitting ? 'Đang khởi tạo đơn hàng...' : 'Tiếp tục thanh toán'}
          </Button>
        }
      />
    </div>
  );
}
