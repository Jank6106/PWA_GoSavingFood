import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBagItem, deleteBagItem, fetchBagItems, updateBagItem, updateBagQuantity, updateBagStatus } from '../services/bag.service';
import type { BagInput, BagItem } from '../types';
import { useToast } from './useToast';

export function useBags(storeId: string) {
  const [allBags, setAllBags] = useState<BagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBag, setSelectedBag] = useState<BagItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toastMessage, showToast } = useToast();

  const loadBags = useCallback(async () => {
    setLoading(true); setError(null);
    try { setAllBags(await fetchBagItems(storeId)); }
    catch { setError('Không thể tải danh sách túi hàng.'); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadBags(); }, 0); return () => window.clearTimeout(timer); }, [loadBags]);

  const bags = useMemo(() => allBags.filter((bag) => `${bag.name} ${bag.category}`.toLocaleLowerCase('vi-VN').includes(searchQuery.toLocaleLowerCase('vi-VN'))), [allBags, searchQuery]);
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
    try { const bag = await createBagItem(storeId, input); setAllBags((items) => [bag, ...items]); setIsCreateModalOpen(false); showToast('Đã tạo túi hàng và đưa lên kệ'); }
    finally { setSaving(false); }
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

  return { bags, loading, error, saving, searchQuery, selectedBag, isCreateModalOpen, isDetailModalOpen, isEditModalOpen, toastMessage, setSearchQuery, setSelectedBag, setIsCreateModalOpen, setIsDetailModalOpen, setIsEditModalOpen, toggleStatus, changeQuantity, addBag, editBag, removeBag, loadBags };
}
