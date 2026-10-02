import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<MerchantOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const { toastMessage, showToast } = useToast();

  const loadOrders = useCallback(async () => {
    if (allOrders.length === 0) setLoading(true);
    setError(null);
    try {
      setAllOrders(await fetchMerchantOrders(storeId));
    } catch {
      setError('Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [storeId, allOrders.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);

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
      window.clearTimeout(timer);
      void channel.unsubscribe();
    };
  }, [loadOrders, showToast, storeId]);

  useEffect(() => {
    if (!targetOrderId) return;
    const findAndSelect = () => {
      const target = allOrders.find(
        (o) =>
          o.id.toLowerCase() === targetOrderId.toLowerCase() ||
          o.orderCode.toLowerCase() === targetOrderId.toLowerCase()
      );
      if (target) {
        if (['completed', 'cancelled'].includes(target.status)) {
          setStatusFilter(target.status);
        } else {
          setStatusFilter('all');
        }
        setSelectedOrder(target);
        setIsDetailModalOpen(true);
        return true;
      }
      return false;
    };

    if (!findAndSelect()) {
      void loadOrders();
    }
  }, [targetOrderId, allOrders, loadOrders]);

  const orders = useMemo(
    () =>
      allOrders.filter(
        (order) =>
          (statusFilter === 'all'
            ? !['completed', 'cancelled'].includes(order.status)
            : order.status === statusFilter) &&
          `${order.orderCode} ${order.customerName} ${order.customerPhone}`
            .toLocaleLowerCase('vi-VN')
            .includes(searchQuery.toLocaleLowerCase('vi-VN'))
      ),
    [allOrders, statusFilter, searchQuery]
  );

  const summary = useMemo(
    () => ({
      pending: allOrders.filter((order) => order.status === 'pending').length,
      processing: allOrders.filter((order) => order.status === 'processing').length,
      confirmed: allOrders.filter((order) => order.status === 'confirmed').length,
      completed: allOrders.filter((order) => order.status === 'completed').length,
      cancelled: allOrders.filter((order) => order.status === 'cancelled').length,
    }),
    [allOrders]
  );

  const transition = async (id: string, status: OrderStatus, message: string): Promise<boolean> => {
    setSaving(true);
    try {
      const updated = await updateMerchantOrderStatus(id, status);
      setAllOrders((items) =>
        items.map((order) => (order.id === id ? updated : order))
      );
      setSelectedOrder((order) => (order?.id === id ? updated : order));
      showToast(message);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể cập nhật đơn hàng.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const completeOrderWithQR = async (id: string, qrCode: string) => {
    setSaving(true);
    try {
      const valid = await verifyOrderQR(id, qrCode);
      if (valid) {
        await loadOrders();
        setIsQRModalOpen(false);
        setSelectedOrder(null);
        showToast('Đơn hàng đã hoàn thành');
      }
      return valid;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể xác thực mã QR.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    orders,
    loading,
    error,
    saving,
    summary,
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
    confirmOrder: (id: string) => transition(id, 'processing', 'Đã xác nhận đơn hàng'),
    finishPreparationOrder: (id: string) =>
      transition(id, 'confirmed', 'Đơn hàng đã sẵn sàng để nhận'),
    cancelOrder: (id: string) => transition(id, 'cancelled', 'Đã hủy đơn hàng'),
    completeOrderWithQR,
    loadOrders,
  };
}
