import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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

  useEffect(() => {
    const cached = getCachedMerchantOrders(storeId);
    if (cached.length > 0) {
      setAllOrders(cached);
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [storeId]);

  const loadOrders = useCallback(async () => {
    setError(null);
    try {
      const orders = await fetchMerchantOrders(storeId);
      setAllOrders(orders);
      try {
        localStorage.setItem(`gsf_orders_cached_at_${storeId}`, String(Date.now()));
      } catch {}
    } catch {
      setError('Không thể tải danh sách đơn hàng.');
    } finally {
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, [storeId]);

  const isFetchedRef = useRef(false);

  useEffect(() => {
    if (!isFetchedRef.current) {
      isFetchedRef.current = true;
      // Áp dụng TTL: nếu cache còn mới trong vòng 60s thì không fetch lại ngay
      let isFresh = false;
      try {
        const cachedAt = Number(localStorage.getItem(`gsf_orders_cached_at_${storeId}`) || '0');
        if (Date.now() - cachedAt < 60000 && allOrders.length > 0) {
          isFresh = true;
        }
      } catch {}

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
    const findAndSelect = () => {
      const target = allOrders.find(
        (o) =>
          o.id === targetOrderId ||
          o.orderCode.toLowerCase() === targetOrderId.toLowerCase() ||
          targetOrderId.toLowerCase().includes(o.orderCode.toLowerCase())
      );
      if (target) {
        setSelectedOrder(target);
        setIsDetailModalOpen(true);
      }
    };
    findAndSelect();
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

    // 1. Phản hồi tức thì 0ms (Optimistic Update)
    const optimisticOrder: MerchantOrder = {
      ...existing,
      status,
      note: note !== undefined ? note : existing.note,
    };
    replaceOrder(optimisticOrder);
    showToast(message);

    // Lưu vào cache ngay lập tức để không mất trạng thái khi reload
    const cached = getCachedMerchantOrders(storeId);
    setCachedMerchantOrders(
      storeId,
      cached.map((o) => (o.id === orderId ? optimisticOrder : o))
    );

    // 2. Đồng bộ ngầm với Supabase (không block giao diện)
    try {
      const updated = await updateMerchantOrderStatus(orderId, status, note, existing);
      if (updated && updated.status === status) {
        replaceOrder(updated);
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ trạng thái đơn hàng ngầm:', err);
    }

    return true;
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
      (targetQR && targetQR.includes(normalized)) ||
      normalized === orderCode ||
      normalized.includes(orderCode) ||
      cleanId === normalized ||
      cleanId.includes(normalized);

    if (!matches) {
      showToast('Mã QR không khớp với đơn hàng này.');
      return false;
    }

    // 1. Cập nhật hoàn thành tức thì 0ms
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

    // 2. Đồng bộ ngầm với Supabase qua verifyOrderQR (kèm storeId đối soát)
    void verifyOrderQR(orderId, qrCode, storeId).catch((err) => {
      console.warn('Đồng bộ QR với Supabase thất bại:', err);
    });

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
