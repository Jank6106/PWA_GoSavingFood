import { useCallback, useEffect, useMemo, useState } from 'react';
import { addInventoryItem, confirmWarehouseInventory, fetchInventoryItems, subscribeInventory, updateStockQuantity } from '../services/inventory.service';
import type { InventoryInput, InventoryItem, InventoryScheduleFilter } from '../types';
import { useToast } from './useToast';

export function useInventory(storeId: string) {
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scheduleTab, setScheduleTab] = useState<InventoryScheduleFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toastMessage: saveSuccessMessage, showToast } = useToast();
  const loadData = useCallback(async () => { setLoading(true); setError(null); try { setAllItems(await fetchInventoryItems(storeId)); } catch { setError('Không thể tải dữ liệu kệ hàng.'); } finally { setLoading(false); } }, [storeId]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadData(); }, 0); const unsubscribe = subscribeInventory(() => { void loadData(); }); return () => { window.clearTimeout(timer); unsubscribe(); }; }, [loadData]);
  const items = useMemo(() => allItems.filter((item) => (scheduleTab === 'all' || item.schedule === scheduleTab) && `${item.name} ${item.sku}`.toLocaleLowerCase('vi-VN').includes(searchQuery.toLocaleLowerCase('vi-VN'))), [allItems, scheduleTab, searchQuery]);
  const changeQuantity = async (itemId: string, delta: number) => { const current = allItems.find((item) => item.id === itemId); if (!current) return; const quantity = Math.max(0, current.quantity + delta); setAllItems((entries) => entries.map((item) => item.id === itemId ? { ...item, quantity } : item)); setHasUnsavedChanges(true); try { const updated = await updateStockQuantity(itemId, quantity); setAllItems((entries) => entries.map((item) => item.id === itemId ? updated : item)); } catch { await loadData(); } };
  const createItem = async (input: InventoryInput) => { setSaving(true); try { const item = await addInventoryItem(storeId, input); setAllItems((entries) => [item, ...entries]); setIsAddModalOpen(false); setHasUnsavedChanges(true); showToast('Đã thêm mặt hàng vào kệ'); } finally { setSaving(false); } };
  const confirmWarehouse = async () => { setSaving(true); try { await confirmWarehouseInventory(storeId); setHasUnsavedChanges(false); showToast('Đã xác nhận kệ hàng'); } finally { setSaving(false); } };
  return { items, loading, error, saving, scheduleTab, searchQuery, hasUnsavedChanges, saveSuccessMessage, isAddModalOpen, setScheduleTab, setSearchQuery, setIsAddModalOpen, changeQuantity, createItem, confirmWarehouse, loadData };
}
