import { useEffectEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchMerchantOrderById,
  fetchMerchantOrders,
  getCachedMerchantOrders,
  setCachedMerchantOrders,
  subscribeToStoreOrders,
  updateMerchantOrderStatus,
  verifyOrderQR,
} from '../services/order.service';
import type { MerchantOrder, OrderStatus, OrderStatusFilter } from '../types';
import { useToast } from './useToast';

export function useOrders(storeId: string, targetOrderId?: string | null) {
  // SWR: Đọc danh sách đơn hàng đã lưu trong cache 0ms
  const [allOrders, setAllOrders] = useState<MerchantOrder[]>(() => getCachedMerchantOrders(storeId));
  const [loading, setLoading] = useState(() => allOrders.length === 0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(() => allOrders.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [saving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<MerchantOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const { toastMessage, showToast } = useToast();

  const [cachedInputs, setCachedInputs] = useState<readonly unknown[] | null>(null);
  // Reset the draft/cache when its inputs change, before committing stale UI.
  if (cachedInputs === null || [storeId].some((value, index) => !Object.is(value, cachedInputs[index]))) {
    setCachedInputs([storeId]);

    const cached = getCachedMerchantOrders(storeId);
    if (cached.length > 0) {
      setAllOrders(cached);
      setLoading(false);
      setHasLoadedOnce(true);
    }

  }

  const loadOrders = useCallback(async () => {
    setError(null);
    try {
      const orders = await fetchMerchantOrders(storeId);
      setAllOrders(orders);
      try {
        localStorage.setItem(`gsf_orders_cached_at_${storeId}`, String(Date.now()));
      } catch  { /* Best-effort browser storage/cleanup; failure must not block the UI. */ }
    } catch {
      setError('Không thể tải danh sách đơn hàng.');
    } finally {
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, [storeId]);

  const hasCachedItems = useEffectEvent(() => allOrders.length > 0);
  const lastFetchedStoreIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!storeId) return;

    if (lastFetchedStoreIdRef.current !== storeId) {
      lastFetchedStoreIdRef.current = storeId;
      // Áp dụng TTL: nếu cache còn mới trong vòng 60s thì không fetch lại ngay
      let isFresh = false;
      try {
        const cachedAt = Number(localStorage.getItem(`gsf_orders_cached_at_${storeId}`) || '0');
        if (Date.now() - cachedAt < 60000 && hasCachedItems()) {
          isFresh = true;
        }
      } catch  { /* Best-effort browser storage/cleanup; failure must not block the UI. */ }

      if (!isFresh) {
        void loadOrders();
      }
    }

    // Kích hoạt Supabase Realtime lắng nghe đơn mới & cập nhật đơn hàng
    const channel = subscribeToStoreOrders(storeId, (payload) => {
      if (payload.eventType === 'INSERT') {
        // Chỉ thông báo đơn mới khi đã thanh toán thành công, không báo lúc pending_payment!
        if (payload.new?.payment_status === 'success' || payload.new?.status === 'paid') {
          showToast('Có đơn hàng mới vừa thanh toán thành công! Vui lòng xác nhận.');
          void loadOrders();
        }
      } else if (payload.eventType === 'UPDATE') {
        const isPaidNow =
          payload.new?.payment_status === 'success' || payload.new?.status === 'paid';
        const wasAlreadyPaid =
          payload.old?.payment_status === 'success' && payload.old?.status === 'paid';

        if (isPaidNow && !wasAlreadyPaid) {
          showToast('Có đơn hàng mới vừa thanh toán thành công! Vui lòng xác nhận.');
        } else if (payload.new?.status === 'cancelled') {
          showToast('Một đơn hàng vừa được cập nhật sang đã hủy.');
        }
        void loadOrders();
      }
    });

    const lastFocusFetchRef = { current: 0 };
    const handleFocus = () => {
      if (Date.now() - lastFocusFetchRef.current > 5000) {
        lastFocusFetchRef.current = Date.now();
        void loadOrders();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      void channel.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [loadOrders, showToast, storeId]);

  useEffect(() => {
    if (!targetOrderId) return;
    let isCancelled = false;

    const findAndSelect = async () => {
      const cleanTarget = targetOrderId.trim().toLowerCase();
      const target = allOrders.find(
        (o) =>
          o.id.toLowerCase() === cleanTarget ||
          o.orderCode.toLowerCase() === cleanTarget ||
          cleanTarget.includes(o.orderCode.toLowerCase()) ||
          o.orderCode.toLowerCase().includes(cleanTarget.replace(/^#/, ''))
      );
      if (target) {
        setSelectedOrder(target);
        setIsDetailModalOpen(true);
        return;
      }

      try {
        const directOrder = await fetchMerchantOrderById(targetOrderId);
        if (!isCancelled && directOrder) {
          setAllOrders((prev) => {
            if (prev.some((o) => o.id === directOrder.id)) return prev;
            return [directOrder, ...prev];
          });
          setSelectedOrder(directOrder);
          setIsDetailModalOpen(true);
        }
      } catch (err) {
        console.warn('Lỗi khi nạp chi tiết đơn hàng trực tiếp:', err);
      }
    };

    void findAndSelect();

    return () => {
      isCancelled = true;
    };
  }, [targetOrderId, allOrders]);

  const summary = useMemo(
    () => ({
      pending: allOrders.filter((o) => o.status === 'pending').length,
      processing: allOrders.filter((o) => o.status === 'processing').length,
      confirmed: allOrders.filter((o) => o.status === 'confirmed').length,
      completed: allOrders.filter((o) => o.status === 'completed').length,
      cancelled: allOrders.filter((o) => o.status === 'cancelled').length,
    }),
    [allOrders]
  );

  const orders = useMemo(
    () =>
      allOrders.filter((order) => {
        const matchesQuery =
          order.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.bagName.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesQuery) return false;
        if (statusFilter === 'all') return true;
        return order.status === statusFilter;
      }),
    [allOrders, searchQuery, statusFilter]
  );

  const replaceOrder = (updated: MerchantOrder) => {
    setAllOrders((items) => items.map((o) => (o.id === updated.id ? updated : o)));
    if (selectedOrder?.id === updated.id) {
      setSelectedOrder(updated);
    }
  };

  const transition = async (orderId: string, status: OrderStatus, message: string, note?: string): Promise<boolean> => {
    const existing = allOrders.find((o) => o.id === orderId);
    if (!existing) return false;

    try {
      const updated = await updateMerchantOrderStatus(orderId, status, note, existing);
      replaceOrder(updated);
      const cached = getCachedMerchantOrders(storeId);
      setCachedMerchantOrders(storeId, cached.map(o => o.id === orderId ? updated : o));
      showToast(message);
      return true;
    } catch {
      showToast('Không thể cập nhật đơn hàng. Vui lòng tải lại và thử lại.');
      return false;
    }
  };

  const confirmOrder = (orderId: string) => transition(orderId, 'processing', 'Đã xác nhận đơn hàng');
  const finishPreparationOrder = (orderId: string) => transition(orderId, 'confirmed', 'Đã chuẩn bị xong, chờ khách đến lấy');
  const cancelOrder = (orderId: string, reason?: string) => transition(orderId, 'cancelled', 'Đã hủy đơn hàng', reason);

  const completeOrderWithQR = async (orderId: string, qrCode: string): Promise<boolean> => {
    const order = allOrders.find((o) => o.id === orderId) || selectedOrder;
    if (!order) return false;

    const normalized = qrCode.trim().toUpperCase();
    if (!normalized) {
      showToast('Vui lòng quét hoặc nhập mã nhận hàng.');
      return false;
    }

    const orderCode = order.orderCode.toUpperCase();
    const targetQR = (order.qrCode || '').toUpperCase();
    const targetToken = (order.pickupToken || '').toUpperCase();
    const cleanId = order.id.toUpperCase();

    const matches =
      (targetToken && normalized === targetToken) ||
      normalized === targetQR ||
      normalized === orderCode ||
      cleanId === normalized;

    if (!matches) {
      showToast('Mã QR không khớp với đơn hàng này.');
      return false;
    }

    const verified = await verifyOrderQR(orderId, qrCode, storeId);
    if (!verified) {
      showToast('Chưa thể xác nhận bàn giao. Kiểm tra mã QR, trạng thái đơn và kết nối mạng.');
      return false;
    }
    // Only commit the UI/cache after server verification succeeds.
    const completedOrder: MerchantOrder = { ...order, status: 'completed' };
    replaceOrder(completedOrder);
    setIsQRModalOpen(false);
    showToast('Xác thực QR thành công! Đơn hàng hoàn tất.');

    // Lưu cache
    const cached = getCachedMerchantOrders(storeId);
    setCachedMerchantOrders(
      storeId,
      cached.map((o) => (o.id === orderId ? completedOrder : o))
    );

    return true;
  };

  return {
    orders,
    allOrders,
    summary,
    loading,
    hasLoadedOnce,
    error,
    saving,
    statusFilter,
    searchQuery,
    selectedOrder,
    isDetailModalOpen,
    isQRModalOpen,
    toastMessage,
    setStatusFilter,
    setSearchQuery,
    setSelectedOrder,
    setIsDetailModalOpen,
    setIsQRModalOpen,
    confirmOrder,
    finishPreparationOrder,
    cancelOrder,
    completeOrderWithQR,
    loadOrders,
  };
}
