import React, { useState } from 'react';
import { Check, Copy, Gift, Sparkles, Tag, X } from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import type { Voucher } from '../../../shared/types/customer.types';

interface VoucherPopupProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers?: Voucher[];
}

const DEFAULT_VOUCHERS: Array<Voucher & { expires: string; badge?: string; type: string }> = [
  {
    id: 'voucher-1',
    code: 'HELLOGSF',
    description: 'Giảm 20.000đ cho đơn đầu tiên từ 50.000đ',
    discountValue: 20000,
    minOrderValue: 50000,
    isActive: true,
    expires: 'Còn 30 ngày',
    badge: 'Khách mới',
    type: 'Đơn đầu',
  },
  {
    id: 'voucher-2',
    code: 'GREEN10',
    description: 'Giảm 10.000đ cho đơn từ 60.000đ',
    discountValue: 10000,
    minOrderValue: 60000,
    isActive: true,
    expires: 'Còn 15 ngày',
    badge: 'Phổ biến',
    type: 'Tiết kiệm',
  },
  {
    id: 'voucher-3',
    code: 'ECOFOOD25',
    description: 'Giảm 25.000đ cho đơn từ 120.000đ giải cứu thực phẩm',
    discountValue: 25000,
    minOrderValue: 120000,
    isActive: true,
    expires: 'Còn 7 ngày',
    badge: 'Ưu đãi lớn',
    type: 'Giảm sâu',
  },
  {
    id: 'voucher-4',
    code: 'FREESHIP15',
    description: 'Giảm 15.000đ phí giao hàng cho đơn từ 80.000đ',
    discountValue: 15000,
    minOrderValue: 80000,
    isActive: true,
    expires: 'Còn 12 ngày',
    badge: 'Miễn phí ship',
    type: 'Vận chuyển',
  },
];

export const VoucherPopup: React.FC<VoucherPopupProps> = ({ isOpen, onClose, vouchers }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const displayVouchers = vouchers && vouchers.length > 0
    ? vouchers.map((v, i) => ({
        ...v,
        expires: (DEFAULT_VOUCHERS[i]?.expires) || 'Còn hạn',
        badge: (DEFAULT_VOUCHERS[i]?.badge) || (v.discountValue >= 20000 ? 'Ưu đãi lớn' : 'Hot'),
        type: (DEFAULT_VOUCHERS[i]?.type) || 'Giảm giá',
      }))
    : DEFAULT_VOUCHERS;

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2200);
  };

  return (
    <div className="gsf-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        className="gsf-drawer-bottom"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voucher-popup-title"
      >
        <div className="gsf-drawer-handle" />

        <div className="gsf-drawer-header">
          <div className="gsf-drawer-title-group">
            <div className="gsf-drawer-icon-wrap">
              <Gift size={20} />
            </div>
            <div>
              <h2 id="voucher-popup-title" className="gsf-drawer-title">
                Mã giảm giá của tôi
              </h2>
              <p className="gsf-drawer-subtitle">
                Sao chép mã để áp dụng ưu đãi khi thanh toán
              </p>
            </div>
          </div>
          <button
            type="button"
            className="gsf-drawer-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="gsf-drawer-body">
          <div className="customer-voucher-list">
            {displayVouchers.map((item) => {
              const isCopied = copiedCode === item.code;
              return (
                <div key={item.id} className="customer-voucher-card">
                  <div className="customer-voucher-left">
                    <span className="customer-voucher-value">
                      {(item.discountValue / 1000).toFixed(0)}K
                    </span>
                    <span className="customer-voucher-tag">{item.type}</span>
                  </div>

                  <div className="customer-voucher-divider">
                    <span className="customer-voucher-notch-top" />
                    <span className="customer-voucher-dashed-line" />
                    <span className="customer-voucher-notch-bottom" />
                  </div>

                  <div className="customer-voucher-center">
                    <div className="customer-voucher-code-row">
                      <strong className="customer-voucher-code">
                        <Tag size={12} /> {item.code}
                      </strong>
                      {item.badge && (
                        <span className="customer-voucher-badge">
                          <Sparkles size={10} /> {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="customer-voucher-desc">{item.description}</p>
                    <div className="customer-voucher-meta">
                      <span>Đơn tối thiểu {item.minOrderValue.toLocaleString('vi-VN')}đ</span>
                      <span>·</span>
                      <span className="customer-voucher-expiry">{item.expires}</span>
                    </div>
                  </div>

                  <div className="customer-voucher-right">
                    <button
                      type="button"
                      className={`customer-voucher-copy-btn ${isCopied ? 'is-copied' : ''}`}
                      onClick={() => handleCopy(item.code)}
                    >
                      {isCopied ? (
                        <>
                          <Check size={14} />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="gsf-drawer-footer">
          <Button fullWidth variant="primary" size="md" onClick={onClose}>
            Xong
          </Button>
        </div>
      </div>
    </div>
  );
};
