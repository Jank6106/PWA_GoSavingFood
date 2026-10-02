import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createBagItem,
  deleteBagItem,
  fetchBagItems,
  getCachedBagItems,
  updateBagItem,
  updateBagQuantity,
  updateBagStatus,
} from '../services/bag.service';
import { subscribeInventory } from '../services/inventory.service';
import type { BagInput, BagItem } from '../types';
import { useToast } from './useToast';

export type BagStatusFilter = 'all' | 'on_shelf' | 'off_shelf';

export function useBags(storeId: string) {
  // SWR: Render danh sách túi tức thì 0ms từ cache localStorage
  const [allBags, setAllBags] = useState<BagItem[]>(() => getCachedBagItems(storeId));
  const [loading, setLoading] = useState(() => allBags.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BagStatusFilter>('all');
  const [selectedBag, setSelectedBag] = useState<BagItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toastMessage, showToast } = useToast();

  const loadBags = useCallback(async () => {
    if (allBags.length === 0) setLoading(true);
    setError(null);
    try {
      const items = await fetchBagItems(storeId);
      setAllBags(items);
    } catch {
      setError('Không thể tải danh sách túi hàng.');
    } finally {
      setLoading(false);
    }
  }, [storeId, allBags.length]);

  useEffect(() => {
    void loadBags();
    const unsubscribe = subscribeInventory(() => {
      void loadBags();
    });
    return () => {
      unsubscribe();
    };
  }, [loadBags]);

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

  const replaceBag = (updated: BagItem) => setAllBags((items) => items.map((bag) => bag.id === updated.id ? updated : bag));

  const toggleStatus = async (bagId: string) => {
    const current = allBags.find((bag) => bag.id === bagId);
    if (!current) return;
    const nextStatus = current.status === 'hidden' ? (current.availableQuantity ? 'active' : 'sold_out') : 'hidden';
    setAllBags((items) => items.map((bag) => bag.id === bagId ? { ...bag, status: nextStatus } : bag));
    try {
      const updated = await updateBagStatus(bagId, nextStatus);
      replaceBag(updated); setSelectedBag((bag) => bag?.id === bagId ? updated : bag);
      showToast(nextStatus === 'hidden' ? 'Đã gỡ túi khỏi kệ hàng' : 'Đã đưa túi lên kệ hàng');
    } catch { await loadBags(); }
  };

  const changeQuantity = async (bagId: string, delta: number) => {
    const current = allBags.find((bag) => bag.id === bagId);
    if (!current) return;
    const nextQuantity = Math.max(0, current.availableQuantity + delta);
    setAllBags((items) => items.map((bag) => bag.id === bagId ? { ...bag, availableQuantity: nextQuantity } : bag));
    try { replaceBag(await updateBagQuantity(bagId, nextQuantity)); }
    catch { await loadBags(); }
  };

  const addBag = async (input: BagInput) => {
    setSaving(true);
    try {
      const bag = await createBagItem(storeId, input);
      setAllBags((items) => [bag, ...items]);
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
    try { const updated = await updateBagItem(selectedBag.id, input); replaceBag(updated); setSelectedBag(updated); setIsEditModalOpen(false); showToast('Đã cập nhật thông tin túi hàng'); }
    finally { setSaving(false); }
  };

  const removeBag = async (bagId: string) => {
    setSaving(true);
    try { await deleteBagItem(bagId); setAllBags((items) => items.filter((bag) => bag.id !== bagId)); setIsDetailModalOpen(false); setSelectedBag(null); showToast('Đã xóa túi hàng'); }
    finally { setSaving(false); }
  };

  return { bags, allBags, loading, error, saving, searchQuery, statusFilter, onShelfCount, offShelfCount, selectedBag, isCreateModalOpen, isDetailModalOpen, isEditModalOpen, toastMessage, setSearchQuery, setStatusFilter, setSelectedBag, setIsCreateModalOpen, setIsDetailModalOpen, setIsEditModalOpen, toggleStatus, changeQuantity, addBag, editBag, removeBag, loadBags };
}
