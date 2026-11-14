import { useEffect, useRef, useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { paymentService } from '../services/payment.service';
import { customerService } from '../services/customer.service';
import type { CheckoutDraft, Order } from '../shared/types/customer.types';
export interface PaymentPageProps {
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

export function usePayment({ total, order, orderId, orderCode, onBack, onCancel, onConfirm }: PaymentPageProps) {
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
      const saved = (sessionStorage.getItem(SESSION_ORDER_ID_KEY) === effectiveOrderId ? sessionStorage.getItem(SESSION_ORDER_CODE_KEY) : null);
      if (saved) return saved;
    } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
    if (effectiveOrderId) {
      return `GSF-${effectiveOrderId.slice(0, 6).toUpperCase()}`;
    }
    return 'GSF-ORDER';
  });

  const [effectiveTotal, setEffectiveTotal] = useState<number>(() => {
    if (total > 0) return total;
    if (order?.finalAmount && order.finalAmount > 0) return order.finalAmount;
    try {
      const saved = Number((sessionStorage.getItem(SESSION_ORDER_ID_KEY) === effectiveOrderId ? sessionStorage.getItem(SESSION_ORDER_TOTAL_KEY) : null));
      if (!isNaN(saved) && saved > 0) return saved;
    } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
    return 0;
  });

  // Mốc thời gian kết thúc tuyệt đối (Epoch ms) để đồng bộ chống trễ khi đổi tab trình duyệt
  const [targetExpiresAt, setTargetExpiresAt] = useState<number>(() => {
    if (order?.paymentExpiresAt) {
      const parsed = new Date(order.paymentExpiresAt).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    try {
      const saved = Number((sessionStorage.getItem(SESSION_ORDER_ID_KEY) === effectiveOrderId ? sessionStorage.getItem(SESSION_EXPIRES_AT_KEY) : null));
      if (!isNaN(saved) && saved > 0) return saved;
    } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
    const fresh = Date.now() + 33 * 60 * 1000;
    try {
      sessionStorage.setItem(SESSION_EXPIRES_AT_KEY, String(fresh));
    } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
    return fresh;
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const diff = Math.floor((targetExpiresAt - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  });

  const [isExpired, setIsExpired] = useState(false);
  const [terminalMessage, setTerminalMessage] = useState('Đơn hàng đã hết thời gian thanh toán');
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

  const payosPromiseRef = useRef<ReturnType<typeof customerService.createPayOSPayment> | null>(null);
  const payosRequestedOrderIdRef = useRef<string | null>(null);
  const isPaidConfirmedRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Lưu vào sessionStorage để giữ trạng thái khi mobile chuyển app ngân hàng (giấu sạch URL)
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_ORDER_ID_KEY) !== effectiveOrderId) {
        sessionStorage.removeItem(SESSION_PAYOS_CODE_KEY);
      }
      if (effectiveOrderId) sessionStorage.setItem(SESSION_ORDER_ID_KEY, effectiveOrderId);
      if (effectiveOrderCode) sessionStorage.setItem(SESSION_ORDER_CODE_KEY, effectiveOrderCode);
      if (effectiveTotal > 0) sessionStorage.setItem(SESSION_ORDER_TOTAL_KEY, String(effectiveTotal));
      if (targetExpiresAt > 0) sessionStorage.setItem(SESSION_EXPIRES_AT_KEY, String(targetExpiresAt));
    } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }

    // Dọn sạch query parameters nếu có để thanh URL luôn sạch sẽ
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
  }, [effectiveOrderId, effectiveOrderCode, effectiveTotal, targetExpiresAt]);

  // Cập nhật targetExpiresAt khi order prop thay đổi
  const [deadlineInputs, setDeadlineInputs] = useState<readonly unknown[] | null>(null);
  if (!deadlineInputs || deadlineInputs[0] !== order?.paymentExpiresAt) {
    setDeadlineInputs([order?.paymentExpiresAt, targetExpiresAt]);

    if (order?.paymentExpiresAt) {
      const parsed = new Date(order.paymentExpiresAt).getTime();
      if (!isNaN(parsed) && parsed > 0 && parsed !== targetExpiresAt) {
        setTargetExpiresAt(parsed);
      }
    }

  }

  // Phục hồi thông tin đơn hàng nếu component bị reload do app ngân hàng chiếm bộ nhớ
  useEffect(() => {
    if (!order && effectiveOrderId) {
      paymentService.readOrder(effectiveOrderId)
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
              setTerminalMessage(data.payment_status === 'refund_pending'
                ? 'Đã nhận thanh toán. Đơn hàng đã đóng và đang chờ hoàn tiền.'
                : data.status === 'cancelled' ? 'Đơn hàng đã được hủy' : 'Đơn hàng đã hết thời gian thanh toán');
              setIsExpired(true);
            }
          }
        });
    }
  }, [order, effectiveOrderId, effectiveTotal]);

  const isPayosLoading = !payosData;
  const transferContent = payosData?.description || effectiveOrderCode;
  const rawAccount = payosData?.accountNumber || '';
  const bankAccount = rawAccount;
  const bankName = payosData?.bin === '970418' ? 'BIDV' : (payosData?.bin ? 'Ngân hàng nhận (' + payosData.bin + ')' : 'Xem trên link PayOS');
  const accountHolder = payosData?.accountName || 'Xem trên link PayOS';
  // Only the provider's exact cached QR is rendered; legacy links open checkout.
  const qrImageUrl = '';

  const fallbackQrData = payosData?.qrCode || '';

  const cleanupPaymentSession = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_ORDER_ID_KEY);
      sessionStorage.removeItem(SESSION_ORDER_CODE_KEY);
      sessionStorage.removeItem(SESSION_PAYOS_CODE_KEY);
      sessionStorage.removeItem(SESSION_ORDER_TOTAL_KEY);
      sessionStorage.removeItem(SESSION_EXPIRES_AT_KEY);
    } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
  }, []);

  // Hàm kích hoạt xác nhận thanh toán thành công (đảm bảo chỉ chạy đúng 1 lần)
  const handlePaymentSuccess = useCallback(() => {
    if (isPaidConfirmedRef.current) return;
    isPaidConfirmedRef.current = true;

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
            const s = (sessionStorage.getItem(SESSION_ORDER_ID_KEY) === effectiveOrderId ? sessionStorage.getItem(SESSION_PAYOS_CODE_KEY) : null);
            if (s) savedCode = Number(s);
          } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }

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
    [effectiveOrderId, order, payosData, cleanupPaymentSession, onCancel, onBack]
  );

  // Hàm chủ động kiểm tra trạng thái thanh toán từ cả DB Supabase và PayOS API
  const checkCurrentOrderStatus = useCallback(async (isManual = false): Promise<boolean> => {
    if (isPaidConfirmedRef.current) return true;
    const targetOrderId = effectiveOrderId || order?.id;
    if (!targetOrderId) return false;

    try {
      // 1. Kiểm tra trực tiếp bảng orders trên Supabase (siêu nhanh ~50ms)
      const { data: dbOrder, error: dbError } = await paymentService.readOrder(targetOrderId);

      if (!dbError && dbOrder) {
        if (dbOrder.status === 'expired' || dbOrder.status === 'cancelled') {
          setTerminalMessage(dbOrder.payment_status === 'refund_pending'
            ? 'Đã nhận thanh toán. Đơn hàng đã đóng và đang chờ hoàn tiền.'
            : dbOrder.status === 'cancelled' ? 'Đơn hàng đã được hủy' : 'Đơn hàng đã hết thời gian thanh toán');
          setIsExpired(true);
          return false;
        }

        const isDbPaid =
          dbOrder.payment_status === 'success' ||
          dbOrder.status === 'paid' ||
          dbOrder.status === 'preparing' ||
          dbOrder.status === 'ready_for_pickup' ||
          dbOrder.status === 'ready' ||
          dbOrder.status === 'completed';

        if (isDbPaid) {

          handlePaymentSuccess();
          return true;
        }
      }

      // 2. Tra cứu trực tiếp với PayOS qua API check-status
      let savedCode: number | null = null;
      try {
        const s = (sessionStorage.getItem(SESSION_ORDER_ID_KEY) === effectiveOrderId ? sessionStorage.getItem(SESSION_PAYOS_CODE_KEY) : null);
        if (s) savedCode = Number(s);
      } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }

      const numericCode =
        payosData?.orderCode ||
        (dbOrder?.payment_order_code ? Number(dbOrder.payment_order_code) : null) ||
        savedCode;

      const check = await customerService.checkPayOSStatus({
        orderCode: numericCode || undefined,
        orderId: targetOrderId,
      });

      if (check?.paid || check?.status === 'PAID') {

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
  }, [effectiveOrderId, order, payosData, handlePaymentSuccess]);

  // Khởi tạo / phục hồi Realtime Subscription
  const setupRealtimeChannel = useCallback(() => {
    const targetOrderId = effectiveOrderId || order?.id;
    if (!targetOrderId || isExpired || isPaidConfirmedRef.current) return;

    if (channelRef.current) {
      try {
        paymentService.removeChannel(channelRef.current);
      } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
      channelRef.current = null;
    }

    const channel = paymentService.subscribe(targetOrderId,
        (payload) => {

          if (payload.new) {
            const isPaid =
              payload.new.payment_status === 'success' ||
              payload.new.status === 'paid' ||
              payload.new.status === 'preparing' ||
              payload.new.status === 'ready_for_pickup' ||
              payload.new.status === 'ready' ||
              payload.new.status === 'completed';

            if (isPaid) {
              handlePaymentSuccess();
            }
          }
        }
      );

    channelRef.current = channel;
  }, [effectiveOrderId, order?.id, isExpired, handlePaymentSuccess]);

  // 1. Tự động kết nối tới PayOS khi mở trang thanh toán
  useEffect(() => {
    const targetOrderId = effectiveOrderId || order?.id;
    if (!targetOrderId || isExpired) return;

    let paymentPromise: ReturnType<typeof customerService.createPayOSPayment>;
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

          if (res.paid) { handlePaymentSuccess(); return; }
          if (res.expiresAt) setTargetExpiresAt(new Date(res.expiresAt).getTime());
          setEffectiveTotal(res.amount);
          setPaymentError(null);
          setPayosData(res);
          try {
            if (res.orderCode) {
              sessionStorage.setItem(SESSION_PAYOS_CODE_KEY, String(res.orderCode));
            }
          } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setPaymentError(err instanceof Error ? err.message : 'Không thể tải mã thanh toán. Vui lòng quay lại và thử lại.');
        }
        if (payosRequestedOrderIdRef.current === targetOrderId) {
          payosPromiseRef.current = null;
          payosRequestedOrderIdRef.current = null;
        }
      });

    return () => {
      isMounted = false;
    };
  }, [effectiveOrderId, order?.id, isExpired, effectiveTotal, effectiveOrderCode, order?.items, handlePaymentSuccess]);

  // 2. Lắng nghe Supabase Realtime tự động xác nhận đơn
  useEffect(() => {
    setupRealtimeChannel();

    return () => {
      if (channelRef.current) {
        try {
          paymentService.removeChannel(channelRef.current);
        } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
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
            channelRef.current.state === 'closed' ||
            channelRef.current.state === 'errored'
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

          isPolling = false;
          clearInterval(interval);
        }
      } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
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
          if (qrImageUrl) window.open(qrImageUrl, '_blank');
        };
        img.src = url;
        return;
      }

      if (qrImageUrl) {
        window.open(qrImageUrl, '_blank');
        showToast('Đang mở ảnh QR để bạn tải về.');
      } else {
        showToast('Đang tải mã QR PayOS, vui lòng chờ...');
      }
    } catch {
      if (qrImageUrl) {
        window.open(qrImageUrl, '_blank');
        showToast('Đang mở ảnh QR để bạn tải về.');
      }
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = timeLeft === 0 ? 'Đang đối soát...' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { isExpired, terminalMessage, onBack, timeFormatted, effectiveTotal, payosData, qrImageUrl, isImgError, setIsImgError, fallbackQrData, paymentError, handleDownloadQr, copiedField, handleCopy, isPayosLoading, bankAccount, bankName, accountHolder, transferContent, isCancelling, setIsCancelModalOpen, isCancelModalOpen, effectiveOrderCode, handleCancelPayment, toastMessage };
}
