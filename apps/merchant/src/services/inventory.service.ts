import { INITIAL_INVENTORY_MOCK } from '../mocks';
import type { BagItem, InventoryInput, InventoryItem } from '../types';
import { clone, delay } from './utils';

let inventoryStore = clone(INITIAL_INVENTORY_MOCK);
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export async function fetchInventoryItems(storeId: string) { await delay(); return clone(inventoryStore.filter((item) => item.storeId === storeId)); }
export async function updateStockQuantity(itemId: string, quantity: number) { await delay(140); const item = inventoryStore.find((entry) => entry.id === itemId); if (!item) throw new Error('Không tìm thấy mặt hàng.'); item.quantity = Math.max(0, quantity); item.lastUpdated = new Date().toISOString(); notify(); return clone(item); }
export async function addInventoryItem(storeId: string, input: InventoryInput) { await delay(); const item: InventoryItem = { ...input, id: `inventory-${Date.now()}`, storeId, lastUpdated: new Date().toISOString() }; inventoryStore.unshift(item); notify(); return clone(item); }
export async function confirmWarehouseInventory(storeId: string) { void storeId; await delay(380); return true; }
export function syncBagToInventoryShelf(bag: BagItem) { const existing = inventoryStore.find((item) => item.bagId === bag.id); if (bag.status === 'hidden') { removeBagFromInventoryShelf(bag.id); return; } const mapped: InventoryItem = { id: existing?.id ?? `inventory-${bag.id}`, bagId: bag.id, storeId: bag.storeId, name: bag.name, sku: existing?.sku ?? `GSF-${String(inventoryStore.length + 1).padStart(3, '0')}`, category: bag.category, imageUrl: bag.imageUrl, price: bag.salePrice, originalPrice: bag.originalPrice, quantity: bag.availableQuantity, minQuantity: 1, unit: 'túi', schedule: existing?.schedule ?? 'today', lastUpdated: new Date().toISOString() }; if (existing) inventoryStore = inventoryStore.map((item) => item.id === existing.id ? mapped : item); else inventoryStore.unshift(mapped); notify(); }
export function removeBagFromInventoryShelf(bagId: string) { inventoryStore = inventoryStore.filter((item) => item.bagId !== bagId); notify(); }
export function subscribeInventory(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
