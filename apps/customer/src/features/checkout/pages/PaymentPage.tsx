import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock3,
  Copy,
  Download,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components';
import { supabase } from '../../../services/supabase';
import { customerService } from '../../../services/customer.service';
import type { CheckoutDraft, Order } from '../../../shared/types/customer.types';

interface PaymentPageProps {
  draft?: CheckoutDraft;
  total: number;
  isSubmitting?: boolean;
  order?: Order;
  onBack: () => void;
  onConfirm: () => void;
}

export function PaymentPage({ total, order, onBack, onConfirm }: PaymentPageProps) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (order?.paymentExpiresAt) {
      const diff = Math.floor((new Date(order.paymentExpiresAt).getTime() - Date.now()) / 1000);
      return diff > 0 ? diff : 0;
    }
    return 900; // 15 phút đếm ngược
  });
  const [isExpired, setIsExpired] = useState(() => {
    if (order?.paymentExpiresAt) {
      return new Date(order.paymentExpiresAt).getTime() <= Date.now();
    }
    return false;
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

  // Mã đơn hàng chính thức dùng làm nội dung chuyển khoản
  const orderCode =
    order?.orderCode ||
    (order?.id ? `GSF-${order.id.slice(0, 6).toUpperCase()}` : 'GSF-ORDER');

  const transferContent = payosData?.description || orderCode;
  const bankAccount = payosData?.accountNumber || '8823316420';
  const bankName = 'BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam';
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
    if (!order?.id || isExpired) return;

    let paymentPromise: Promise<any>;
    if (payosRequestedOrderIdRef.current === order.id && payosPromiseRef.current) {
      paymentPromise = payosPromiseRef.current;
    } else {
      payosRequestedOrderIdRef.current = order.id;
      paymentPromise = customerService.createPayOSPayment({
        orderId: order.id,
        amount: total,
        description: orderCode,
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
  }, [order?.id, isExpired, total, orderCode, order?.items]);

  // 2. Lắng nghe Supabase Realtime tự động xác nhận đơn khi PayOS Webhook báo tiền về
  useEffect(() => {
    const targetOrderId = order?.id;
    if (!targetOrderId || isExpired) return;

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
          if (payload.new && (payload.new.payment_status === 'success' || payload.new.status === 'paid')) {
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
  }, [order?.id, isExpired, onConfirm]);

  // 3. Tự động kiểm tra trạng thái thanh toán từ PayOS (Polling mỗi 3 giây)
  useEffect(() => {
    const currentOrderCode = payosData?.orderCode;
    if (!currentOrderCode || isExpired) return;

    let isPolling = true;
    const interval = setInterval(async () => {
      if (!isPolling) return;
      try {
        const check = await customerService.checkPayOSStatus(currentOrderCode);
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
  }, [payosData?.orderCode, isExpired, onConfirm]);

  // 4. Đếm ngược thời gian thanh toán (TTL 15 phút)
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      void customerService.cleanupExpiredPendingOrders();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          void customerService.cleanupExpiredPendingOrders();
          return 0;
        }
        return prev - 1;
      });
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
      showToast('Đã lưu ảnh QR vào máy!');
    } catch {
      window.open(qrImageUrl, '_blank');
      showToast('Đang mở ảnh QR để bạn tải về.');
    }
  };

  const [isCheckingManual, setIsCheckingManual] = useState(false);

  const handleManualCheck = async (simulate = false) => {
    const currentOrderCode = payosData?.orderCode;
    if (!currentOrderCode) {
      showToast('Đang kết nối cổng thanh toán PayOS...');
      return;
    }
    setIsCheckingManual(true);
    try {
      showToast('Đang kiểm tra trạng thái thanh toán...');
      const check = await customerService.checkPayOSStatus(currentOrderCode, simulate);
      if (check?.paid) {
        showToast('Thanh toán thành công! Đang chuyển trang...');
        setTimeout(() => {
          onConfirm();
        }, 500);
      } else {
        showToast('Chưa ghi nhận tiền về từ ngân hàng. Vui lòng thử lại sau vài giây.');
      }
    } catch {
      showToast('Không thể kiểm tra lúc này, vui lòng thử lại.');
    } finally {
      setIsCheckingManual(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Trường hợp hết hạn thời gian thanh toán
  if (isExpired) {
    return (
      <div className="customer-screen customer-payment-screen">
        <ScreenHeader title="Hết hạn thanh toán" onBack={onBack} />
        <section className="customer-payment-card" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>⏰</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Đơn hàng đã hết thời hạn thanh toán
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
            Thời hạn 15 phút cho giao dịch này đã kết thúc. Túi thực phẩm và ưu đãi đã được trả về kệ hàng để cộng đồng tiếp tục giải cứu. Vui lòng quay lại và tiến hành đặt lại.
          </p>
          <Button fullWidth size="lg" onClick={onBack}>
            Quay lại danh mục món ăn
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="customer-screen customer-payment-screen">
      {/* 1. Header "Thanh toán" */}
      <ScreenHeader title="Thanh toán" onBack={onBack} />

      {/* 2. Khung thẻ thanh toán chính */}
      <section className="customer-payment-card" style={{ position: 'relative' }}>
        {/* Thời gian nhỏ còn lại ở góc */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#b45309',
          }}
        >
          <Clock3 size={13} />
          <span>{timeFormatted}</span>
        </div>

        {/* Số tiền thanh toán */}
        <div style={{ marginTop: '4px', textAlign: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Số tiền thanh toán
          </span>
          <div
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--color-primary)',
              lineHeight: 1.2,
              marginTop: '2px',
            }}
          >
            {total.toLocaleString('vi-VN')}đ
          </div>
        </div>

        {/* Mã QR */}
        <div className="customer-payment-qr-wrap" style={{ padding: '8px', marginTop: '2px' }}>
          {payosData?.qrCode ? (
            <div style={{ padding: '6px', background: '#fff', borderRadius: '12px' }}>
              <QRCodeSVG value={payosData.qrCode} size={200} level="M" />
            </div>
          ) : !isImgError ? (
            <img
              src={qrImageUrl}
              alt="Mã VietQR"
              className="customer-payment-qr-img"
              style={{ width: '200px', height: 'auto', borderRadius: '12px' }}
              onError={() => setIsImgError(true)}
            />
          ) : (
            <div style={{ padding: '6px', background: '#fff', borderRadius: '12px' }}>
              <QRCodeSVG value={fallbackQrData} size={200} level="M" />
            </div>
          )}
        </div>

        {/* 3. Nút tải ảnh kích thước vừa phải ngay dưới qr */}
        <button
          type="button"
          onClick={handleDownloadQr}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 16px',
            borderRadius: '10px',
            border: '1px solid #dce5df',
            background: '#f8faf9',
            color: 'var(--color-text-primary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Download size={14} color="#166B4A" />
          <span>Tải ảnh mã QR</span>
        </button>

        {/* 4. Thông tin chuyển khoản gồm: ngân hàng, stk (cho phép copy), Chủ tài khoản, Nội dung chuyển khoản (Mã đơn) */}
        <div className="customer-bank-info-card" style={{ width: '100%', marginTop: '6px' }}>
          <div className="customer-bank-info-header">
            <span>Thông tin chuyển khoản</span>
          </div>
          <div className="customer-bank-info-list">
            {/* Ngân hàng */}
            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Ngân hàng</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val" style={{ textAlign: 'right' }}>
                  {bankName}
                </span>
                <div style={{ width: 28, flexShrink: 0 }} />
              </div>
            </div>

            {/* Số tài khoản */}
            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Số tài khoản</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val">{bankAccount}</span>
                <button
                  type="button"
                  className={`customer-copy-btn ${copiedField === 'stk' ? 'copied' : ''}`}
                  onClick={() => handleCopy(bankAccount, 'stk')}
                  title="Sao chép số tài khoản"
                  aria-label="Sao chép số tài khoản"
                >
                  {copiedField === 'stk' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Chủ tài khoản */}
            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Chủ tài khoản</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val">{accountHolder}</span>
                <div style={{ width: 28, flexShrink: 0 }} />
              </div>
            </div>

            {/* Nội dung chuyển khoản */}
            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Nội dung CK (Mã đơn)</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val">{transferContent}</span>
                <button
                  type="button"
                  className={`customer-copy-btn ${copiedField === 'content' ? 'copied' : ''}`}
                  onClick={() => handleCopy(transferContent, 'content')}
                  title="Sao chép mã đơn"
                  aria-label="Sao chép mã đơn"
                >
                  {copiedField === 'content' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nút hỗ trợ xác nhận thanh toán */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '420px', margin: '16px auto 0' }}>
        <Button
          fullWidth
          size="lg"
          disabled={isCheckingManual}
          onClick={() => void handleManualCheck(false)}
        >
          {isCheckingManual ? 'Đang kiểm tra giao dịch...' : 'Tôi đã chuyển khoản (Kiểm tra ngay)'}
        </Button>

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => void handleManualCheck(true)}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px dashed #d97706',
              background: '#fffbeb',
              color: '#b45309',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            ⚡ [Dev Test] Xác nhận thanh toán thành công ngay
          </button>
        )}
      </div>

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
