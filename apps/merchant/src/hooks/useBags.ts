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
import type { BagInput, BagItem } from '../types';
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toastMessage, showToast } = useToast();

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
      void loadBags();
    }

    // Realtime cập nhật túi hàng khi có thay đổi từ DB
    const channel = supabase
      .channel(`merchant-bags-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'surprise_bags', filter: `store_id=eq.${storeId}` },
        () => {
          void loadBags();
        }
      )
      .subscribe();

    const handleFocus = () => {
      void loadBags();
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
    const nextStatus = current.status === 'hidden' ? (current.availableQuantity ? 'active' : 'sold_out') : 'hidden';
    setAllBags((items) => {
      const next = items.map((bag) => (bag.id === bagId ? { ...bag, status: nextStatus } : bag));
      setCachedBagItems(storeId, next);
      return next;
    });
    try {
      const updated = await updateBagStatus(bagId, nextStatus);
      replaceBag(updated);
      setSelectedBag((bag) => (bag?.id === bagId ? updated : bag));
      showToast(nextStatus === 'hidden' ? 'Đã gỡ túi khỏi kệ hàng' : 'Đã đưa túi lên kệ hàng');
    } catch {
      await loadBags();
    }
  };

  const changeQuantity = async (bagId: string, delta: number) => {
    const current = allBags.find((bag) => bag.id === bagId);
    if (!current) return;
    const nextQuantity = Math.max(0, current.availableQuantity + delta);
    setAllBags((items) => {
      const next = items.map((bag) => (bag.id === bagId ? { ...bag, availableQuantity: nextQuantity } : bag));
      setCachedBagItems(storeId, next);
      return next;
    });
    try {
      replaceBag(await updateBagQuantity(bagId, nextQuantity));
    } catch {
      await loadBags();
    }
  };

  const addBag = async (input: BagInput) => {
    setSaving(true);
    try {
      const bag = await createBagItem(storeId, input);
      setAllBags((items) => {
        const next = [bag, ...items];
        setCachedBagItems(storeId, next);
        return next;
      });
      setIsCreateModalOpen(false);
      showToast('Đã tạo túi hàng và đưa lên kệ');
    } catch (err: any) {
      showToast(err.message || 'Lỗi tạo túi hàng');
    } finally {
      setSaving(false);
    }
  };

  const editBag = async (input: BagInput) => {
    if (!selectedBag) return;
    setSaving(true);
    try {
      const updated = await updateBagItem(selectedBag.id, input);
      replaceBag(updated);
      setSelectedBag(updated);
      setIsEditModalOpen(false);
      showToast('Đã cập nhật thông tin túi hàng');
    } finally {
      setSaving(false);
    }
  };

  const removeBag = async (bagId: string) => {
    setSaving(true);
    try {
      await deleteBagItem(bagId);
      setAllBags((items) => {
        const next = items.filter((bag) => bag.id !== bagId);
        setCachedBagItems(storeId, next);
        return next;
      });
      setIsDetailModalOpen(false);
      setSelectedBag(null);
      showToast('Đã xóa túi hàng');
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
    isDetailModalOpen,
    isEditModalOpen,
    toastMessage,
    setSearchQuery,
    setStatusFilter,
    setSelectedBag,
    setIsCreateModalOpen,
    setIsDetailModalOpen,
    setIsEditModalOpen,
    toggleStatus,
    changeQuantity,
    addBag,
    editBag,
    removeBag,
    loadBags,
  };
}
