import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
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

export function PaymentPage({ draft, total, isSubmitting, order, onBack, onConfirm }: PaymentPageProps) {
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút đếm ngược
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isImgError, setIsImgError] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
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

  const transferContent = orderCode;
  const rawAccount = payosData?.accountNumber || '8823316420';
  // Chỉ giữ lại số tài khoản ngân hàng thực tế (loại bỏ tiền tố như V3CAS)
  const bankAccount = rawAccount.replace(/^[A-Za-z0-9]*?(?=\d{8,})/, '') || '8823316420';
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
    if (!order?.id || draft.paymentMethod === 'cash') return;

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

  // 3. Tự động kiểm tra trạng thái thanh toán từ PayOS (Polling mỗi 3 giây)
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
      showToast('Đã lưu ảnh QR vào máy!');
    } catch {
      window.open(qrImageUrl, '_blank');
      showToast('Đang mở ảnh QR để bạn tải về.');
    }
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
        <div className="customer-payment-qr-wrap" style={{ padding: '8px', marginTop: '2px', position: 'relative' }}>
          {timeLeft <= 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(4px)',
                borderRadius: '16px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <AlertTriangle size={36} color="#ef4444" style={{ marginBottom: '8px' }} />
              <strong style={{ fontSize: '15px', color: '#b91c1c' }}>Hết thời gian giữ đơn</strong>
              <p style={{ margin: '4px 0 12px', fontSize: '12px', color: '#6b7280' }}>
                Mã QR này đã hết hạn hiệu lực 15 phút. Vui lòng quay lại đặt lại để đảm bảo quán còn suất ăn.
              </p>
              <Button size="sm" variant="outline" onClick={onBack}>
                Quay lại đặt đơn khác
              </Button>
            </div>
          )}

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

        {/* Action buttons dưới QR: Tải ảnh QR & Mở cổng PayOS (nếu có) */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleDownloadQr}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              border: '1px solid #dce5df',
              background: '#f8faf9',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Download size={14} color="#166B4A" />
            <span>Tải ảnh mã QR</span>
          </button>

          {payosData?.checkoutUrl && (
            <a
              href={payosData.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '10px',
                border: '1px solid #166B4A',
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={14} />
              <span>Cổng thanh toán PayOS</span>
            </a>
          )}
        </div>

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

        {/* Nút kiểm tra trạng thái thanh toán thủ công (Manual Verification CTA) */}
        <div style={{ width: '100%', marginTop: '6px' }}>
          <Button
            fullWidth
            size="md"
            variant="primary"
            isLoading={isCheckingStatus}
            onClick={async () => {
              if (isCheckingStatus) return;
              setIsCheckingStatus(true);
              try {
                // Kiểm tra trực tiếp qua DB hoặc PayOS
                if (payosData?.orderCode) {
                  const check = await customerService.checkPayOSStatus(payosData.orderCode);
                  if (check?.paid) {
                    showToast('Đã xác nhận thanh toán thành công!');
                    setTimeout(() => onConfirm(), 400);
                    return;
                  }
                }
                if (order?.id) {
                  const { data: ord } = await supabase
                    .from('orders')
                    .select('payment_status')
                    .eq('id', order.id)
                    .single();
                  if (ord?.payment_status === 'success') {
                    showToast('Đã xác nhận thanh toán thành công!');
                    setTimeout(() => onConfirm(), 400);
                    return;
                  }
                }
                showToast('Hệ thống đang chờ giao dịch từ ngân hàng. Vui lòng thử lại sau vài giây!');
              } catch {
                showToast('Không thể kết nối máy chủ kiểm tra. Vui lòng thử lại.');
              } finally {
                setIsCheckingStatus(false);
              }
            }}
          >
            <RefreshCw size={15} style={{ marginRight: '6px' }} />
            Tôi đã chuyển khoản thành công
          </Button>

          <p
            style={{
              margin: '8px 0 0',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            🛡️ Bảo đảm Yindii: Tiền được giữ an toàn trên hệ thống và hoàn 100% nếu bạn hủy trước giờ nhận 2 tiếng.
          </p>
        </div>
      </section>

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
