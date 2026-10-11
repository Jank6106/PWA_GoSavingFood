import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createBagItem,
  deleteBagItem,
  fetchBagItems,
  getCachedBagItems,
  setCachedBagItems,
  updateBagItem,
  updateBagQuantity,
  updateBagStatus,
} from '../services/bag.service';
import { supabase } from '../services/supabase';
import type { BagInput, BagItem, BagStatus } from '../types';
import { useToast } from './useToast';

export type BagStatusFilter = 'all' | 'on_shelf' | 'off_shelf';

export function useBags(storeId: string) {
  // SWR: Render danh sách túi tức thì 0ms từ cache localStorage
  const [allBags, setAllBags] = useState<BagItem[]>(() => getCachedBagItems(storeId));
  const [loading, setLoading] = useState(() => allBags.length === 0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(() => allBags.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BagStatusFilter>('all');
  const [selectedBag, setSelectedBag] = useState<BagItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toastMessage, showToast } = useToast();
  const ignoreRealtimeUntilRef = useRef<number>(0);

  useEffect(() => {
    const cached = getCachedBagItems(storeId);
    if (cached.length > 0) {
      setAllBags(cached);
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [storeId]);

  const loadBags = useCallback(async () => {
    setError(null);
    try {
      const items = await fetchBagItems(storeId);
      setAllBags(items);
      try {
        localStorage.setItem(`gsf_bags_cached_at_${storeId}`, String(Date.now()));
      } catch {}
    } catch {
      setError('Không thể tải danh sách túi hàng.');
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
        const cachedAt = Number(localStorage.getItem(`gsf_bags_cached_at_${storeId}`) || '0');
        if (Date.now() - cachedAt < 60000 && allBags.length > 0) {
          isFresh = true;
        }
      } catch {}

      if (!isFresh) {
        void loadBags();
      }
    }

    // Realtime cập nhật túi hàng khi có thay đổi từ DB
    const channel = supabase
      .channel(`merchant-bags-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'surprise_bags', filter: `store_id=eq.${storeId}` },
        () => {
          // Bỏ qua Realtime self-echo nếu vừa có thao tác từ chính client trong vòng 3.5s
          if (Date.now() < ignoreRealtimeUntilRef.current) {
            return;
          }
          void loadBags();
        }
      )
      .subscribe();

    const lastFocusFetchRef = { current: 0 };
    const handleFocus = () => {
      if (Date.now() - lastFocusFetchRef.current > 5000) {
        lastFocusFetchRef.current = Date.now();
        void loadBags();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [loadBags, storeId]);

  const onShelfCount = useMemo(() => allBags.filter((b) => b.status !== 'hidden').length, [allBags]);
  const offShelfCount = useMemo(() => allBags.filter((b) => b.status === 'hidden').length, [allBags]);

  const bags = useMemo(
    () =>
      allBags.filter((bag) => {
        const matchesQuery = `${bag.name} ${bag.category}`
          .toLocaleLowerCase('vi-VN')
          .includes(searchQuery.toLocaleLowerCase('vi-VN'));
        if (!matchesQuery) return false;
        if (statusFilter === 'on_shelf') return bag.status !== 'hidden';
        if (statusFilter === 'off_shelf') return bag.status === 'hidden';
        return true;
      }),
    [allBags, searchQuery, statusFilter]
  );

  const replaceBag = (updated: BagItem) =>
    setAllBags((items) => {
      const next = items.map((bag) => (bag.id === updated.id ? updated : bag));
      setCachedBagItems(storeId, next);
      return next;
    });

  const toggleStatus = async (bagId: string) => {
    const current = allBags.find((bag) => bag.id === bagId);
    if (!current) return;
    const previousBags = allBags;
    const nextStatus: BagStatus =
      current.status === 'hidden' ? (current.availableQuantity ? 'active' : 'sold_out') : 'hidden';

    // Optimistic UI: Phản hồi 0ms trên giao diện
    setAllBags((items) => {
      const next = items.map((bag) => (bag.id === bagId ? { ...bag, status: nextStatus } : bag));
      setCachedBagItems(storeId, next);
      return next;
    });
    showToast(nextStatus === 'hidden' ? 'Đã gỡ túi khỏi kệ hàng' : 'Đã đưa túi lên kệ hàng');

    // Chặn Realtime self-echo ghi đè dữ liệu cũ trong 3.5s
    ignoreRealtimeUntilRef.current = Date.now() + 3500;

    try {
      const updated = await updateBagStatus(bagId, nextStatus);
      replaceBag(updated);
      setSelectedBag((bag) => (bag?.id === bagId ? updated : bag));
    } catch {
      // Rollback nếu API thất bại
      setAllBags(previousBags);
      setCachedBagItems(storeId, previousBags);
      showToast('Không thể cập nhật trạng thái túi, đã hoàn tác');
    }
  };

  const changeQuantity = async (bagId: string, delta: number) => {
    const current = allBags.find((bag) => bag.id === bagId);
    if (!current) return;
    const previousBags = allBags;
    const nextQuantity = Math.max(0, current.availableQuantity + delta);
    const nextStatus: BagStatus =
      current.status === 'hidden' ? 'hidden' : nextQuantity > 0 ? 'active' : 'sold_out';

    // Optimistic UI: Cập nhật số lượng 0ms
    setAllBags((items) => {
      const next = items.map((bag) =>
        bag.id === bagId ? { ...bag, availableQuantity: nextQuantity, status: nextStatus } : bag
      );
      setCachedBagItems(storeId, next);
      return next;
    });

    ignoreRealtimeUntilRef.current = Date.now() + 3500;

    try {
      const updated = await updateBagQuantity(bagId, nextQuantity);
      replaceBag(updated);
    } catch {
      // Rollback
      setAllBags(previousBags);
      setCachedBagItems(storeId, previousBags);
      showToast('Lỗi cập nhật số lượng, đã hoàn tác');
    }
  };

  const addBag = async (input: BagInput) => {
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const previousBags = allBags;
    const optimisticBag: BagItem = {
      id: tempId,
      storeId,
      name: input.name,
      description: input.description,
      category: input.category,
      originalPrice: input.originalPrice,
      salePrice: input.salePrice,
      quantity: input.quantity,
      availableQuantity: input.quantity,
      imageUrl: input.imageUrl || input.imageUrls?.[0] || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
      imageUrls: input.imageUrls?.length ? input.imageUrls : [input.imageUrl || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600'],
      pickupTimeStart: input.pickupTimeStart,
      pickupTimeEnd: input.pickupTimeEnd,
      status: input.quantity > 0 ? 'active' : 'sold_out',
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI: Đóng modal và hiển thị ngay trên màn hình trong 0ms
    setAllBags([optimisticBag, ...allBags]);
    setCachedBagItems(storeId, [optimisticBag, ...allBags]);
    setIsCreateModalOpen(false);
    showToast('Đã tạo túi hàng và đưa lên kệ');

    ignoreRealtimeUntilRef.current = Date.now() + 3500;
    setSaving(true);
    try {
      const realBag = await createBagItem(storeId, input);
      setAllBags((items) => {
        const next = items.map((b) => (b.id === tempId ? realBag : b));
        setCachedBagItems(storeId, next);
        return next;
      });
    } catch (err: any) {
      // Rollback
      setAllBags(previousBags);
      setCachedBagItems(storeId, previousBags);
      showToast(err.message || 'Lỗi tạo túi hàng, đã hoàn tác');
    } finally {
      setSaving(false);
    }
  };

  const editBag = async (input: BagInput) => {
    if (!selectedBag) return;
    const previousBags = allBags;
    const optimisticUpdated: BagItem = {
      ...selectedBag,
      ...input,
      availableQuantity: input.quantity,
      status: input.quantity > 0 ? (selectedBag.status === 'hidden' ? 'hidden' : 'active') : 'sold_out',
    };

    // Optimistic UI: Cập nhật thông tin và đóng modal trong 0ms
    replaceBag(optimisticUpdated);
    setSelectedBag(optimisticUpdated);
    setIsEditModalOpen(false);
    showToast('Đã cập nhật thông tin túi hàng');

    ignoreRealtimeUntilRef.current = Date.now() + 3500;
    setSaving(true);
    try {
      const updated = await updateBagItem(selectedBag.id, input);
      replaceBag(updated);
      setSelectedBag(updated);
    } catch (err: any) {
      // Rollback
      setAllBags(previousBags);
      setCachedBagItems(storeId, previousBags);
      showToast(err.message || 'Lỗi cập nhật túi hàng, đã hoàn tác');
    } finally {
      setSaving(false);
    }
  };

  const removeBag = async (bagId: string) => {
    const previousBags = allBags;
    // Optimistic UI: Xóa khỏi danh sách và thông báo ngay trong 0ms
    setAllBags((items) => {
      const next = items.filter((bag) => bag.id !== bagId);
      setCachedBagItems(storeId, next);
      return next;
    });
    setSelectedBag(null);
    showToast('Đã xóa hoàn toàn túi hàng');

    ignoreRealtimeUntilRef.current = Date.now() + 3500;
    setSaving(true);
    try {
      await deleteBagItem(bagId);
    } catch (err: any) {
      // Rollback
      setAllBags(previousBags);
      setCachedBagItems(storeId, previousBags);
      showToast(err.message || 'Lỗi khi xóa túi hàng, đã hoàn tác');
    } finally {
      setSaving(false);
    }
  };

  return {
    bags,
    allBags,
    loading,
    hasLoadedOnce,
    error,
    saving,
    searchQuery,
    statusFilter,
    onShelfCount,
    offShelfCount,
    selectedBag,
    isCreateModalOpen,
    isEditModalOpen,
    toastMessage,
    setSearchQuery,
    setStatusFilter,
    setSelectedBag,
    setIsCreateModalOpen,
    setIsEditModalOpen,
    toggleStatus,
    changeQuantity,
    addBag,
    editBag,
    removeBag,
    loadBags,
  };
}
