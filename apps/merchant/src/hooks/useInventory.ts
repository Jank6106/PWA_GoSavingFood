import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchInventoryItems,
  getCachedInventoryItems,
  saveInventoryItems,
  subscribeInventory,
} from '../services/inventory.service';
import { updateBagStatus } from '../services/bag.service';
import type { InventoryItem, InventoryScheduleFilter } from '../types';
import { useToast } from './useToast';

export function useInventory(storeId: string) {
  // SWR: Đọc dữ liệu kệ hàng từ cache hoặc túi hàng ngay lập tức (0ms)
  const [allItems, setAllItems] = useState<InventoryItem[]>(() => getCachedInventoryItems(storeId));
  const [savedItems, setSavedItems] = useState<InventoryItem[]>(() => allItems);
  const [removedBagIds, setRemovedBagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(() => allItems.length === 0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(() => allItems.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scheduleTab, setScheduleTab] = useState<InventoryScheduleFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  hasUnsavedChangesRef.current = hasUnsavedChanges;
  const { toastMessage: saveSuccessMessage, showToast } = useToast();

  useEffect(() => {
    const cached = getCachedInventoryItems(storeId);
    if (cached.length > 0) {
      setAllItems(cached);
      setSavedItems(cached);
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [storeId]);

  const hasLoadedOnceRef = useRef(allItems.length > 0);

  const loadData = useCallback(async (preserveDraft = false) => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    setError(null);
    try {
      const nextItems = await fetchInventoryItems(storeId);
      if (!preserveDraft) {
        setAllItems(nextItems);
        setSavedItems(nextItems);
        setRemovedBagIds([]);
        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
      }
    } catch {
      setError('Không thể tải dữ liệu kệ hàng.');
    } finally {
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadData();
    const unsubscribe = subscribeInventory(() => {
      if (!hasUnsavedChangesRef.current) {
        void loadData();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const items = useMemo(() => allItems.filter((item) => (scheduleTab === 'today' ? item.schedule === 'today' : item.appliesTomorrow) && `${item.name} ${item.sku}`.toLocaleLowerCase('vi-VN').includes(searchQuery.toLocaleLowerCase('vi-VN'))), [allItems, scheduleTab, searchQuery]);
  const changeQuantity = (itemId: string, delta: number) => {
    setAllItems((entries) => entries.map((item) => item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item));
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };
  const toggleTomorrow = (itemId: string) => {
    setAllItems((entries) => entries.map((item) => item.id === itemId ? { ...item, appliesTomorrow: !item.appliesTomorrow } : item));
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };
  const removeFromShelf = async (item: InventoryItem) => {
    if (!item.bagId) return;
    setAllItems((entries) => entries.filter((entry) => entry.id !== item.id));
    setSavedItems((entries) => entries.filter((entry) => entry.id !== item.id));
    try {
      await updateBagStatus(item.bagId, 'hidden');
      showToast(`Đã gỡ "${item.name}" khỏi kệ hàng`);
    } catch {
      showToast('Lỗi khi gỡ sản phẩm khỏi kệ.');
      await loadData();
    }
  };
  const cancelChanges = () => {
    setAllItems(savedItems);
    setRemovedBagIds([]);
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;
    showToast('Đã hủy các thay đổi chưa lưu');
  };
  const saveChanges = async () => {
    if (!hasUnsavedChanges) return;
    setSaving(true);
    try {
      await Promise.all(removedBagIds.map((bagId) => updateBagStatus(bagId, 'hidden')));
      const saved = await saveInventoryItems(storeId, allItems);
      setAllItems(saved);
      setSavedItems(saved);
      setRemovedBagIds([]);
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
      showToast('Đã lưu thay đổi kệ hàng');
    } finally {
      setSaving(false);
    }
  };

  return { items, loading, hasLoadedOnce, error, saving, scheduleTab, searchQuery, hasUnsavedChanges, saveSuccessMessage, setScheduleTab, setSearchQuery, changeQuantity, toggleTomorrow, removeFromShelf, cancelChanges, saveChanges, loadData };
}
