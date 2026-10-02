import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components';
import { supabase } from '../../../services/supabase';
import { customerService } from '../../../services/customer.service';
import type { CheckoutDraft, Order } from '../../../shared/types/customer.types';

interface PaymentPageProps {
  draft: CheckoutDraft;
  total: number;
  isSubmitting: boolean;
  order?: Order;
  onBack: () => void;
  onConfirm: () => void;
}

const POPULAR_BANKS = [
  { id: 'mb', name: 'MB Bank', scheme: 'mbbank://', icon: '🏦' },
  { id: 'vcb', name: 'Vietcombank', scheme: 'vietcombank://', icon: '🏛️' },
  { id: 'tcb', name: 'Techcombank', scheme: 'techcombank://', icon: '🔴' },
  { id: 'tpb', name: 'TPBank', scheme: 'tpbank://', icon: '🟣' },
  { id: 'momo', name: 'MoMo', scheme: 'momo://', icon: '👛' },
  { id: 'bidv', name: 'BIDV', scheme: 'bidvsmartbanking://', icon: '🔵' },
  { id: 'vpbank', name: 'VPBank', scheme: 'vpbankneo://', icon: '🟢' },
  { id: 'acb', name: 'ACB', scheme: 'acbapp://', icon: '🔷' },
];

export function PaymentPage({ draft, total, isSubmitting, order, onBack, onConfirm }: PaymentPageProps) {
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút đếm ngược
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBankListOpen, setIsBankListOpen] = useState(false);
  const [isImgError, setIsImgError] = useState(false);
  const [payosData, setPayosData] = useState<{
    orderCode: number;
    qrCode: string;
    checkoutUrl: string;
    accountNumber: string;
    accountName: string;
    bin: string;
    description: string;
  } | null>(null);

  const payosPromiseRef = useRef<Promise<any> | null>(null);
  const payosRequestedOrderIdRef = useRef<string | null>(null);

  const orderSuffix = draft.phone ? draft.phone.slice(-4) : '9999';
  const defaultTransferContent = `GSF ${orderSuffix}`;
  
  // Dùng dữ liệu chính thức từ PayOS hoặc tài khoản BIDV mặc định đã liên kết
  const transferContent = payosData?.description || defaultTransferContent;
  const bankAccount = payosData?.accountNumber || '8823316420';
  const bankName = 'BIDV (Ngân hàng TMCP Đầu tư và Phát triển VN)';
  const accountHolder = payosData?.accountName || 'NGUYEN HUU DANH';

  // Link VietQR Pro chuẩn Napas 24/7 từ VietQR API
  const qrImageUrl = `https://img.vietqr.io/image/BIDV-${bankAccount}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountHolder)}`;

  const fallbackQrData =
    payosData?.qrCode ||
    `00020101021238540010A000000727012600069704180112${bankAccount}0208QRIBFTTA5303704540${total}5802VN62180814${transferContent}6304`;

  // 1. Tự động kết nối tới PayOS khi mở trang thanh toán (chống tạo trùng đơn do StrictMode hoặc re-render)
  useEffect(() => {
    if (!order?.id || draft.paymentMethod === 'cash') return;

    let paymentPromise: Promise<any>;
    if (payosRequestedOrderIdRef.current === order.id && payosPromiseRef.current) {
      paymentPromise = payosPromiseRef.current;
    } else {
      payosRequestedOrderIdRef.current = order.id;
      paymentPromise = customerService.createPayOSPayment({
        orderId: order.id,
        amount: total,
        description: defaultTransferContent,
        items: order.items?.map((it) => ({
          name: it.bagName,
          quantity: it.quantity,
          price: it.unitPrice,
        })),
      });
      payosPromiseRef.current = paymentPromise;
    }

    let isMounted = true;
    paymentPromise
      .then((res) => {
        if (isMounted && res) {
          console.log('[PaymentPage] PayOS payment link ready:', res);
          setPayosData(res);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[PaymentPage] PayOS init fallback:', err);
        }
        if (payosRequestedOrderIdRef.current === order.id) {
          payosPromiseRef.current = null;
          payosRequestedOrderIdRef.current = null;
        }
      });

    return () => {
      isMounted = false;
    };
  }, [order?.id, draft.paymentMethod]);

  // 2. Lắng nghe Supabase Realtime tự động xác nhận đơn khi PayOS Webhook báo tiền về
  useEffect(() => {
    const targetOrderId = order?.id;
    if (!targetOrderId || draft.paymentMethod === 'cash') return;

    console.log('[PaymentPage] Subscribing to Supabase Realtime for order:', targetOrderId);
    const channel = supabase
      .channel(`order-payment-realtime-${targetOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${targetOrderId}`,
        },
        (payload) => {
          console.log('[PaymentPage] Realtime event received:', payload);
          if (payload.new && payload.new.payment_status === 'success') {
            showToast('Thanh toán thành công! Đang chuyển trang...');
            setTimeout(() => {
              onConfirm();
            }, 600);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, draft.paymentMethod, onConfirm]);

  // 3. Tự động kiểm tra trạng thái thanh toán từ PayOS (Polling mỗi 3 giây - hoạt động ngay cả khi chưa có Webhook URL)
  useEffect(() => {
    const orderCode = payosData?.orderCode;
    if (!orderCode || draft.paymentMethod === 'cash') return;

    let isPolling = true;
    const interval = setInterval(async () => {
      if (!isPolling) return;
      try {
        const check = await customerService.checkPayOSStatus(orderCode);
        if (check?.paid && isPolling) {
          console.log('[PaymentPage] PayOS polling detected PAID!');
          isPolling = false;
          clearInterval(interval);
          showToast('Thanh toán thành công! Đang chuyển trang...');
          setTimeout(() => {
            onConfirm();
          }, 600);
        }
      } catch {
        // bỏ qua lỗi mạng tạm thời
      }
    }, 3000);

    return () => {
      isPolling = false;
      clearInterval(interval);
    };
  }, [payosData?.orderCode, draft.paymentMethod, onConfirm]);

  // 4. Đếm ngược thời gian thanh toán
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCopy = (text: string, fieldName: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast(`Đã sao chép: ${text}`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleDownloadQr = async () => {
    try {
      showToast('Đang tải ảnh mã QR...');
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VietQR-PayOS-${transferContent}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Đã lưu ảnh QR vào máy! Mở app ngân hàng quét từ ảnh nhé.');
    } catch {
      window.open(qrImageUrl, '_blank');
      showToast('Đang mở ảnh QR để bạn tải về.');
    }
  };

  const handleSelectBank = (bank: (typeof POPULAR_BANKS)[0]) => {
    handleCopy(bankAccount, 'stk');
    showToast(`Đã chép STK! Đang mở ứng dụng ${bank.name}...`);
    setIsBankListOpen(false);

    setTimeout(() => {
      window.location.href = bank.scheme;
    }, 350);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Trường hợp khách chọn thanh toán tiền mặt tại quầy
  if (draft.paymentMethod === 'cash') {
    return (
      <div className="customer-screen">
        <ScreenHeader title="Xác nhận thanh toán" onBack={onBack} />
        <section className="customer-payment-card">
          <div className="customer-payment-icon">💵</div>
          <h1>Thanh toán tại cửa hàng</h1>
          <p>
            Bạn sẽ thanh toán <strong>{total.toLocaleString('vi-VN')}đ</strong> khi đến nhận món.
          </p>
          <Button fullWidth size="lg" isLoading={isSubmitting} onClick={onConfirm}>
            Hoàn tất đặt hàng
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="customer-screen customer-payment-screen">
      <ScreenHeader
        title="Thanh toán đơn hàng"
        subtitle={
          draft.paymentMethod === 'momo'
            ? 'Chuyển khoản MoMo / VietQR'
            : 'Chuyển khoản VietQR Pro (PayOS 24/7)'
        }
        onBack={onBack}
      />

      {/* Thông báo đếm ngược thanh toán */}
      <div className="customer-payment-timer-banner">
        <div className="customer-payment-timer-left">
          <Clock3 size={16} />
          <span>Vui lòng chuyển khoản trong:</span>
        </div>
        <span className="customer-payment-timer-countdown">{timeFormatted}</span>
      </div>

      {/* Thẻ chính hiển thị mã VietQR & Số tiền */}
      <section className="customer-payment-card">
        <div className="customer-payment-amount-box">
          <span className="customer-payment-amount-label">Số tiền cần thanh toán</span>
          <span className="customer-payment-amount-value">
            {total.toLocaleString('vi-VN')}đ
          </span>
        </div>

        {/* Khung mã QR VietQR */}
        <div className="customer-payment-qr-wrap">
          {payosData?.qrCode ? (
            <div style={{ padding: '8px', background: '#fff', borderRadius: '12px' }}>
              <QRCodeSVG value={payosData.qrCode} size={210} level="M" />
            </div>
          ) : !isImgError ? (
            <img
              src={qrImageUrl}
              alt="Mã VietQR thanh toán tự động"
              className="customer-payment-qr-img"
              onError={() => setIsImgError(true)}
            />
          ) : (
            <div style={{ padding: '8px', background: '#fff', borderRadius: '12px' }}>
              <QRCodeSVG value={fallbackQrData} size={210} level="M" />
            </div>
          )}
          <span className="customer-payment-qr-hint">
            Quét bằng bất kỳ App Ngân Hàng hoặc MoMo
          </span>
        </div>

        {/* Nút hành động 1-chạm tối ưu cho điện thoại */}
        <div className="customer-pay-actions-grid">
          <button
            type="button"
            className="customer-pay-action-btn primary"
            onClick={() => setIsBankListOpen(true)}
          >
            <div className="customer-pay-action-icon">
              <Smartphone size={20} color="#006c40" />
            </div>
            <strong className="customer-pay-action-title">Mở App Ngân Hàng</strong>
            <span className="customer-pay-action-desc">Tự mở app có trên máy</span>
          </button>

          <button
            type="button"
            className="customer-pay-action-btn secondary"
            onClick={handleDownloadQr}
          >
            <div className="customer-pay-action-icon">
              <Download size={20} color="#3e4941" />
            </div>
            <strong className="customer-pay-action-title">Lưu mã QR</strong>
            <span className="customer-pay-action-desc">Quét từ thư viện ảnh</span>
          </button>
        </div>

        {/* Thẻ thông tin tài khoản chuyển khoản (1-Tap Copy) */}
        <div className="customer-bank-info-card">
          <div className="customer-bank-info-header">
            <span>Thông tin chuyển khoản</span>
            <small style={{ color: '#006c40', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ShieldCheck size={14} /> PayOS Tự động duyệt
            </small>
          </div>
          <div className="customer-bank-info-list">
            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Ngân hàng</span>
              <span className="customer-bank-info-val">{bankName}</span>
            </div>

            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Số tài khoản</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val">{bankAccount}</span>
                <button
                  type="button"
                  className={`customer-copy-btn ${copiedField === 'stk' ? 'copied' : ''}`}
                  onClick={() => handleCopy(bankAccount, 'stk')}
                >
                  {copiedField === 'stk' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedField === 'stk' ? 'Đã chép' : 'Chép'}
                </button>
              </div>
            </div>

            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Chủ tài khoản</span>
              <span className="customer-bank-info-val">{accountHolder}</span>
            </div>

            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Số tiền</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val">{total.toLocaleString('vi-VN')}đ</span>
                <button
                  type="button"
                  className={`customer-copy-btn ${copiedField === 'amount' ? 'copied' : ''}`}
                  onClick={() => handleCopy(total.toString(), 'amount')}
                >
                  {copiedField === 'amount' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedField === 'amount' ? 'Đã chép' : 'Chép'}
                </button>
              </div>
            </div>

            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Nội dung CK</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val highlight">{transferContent}</span>
                <button
                  type="button"
                  className={`customer-copy-btn ${copiedField === 'content' ? 'copied' : ''}`}
                  onClick={() => handleCopy(transferContent, 'content')}
                >
                  {copiedField === 'content' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedField === 'content' ? 'Đã chép' : 'Chép'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh trạng thái tự động xác nhận qua PayOS Realtime */}
        <div className="customer-realtime-status-card">
          <div className="customer-status-pulse-dot" />
          <div className="customer-realtime-status-text">
            <strong>Đang chờ tín hiệu chuyển khoản...</strong>
            <p>
              Hệ thống tự động duyệt đơn ngay khi ngân hàng báo có tiền. Quý khách không cần chụp ảnh
              hóa đơn.
            </p>
          </div>
        </div>

        {/* Nút thanh toán trên web PayOS (tùy chọn) */}
        {payosData?.checkoutUrl && (
          <a
            href={payosData.checkoutUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#006c40',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '6px 12px',
            }}
          >
            <ExternalLink size={14} /> Mở cổng thanh toán PayOS trên trình duyệt
          </a>
        )}

        {/* Nút hành động hoàn tất đặt hàng */}
        <Button fullWidth size="lg" isLoading={isSubmitting} onClick={onConfirm}>
          Tôi đã chuyển khoản xong
        </Button>
      </section>

      {/* Modal / Bottom Sheet chọn App Ngân Hàng */}
      {isBankListOpen && (
        <div className="customer-bank-modal-backdrop" onClick={() => setIsBankListOpen(false)}>
          <div
            className="customer-bank-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-bank-modal-header">
              <h3>Chọn App Ngân Hàng của bạn</h3>
              <button
                type="button"
                className="customer-bank-modal-close"
                onClick={() => setIsBankListOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="customer-bank-modal-sub">
              Hệ thống sẽ sao chép số tài khoản và mở ứng dụng đã cài đặt trên điện thoại của bạn.
            </p>

            <div className="customer-bank-grid">
              {POPULAR_BANKS.map((bank) => (
                <button
                  key={bank.id}
                  type="button"
                  className="customer-bank-item"
                  onClick={() => handleSelectBank(bank)}
                >
                  <div className="customer-bank-logo-wrap">{bank.icon}</div>
                  <span className="customer-bank-name">{bank.name}</span>
                </button>
              ))}
            </div>

            <Button
              fullWidth
              variant="outline"
              size="md"
              onClick={() => setIsBankListOpen(false)}
            >
              Đóng
            </Button>
          </div>
        </div>
      )}

      {/* Toast thông báo nhanh */}
      {toastMessage && (
        <div className="customer-payment-toast">
          <Check size={16} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
