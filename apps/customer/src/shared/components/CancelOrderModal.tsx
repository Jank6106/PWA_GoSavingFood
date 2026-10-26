import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@gosavingfood/ui';

export const CANCEL_REASONS = [
  'Đổi ý, không muốn mua nữa',
  'Có việc bận đột xuất, không qua lấy kịp',
  'Đặt nhầm món / nhầm cửa hàng',
  'Khung giờ lấy hàng không còn phù hợp',
  'Lý do khác',
];

export const VIETNAM_BANKS = [
  'Vietcombank',
  'MB Bank',
  'Techcombank',
  'BIDV',
  'VietinBank',
  'ACB',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'Agribank',
  'MoMo / Khác',
];

export interface BankRefundInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderCode?: string;
  finalAmount?: number;
  isPaid?: boolean;
  isSubmitting?: boolean;
  title?: string;
  subtitle?: string;
  warningText?: string;
  confirmLabel?: string;
  onConfirm: (reason: string, bankInfo?: BankRefundInfo) => void | Promise<void>;
}

export function CancelOrderModal({
  isOpen,
  onClose,
  orderCode,
  finalAmount = 0,
  isPaid = false,
  isSubmitting = false,
  title,
  subtitle,
  warningText,
  confirmLabel,
  onConfirm,
}: CancelOrderModalProps) {
  const [selectedCancelReason, setSelectedCancelReason] = useState(CANCEL_REASONS[0]);
  const [refundBank, setRefundBank] = useState(VIETNAM_BANKS[0]);
  const [refundAccountNumber, setRefundAccountNumber] = useState('');
  const [refundAccountHolder, setRefundAccountHolder] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    let bankInfo: BankRefundInfo | undefined = undefined;
    if (isPaid) {
      if (!refundAccountNumber.trim() || !refundAccountHolder.trim()) {
        setFormError('Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản để nhận tiền hoàn.');
        return;
      }
      bankInfo = {
        bankName: refundBank,
        accountNumber: refundAccountNumber.trim(),
        accountHolder: refundAccountHolder.trim().toUpperCase(),
      };
    }
    setFormError(null);
    onConfirm(selectedCancelReason, bankInfo);
  };

  const modalTitle = title || (isPaid ? 'Hủy đơn & Hoàn tiền' : 'Hủy đơn hàng');
  const modalSubtitle = subtitle || (isPaid ? 'Đơn hàng sẽ bị hủy và hoàn tiền 100%' : 'Hủy đơn hàng chưa thanh toán');
  const defaultWarning = isPaid
    ? `Quán chưa chuẩn bị món nên bạn được hủy miễn phí. Số tiền ${finalAmount.toLocaleString('vi-VN')}đ sẽ được hoàn 100% về tài khoản bạn cung cấp.`
    : 'Đơn hàng chưa thanh toán sẽ được hủy ngay lập tức và không phát sinh bất kỳ khoản phí nào.';

  const defaultConfirmLabel = isPaid ? 'Xác nhận hủy & Hoàn tiền' : 'Xác nhận hủy đơn';

  return (
    <div
      className="gsf-drawer-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="gsf-drawer-bottom gsf-drawer-bottom--danger"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="gsf-drawer-handle" />

        <div className="gsf-drawer-header">
          <div className="gsf-drawer-title-group">
            <div className="gsf-drawer-icon-wrap gsf-drawer-icon-wrap--danger">
              <AlertCircle size={20} />
            </div>
            <div>
              <h2 className="gsf-drawer-title text-danger">
                {modalTitle}
              </h2>
              <p className="gsf-drawer-subtitle">
                {modalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="gsf-drawer-close"
            onClick={onClose}
            aria-label="Đóng"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <div className="gsf-drawer-body">
          <div className="customer-delete-warning-card">
            <h4>{orderCode ? `Xác nhận hủy đơn #${orderCode}?` : 'Xác nhận hủy thanh toán?'}</h4>
            <p>{warningText || defaultWarning}</p>
          </div>

          <div className="customer-form-field">
            <label className="customer-form-label">
              Lý do hủy đơn:
            </label>
            <div className="customer-cancel-reasons-list">
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`customer-cancel-reason-item ${
                    selectedCancelReason === reason ? 'is-selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    checked={selectedCancelReason === reason}
                    onChange={() => setSelectedCancelReason(reason)}
                    disabled={isSubmitting}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {isPaid && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label className="customer-form-label" style={{ fontWeight: 750, color: 'var(--color-text-primary)' }}>
                Thông tin nhận tiền hoàn (100%):
              </label>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                  Ngân hàng thụ hưởng
                </label>
                <select
                  value={refundBank}
                  onChange={(e) => setRefundBank(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border-subtle)',
                    fontSize: '13.5px',
                    background: '#ffffff',
                    fontWeight: 600,
                  }}
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                  Số tài khoản
                </label>
                <input
                  type="text"
                  placeholder="Nhập số tài khoản ngân hàng..."
                  value={refundAccountNumber}
                  onChange={(e) => {
                    setRefundAccountNumber(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: formError && !refundAccountNumber.trim() ? '1px solid #dc2626' : '1px solid var(--color-border-subtle)',
                    fontSize: '13.5px',
                    background: '#ffffff',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                  Tên chủ tài khoản
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: NGUYEN VAN A"
                  value={refundAccountHolder}
                  onChange={(e) => {
                    setRefundAccountHolder(e.target.value.toUpperCase());
                    if (formError) setFormError(null);
                  }}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: formError && !refundAccountHolder.trim() ? '1px solid #dc2626' : '1px solid var(--color-border-subtle)',
                    fontSize: '13.5px',
                    background: '#ffffff',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                />
              </div>

              {formError && (
                <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                  {formError}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="gsf-drawer-footer customer-delete-actions">
          <Button
            fullWidth
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Giữ đơn hàng
          </Button>
          <Button
            fullWidth
            variant="destructive"
            size="md"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang xử lý...' : (confirmLabel || defaultConfirmLabel)}
          </Button>
        </div>
      </div>
    </div>
  );
}
