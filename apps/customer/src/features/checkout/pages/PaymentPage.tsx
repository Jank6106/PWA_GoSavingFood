import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Check,
  Clock3,
  Copy,
  Download,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Button } from '@gosavingfood/ui';
import { ScreenHeader, CancelOrderModal } from '../../../shared/components';
import { supabase } from '../../../services/supabase';
import { customerService } from '../../../services/customer.service';
import type { CheckoutDraft, Order } from '../../../shared/types/customer.types';

interface PaymentPageProps {
  draft?: CheckoutDraft;
  total: number;
  isSubmitting?: boolean;
  order?: Order;
  orderId?: string;
  orderCode?: string;
  onBack: () => void;
  onCancel?: (orderId?: string, reason?: string) => void;
  onConfirm: () => void;
}

const SESSION_ORDER_ID_KEY = 'gsf_payment_order_id';
const SESSION_ORDER_CODE_KEY = 'gsf_payment_order_code';
const SESSION_PAYOS_CODE_KEY = 'gsf_payment_payos_order_code';
const SESSION_ORDER_TOTAL_KEY = 'gsf_payment_order_total';
const SESSION_EXPIRES_AT_KEY = 'gsf_payment_expires_at';

export function PaymentPage({ total, order, orderId, orderCode, onBack, onCancel, onConfirm }: PaymentPageProps) {
  // 1. Phục hồi state orderId, orderCode, total từ Props -> URL Query -> sessionStorage
  const [effectiveOrderId] = useState<string>(() => {
    if (order?.id) return order.id;
    if (orderId) return orderId;
    const urlId = new URLSearchParams(window.location.search).get('orderId');
    if (urlId) return urlId;
    try {
      return sessionStorage.getItem(SESSION_ORDER_ID_KEY) || '';
    } catch {
      return '';
    }
  });

  const [effectiveOrderCode] = useState<string>(() => {
    if (order?.orderCode) return order.orderCode;
    if (orderCode) return orderCode;
    const urlCode = new URLSearchParams(window.location.search).get('orderCode');
    if (urlCode) return urlCode;
    try {
      const saved = sessionStorage.getItem(SESSION_ORDER_CODE_KEY);
      if (saved) return saved;
    } catch {}
    if (effectiveOrderId) {
      return `GSF-${effectiveOrderId.slice(0, 6).toUpperCase()}`;
    }
    return 'GSF-ORDER';
  });

  const [effectiveTotal, setEffectiveTotal] = useState<number>(() => {
    if (total > 0) return total;
    if (order?.finalAmount && order.finalAmount > 0) return order.finalAmount;
    try {
      const saved = Number(sessionStorage.getItem(SESSION_ORDER_TOTAL_KEY));
      if (!isNaN(saved) && saved > 0) return saved;
    } catch {}
    return 0;
  });

  // Mốc thời gian kết thúc tuyệt đối (Epoch ms) để đồng bộ chống trễ khi đổi tab trình duyệt
  const [targetExpiresAt, setTargetExpiresAt] = useState<number>(() => {
    if (order?.paymentExpiresAt) {
      const parsed = new Date(order.paymentExpiresAt).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    try {
      const saved = Number(sessionStorage.getItem(SESSION_EXPIRES_AT_KEY));
      if (!isNaN(saved) && saved > 0) return saved;
    } catch {}
    const fresh = Date.now() + 30 * 60 * 1000;
    try {
      sessionStorage.setItem(SESSION_EXPIRES_AT_KEY, String(fresh));
    } catch {}
    return fresh;
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const diff = Math.floor((targetExpiresAt - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  });

  const [isExpired, setIsExpired] = useState<boolean>(() => {
    return targetExpiresAt <= Date.now();
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
  const isPaidConfirmedRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Lưu vào sessionStorage để giữ trạng thái khi mobile chuyển app ngân hàng (giấu sạch URL)
  useEffect(() => {
    try {
      if (effectiveOrderId) sessionStorage.setItem(SESSION_ORDER_ID_KEY, effectiveOrderId);
      if (effectiveOrderCode) sessionStorage.setItem(SESSION_ORDER_CODE_KEY, effectiveOrderCode);
      if (effectiveTotal > 0) sessionStorage.setItem(SESSION_ORDER_TOTAL_KEY, String(effectiveTotal));
      if (targetExpiresAt > 0) sessionStorage.setItem(SESSION_EXPIRES_AT_KEY, String(targetExpiresAt));
    } catch {}

    // Dọn sạch query parameters nếu có để thanh URL luôn sạch sẽ
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
  }, [effectiveOrderId, effectiveOrderCode, effectiveTotal, targetExpiresAt]);

  // Cập nhật targetExpiresAt khi order prop thay đổi
  useEffect(() => {
    if (order?.paymentExpiresAt) {
      const parsed = new Date(order.paymentExpiresAt).getTime();
      if (!isNaN(parsed) && parsed > 0 && parsed !== targetExpiresAt) {
        setTargetExpiresAt(parsed);
      }
    }
  }, [order?.paymentExpiresAt, targetExpiresAt]);

  // Phục hồi thông tin đơn hàng nếu component bị reload do app ngân hàng chiếm bộ nhớ
  useEffect(() => {
    if (!order && effectiveOrderId) {
      supabase
        .from('orders')
        .select('*')
        .eq('id', effectiveOrderId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.final_amount && !effectiveTotal) {
              setEffectiveTotal(data.final_amount);
            }
            if (data.payment_expires_at) {
              const parsed = new Date(data.payment_expires_at).getTime();
              if (!isNaN(parsed) && parsed > 0) {
                setTargetExpiresAt(parsed);
              }
            }
            if (data.status === 'expired' || data.status === 'cancelled') {
              setIsExpired(true);
            }
          }
        });
    }
  }, [order, effectiveOrderId, effectiveTotal]);

  const isPayosLoading = !payosData;
  const transferContent = payosData?.description || effectiveOrderCode;
  const rawAccount = payosData?.accountNumber || 'V3CAS8823316420';
  const bankAccount = rawAccount.startsWith('V3CAS') ? rawAccount : `V3CAS${rawAccount}`;
  const bankName = 'BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam';
  const accountHolder = payosData?.accountName || 'NGUYEN HUU DANH';

  // Link VietQR Pro chuẩn Napas 24/7 từ VietQR API
  const qrImageUrl = `https://img.vietqr.io/image/BIDV-${bankAccount}-compact2.png?amount=${effectiveTotal}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountHolder)}`;

  const fallbackQrData =
    payosData?.qrCode ||
    `00020101021238590010A000000727012900069704180115${bankAccount}0208QRIBFTTA5303704540${effectiveTotal}5802VN62180814${transferContent}6304`;

  const cleanupPaymentSession = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_ORDER_ID_KEY);
      sessionStorage.removeItem(SESSION_ORDER_CODE_KEY);
      sessionStorage.removeItem(SESSION_PAYOS_CODE_KEY);
      sessionStorage.removeItem(SESSION_ORDER_TOTAL_KEY);
      sessionStorage.removeItem(SESSION_EXPIRES_AT_KEY);
    } catch {}
  }, []);

  // Hàm kích hoạt xác nhận thanh toán thành công (đảm bảo chỉ chạy đúng 1 lần)
  const handlePaymentSuccess = useCallback(() => {
    if (isPaidConfirmedRef.current) return;
    isPaidConfirmedRef.current = true;
    console.log('[PaymentPage] handlePaymentSuccess triggered -> redirecting to success screen');
    cleanupPaymentSession();
    setToastMessage('Thanh toán thành công! Đang chuyển trang...');
    setTimeout(() => {
      onConfirm();
    }, 400);
  }, [onConfirm, cleanupPaymentSession]);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelPayment = useCallback(
    async (reason: string) => {
      const targetOrderId = effectiveOrderId || order?.id;
      setIsCancelling(true);

      try {
        if (targetOrderId) {
          // 1. Chuyển trạng thái đơn sang 'cancelled' trên Supabase
          await customerService.cancelOrder(
            targetOrderId,
            reason || 'Người dùng hủy thanh toán tại bước quét mã QR'
          );

          // 2. Hủy link PayOS nếu có
          let savedCode: number | null = null;
          try {
            const s = sessionStorage.getItem(SESSION_PAYOS_CODE_KEY);
            if (s) savedCode = Number(s);
          } catch {}

          const numericCode =
            payosData?.orderCode ||
            (order?.paymentOrderCode ? Number(order.paymentOrderCode) : null) ||
            savedCode;

          void customerService.cancelPayOSPayment({
            orderId: targetOrderId,
            orderCode: numericCode || undefined,
            cancellationReason: reason || 'Người dùng hủy thanh toán tại bước quét mã QR',
          });
        }

        // 3. Xóa dữ liệu phiên thanh toán
        cleanupPaymentSession();

        // 4. Đóng modal & hiển thị thông báo
        setIsCancelModalOpen(false);
        setToastMessage('Đã hủy thanh toán đơn hàng');

        // 5. Điều hướng trở về
        setTimeout(() => {
          if (onCancel) {
            onCancel(targetOrderId, reason);
          } else {
            onBack();
          }
        }, 350);
      } catch (err) {
        console.error('[PaymentPage] Lỗi khi hủy thanh toán:', err);
        setToastMessage('Không thể hủy thanh toán. Vui lòng thử lại!');
      } finally {
        setIsCancelling(false);
      }
    },
    [effectiveOrderId, order?.id, order?.paymentOrderCode, payosData?.orderCode, cleanupPaymentSession, onCancel, onBack]
  );

  // Hàm chủ động kiểm tra trạng thái thanh toán từ cả DB Supabase và PayOS API
  const checkCurrentOrderStatus = useCallback(async (isManual = false): Promise<boolean> => {
    if (isPaidConfirmedRef.current || isExpired) return false;
    const targetOrderId = effectiveOrderId || order?.id;
    if (!targetOrderId) return false;

    try {
      // 1. Kiểm tra trực tiếp bảng orders trên Supabase (siêu nhanh ~50ms)
      const { data: dbOrder, error: dbError } = await supabase
        .from('orders')
        .select('id, payment_status, status, payment_order_code')
        .eq('id', targetOrderId)
        .maybeSingle();

      if (!dbError && dbOrder) {
        if (dbOrder.status === 'expired' || dbOrder.status === 'cancelled') {
          console.log('[PaymentPage] DB query confirmed order is EXPIRED/CANCELLED:', dbOrder.status);
          setIsExpired(true);
          return false;
        }

        const isDbPaid =
          dbOrder.payment_status === 'success' ||
          dbOrder.status === 'paid' ||
          dbOrder.status === 'confirmed' ||
          dbOrder.status === 'ready' ||
          dbOrder.status === 'completed';

        if (isDbPaid) {
          console.log('[PaymentPage] DB query confirmed order is PAID:', dbOrder);
          handlePaymentSuccess();
          return true;
        }
      }

      // 2. Tra cứu trực tiếp với PayOS qua API check-status
      let savedCode: number | null = null;
      try {
        const s = sessionStorage.getItem(SESSION_PAYOS_CODE_KEY);
        if (s) savedCode = Number(s);
      } catch {}

      const numericCode =
        payosData?.orderCode ||
        (dbOrder?.payment_order_code ? Number(dbOrder.payment_order_code) : null) ||
        savedCode;

      const check = await customerService.checkPayOSStatus({
        orderCode: numericCode || undefined,
        orderId: targetOrderId,
      });

      if (check?.paid || check?.status === 'PAID') {
        console.log('[PaymentPage] PayOS API check confirmed order is PAID:', check);
        handlePaymentSuccess();
        return true;
      }

      if (isManual) {
        setToastMessage('Hệ thống chưa ghi nhận tiền về. Vui lòng đợi thêm vài giây.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.warn('[PaymentPage] checkCurrentOrderStatus error:', err);
      if (isManual) {
        setToastMessage('Lỗi kiểm tra trạng thái thanh toán. Vui lòng thử lại.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    }

    return false;
  }, [effectiveOrderId, order?.id, payosData?.orderCode, isExpired, handlePaymentSuccess]);

  // Khởi tạo / phục hồi Realtime Subscription
  const setupRealtimeChannel = useCallback(() => {
    const targetOrderId = effectiveOrderId || order?.id;
    if (!targetOrderId || isExpired || isPaidConfirmedRef.current) return;

    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch {}
      channelRef.current = null;
    }

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
          if (payload.new) {
            const isPaid =
              payload.new.payment_status === 'success' ||
              payload.new.status === 'paid' ||
              payload.new.status === 'confirmed' ||
              payload.new.status === 'ready' ||
              payload.new.status === 'completed';

            if (isPaid) {
              handlePaymentSuccess();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[PaymentPage] Realtime subscription status:', status);
      });

    channelRef.current = channel;
  }, [effectiveOrderId, order?.id, isExpired, handlePaymentSuccess]);

  // 1. Tự động kết nối tới PayOS khi mở trang thanh toán
  useEffect(() => {
    const targetOrderId = effectiveOrderId || order?.id;
    if (!targetOrderId || isExpired) return;

    let paymentPromise: Promise<any>;
    if (payosRequestedOrderIdRef.current === targetOrderId && payosPromiseRef.current) {
      paymentPromise = payosPromiseRef.current;
    } else {
      payosRequestedOrderIdRef.current = targetOrderId;
      paymentPromise = customerService.createPayOSPayment({
        orderId: targetOrderId,
        amount: effectiveTotal,
        description: effectiveOrderCode,
        items: order?.items?.map((it) => ({
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
          try {
            if (res.orderCode) {
              sessionStorage.setItem(SESSION_PAYOS_CODE_KEY, String(res.orderCode));
            }
          } catch {}
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[PaymentPage] PayOS init fallback:', err);
        }
        if (payosRequestedOrderIdRef.current === targetOrderId) {
          payosPromiseRef.current = null;
          payosRequestedOrderIdRef.current = null;
        }
      });

    return () => {
      isMounted = false;
    };
  }, [effectiveOrderId, order?.id, isExpired, effectiveTotal, effectiveOrderCode, order?.items]);

  // 2. Lắng nghe Supabase Realtime tự động xác nhận đơn
  useEffect(() => {
    setupRealtimeChannel();

    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch {}
        channelRef.current = null;
      }
    };
  }, [setupRealtimeChannel]);

  // 3. Tự động kiểm tra khi người dùng quay lại App từ app ngân hàng hoặc chuyển tab khác (visibilitychange & focus)
  useEffect(() => {
    const targetOrderId = effectiveOrderId || order?.id;
    if (!targetOrderId || isExpired) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Đồng bộ tức thời mốc thời gian thực tế ngay khi mở lại tab (chống lag/chậm)
        const remaining = Math.max(0, Math.floor((targetExpiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setIsExpired(true);
          void customerService.cleanupExpiredPendingOrders();
          return;
        }

        if (!isPaidConfirmedRef.current) {
          void checkCurrentOrderStatus();
          setTimeout(() => {
            if (!isPaidConfirmedRef.current) void checkCurrentOrderStatus();
          }, 1200);
          setTimeout(() => {
            if (!isPaidConfirmedRef.current) void checkCurrentOrderStatus();
          }, 2500);

          if (
            !channelRef.current ||
            (channelRef.current as any).state === 'closed' ||
            (channelRef.current as any).state === 'errored'
          ) {
            setupRealtimeChannel();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('pageshow', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('pageshow', handleVisibilityChange);
    };
  }, [effectiveOrderId, order?.id, isExpired, targetExpiresAt, checkCurrentOrderStatus, setupRealtimeChannel]);

  // 4. Polling kiểm tra trạng thái thanh toán từ PayOS & DB mỗi 3 giây
  useEffect(() => {
    const targetOrderId = effectiveOrderId || order?.id;
    if (!targetOrderId || isExpired) return;

    let isPolling = true;
    const interval = setInterval(async () => {
      if (!isPolling || isPaidConfirmedRef.current) return;
      try {
        const isPaid = await checkCurrentOrderStatus();
        if (isPaid && isPolling) {
          console.log('[PaymentPage] Polling detected PAID!');
          isPolling = false;
          clearInterval(interval);
        }
      } catch {}
    }, 3000);

    return () => {
      isPolling = false;
      clearInterval(interval);
    };
  }, [effectiveOrderId, order?.id, isExpired, checkCurrentOrderStatus]);

  // 5. Đếm ngược thời gian thanh toán (dựa trên mốc Timestamp tuyệt đối, không phụ thuộc vào tick của trình duyệt)
  useEffect(() => {
    if (isExpired) return;

    const syncCountdown = () => {
      const remaining = Math.max(0, Math.floor((targetExpiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setIsExpired(true);
        void customerService.cleanupExpiredPendingOrders();
        void customerService.cancelPayOSPayment({
          orderCode: payosData?.orderCode,
          orderId: effectiveOrderId,
          cancellationReason: 'Đơn hàng hết thời gian thanh toán',
        });
      }
    };

    // Chạy đồng bộ ngay lập tức
    syncCountdown();

    const timer = setInterval(syncCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetExpiresAt, isExpired, payosData?.orderCode, effectiveOrderId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCopy = (text: string, fieldName: string) => {
    if (isPayosLoading && (fieldName === 'content' || fieldName === 'stk')) {
      showToast('Đang tải mã thanh toán PayOS, vui lòng chờ 1-2 giây...');
      return;
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast(`Đã sao chép: ${text}`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleDownloadQr = () => {
    try {
      showToast('Đang chuẩn bị ảnh mã QR...');
      const svg = document.querySelector('.customer-payment-qr-wrap svg') as SVGSVGElement | null;
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          // Thêm viền trắng (quiet zone) 24px để app ngân hàng quét ảnh từ thư viện nhận diện 100%
          const padding = 24;
          canvas.width = img.width + padding * 2;
          canvas.height = img.height + padding * 2;
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding, padding);
          }
          URL.revokeObjectURL(url);
          const pngUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `VietQR-PayOS-${effectiveOrderCode}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast('Đã lưu ảnh QR chuẩn PayOS vào máy!');
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          window.open(qrImageUrl, '_blank');
        };
        img.src = url;
        return;
      }

      window.open(qrImageUrl, '_blank');
      showToast('Đang mở ảnh QR để bạn tải về.');
    } catch {
      window.open(qrImageUrl, '_blank');
      showToast('Đang mở ảnh QR để bạn tải về.');
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
        <section className="customer-payment-card" style={{ padding: '36px 20px 28px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--color-bg-muted, #f3f4f6)',
              color: 'var(--color-text-secondary, #4b5563)',
              margin: '0 auto 16px',
            }}
          >
            <Clock3 size={32} strokeWidth={2.2} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 24px' }}>
            Đơn hàng đã hết thời gian thanh toán
          </h2>
          <Button fullWidth size="lg" onClick={onBack}>
            Quay lại trang khám phá
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
            {effectiveTotal.toLocaleString('vi-VN')}đ
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

        {/* Nút tải ảnh mã QR */}
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

        <div className="customer-bank-info-card" style={{ width: '100%', marginTop: '14px' }}>
          <div className="customer-bank-info-header">
            <span>Chi tiết chuyển khoản thủ công</span>
          </div>
          <div className="customer-bank-info-list">
            {/* Số tiền */}
            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Số tiền</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val" style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                  {effectiveTotal.toLocaleString('vi-VN')}đ
                </span>
                <button
                  type="button"
                  className={`customer-copy-btn ${copiedField === 'amount' ? 'copied' : ''}`}
                  onClick={() => handleCopy(String(effectiveTotal), 'amount')}
                  title="Sao chép số tiền"
                  aria-label="Sao chép số tiền"
                >
                  {copiedField === 'amount' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>



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
                <span className="customer-bank-info-val">
                  {isPayosLoading ? 'Đang lấy STK PayOS...' : bankAccount}
                </span>
                <button
                  type="button"
                  className={`customer-copy-btn ${copiedField === 'stk' ? 'copied' : ''}`}
                  onClick={() => handleCopy(bankAccount, 'stk')}
                  title="Sao chép số tài khoản"
                  aria-label="Sao chép số tài khoản"
                  disabled={isPayosLoading}
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
          </div>
        </div>

        {/* Ghi chú tự động xác nhận */}
        <div style={{ marginTop: '14px', width: '100%', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '12.5px',
              color: 'var(--color-text-muted)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Hệ thống tự động xác nhận đơn ngay khi tiền vào tài khoản.
          </p>
        </div>

        {/* Nút hủy thanh toán */}
        <div style={{ marginTop: '18px', width: '100%' }}>
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            disabled={isCancelling}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '11px 16px',
              borderRadius: '12px',
              border: '1px solid #fee2e2',
              background: '#fff5f5',
              color: '#dc2626',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isCancelling ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Trash2 size={16} />
            <span>{isCancelling ? 'Đang hủy đơn...' : 'Hủy thanh toán đơn hàng'}</span>
          </button>
        </div>
      </section>

      {/* Modal xác nhận hủy dùng chung */}
      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        orderCode={effectiveOrderCode}
        finalAmount={effectiveTotal}
        isPaid={false}
        isSubmitting={isCancelling}
        confirmLabel="Xác nhận hủy đơn"
        onConfirm={handleCancelPayment}
      />

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
