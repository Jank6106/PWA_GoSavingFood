import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchMerchantOrders,
  getCachedMerchantOrders,
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
  const [saving, setSaving] = useState(false);
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
      void loadOrders();
    }

    // Kích hoạt Supabase Realtime lắng nghe đơn mới & cập nhật đơn hàng
    const channel = subscribeToStoreOrders(storeId, (payload) => {
      if (payload.eventType === 'INSERT') {
        showToast('Có đơn hàng mới vừa được đặt!');
      } else if (payload.eventType === 'UPDATE' && payload.new?.status === 'cancelled') {
        showToast('Một đơn hàng vừa được cập nhật sang đã hủy.');
      }
      void loadOrders();
    });

    return () => {
      void channel.unsubscribe();
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

  const transition = async (orderId: string, status: OrderStatus, message: string): Promise<boolean> => {
    setSaving(true);
    try {
      const updated = await updateMerchantOrderStatus(orderId, status);
      replaceOrder(updated);
      showToast(message);
      return true;
    } catch (err: any) {
      showToast(err.message || 'Thao tác không thành công.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const confirmOrder = (orderId: string) => transition(orderId, 'processing', 'Đã xác nhận đơn hàng');
  const finishPreparationOrder = (orderId: string) => transition(orderId, 'confirmed', 'Đã chuẩn bị xong, chờ khách đến lấy');
  const cancelOrder = (orderId: string) => transition(orderId, 'cancelled', 'Đã hủy đơn hàng');

  const completeOrderWithQR = async (orderId: string, qrCode: string): Promise<boolean> => {
    setSaving(true);
    try {
      const success = await verifyOrderQR(orderId, qrCode);
      if (success) {
        await loadOrders();
        setIsQRModalOpen(false);
        showToast('Xác thực QR thành công! Đơn hàng hoàn tất.');
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
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
