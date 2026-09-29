import type { BagItem, InventoryItem } from '../types';
import { fetchBagItems, updateBagQuantity } from './bag.service';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const toInventoryItem = (bag: BagItem): InventoryItem => ({
  id: bag.id,
  bagId: bag.id,
  storeId: bag.storeId,
  name: bag.name,
  sku: `GSF-${bag.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
  category: bag.category,
  imageUrl: bag.imageUrl,
  price: bag.salePrice,
  originalPrice: bag.originalPrice,
  quantity: bag.availableQuantity,
  minQuantity: 1,
  unit: 'túi',
  schedule: 'today',
  appliesTomorrow: false,
  lastUpdated: bag.createdAt,
});

export async function fetchInventoryItems(storeId: string): Promise<InventoryItem[]> {
  const bags = await fetchBagItems(storeId);
  return bags.filter((bag) => bag.status !== 'hidden').map(toInventoryItem);
}

export async function updateStockQuantity(
  itemId: string,
  quantity: number
): Promise<InventoryItem | null> {
  const bag = await updateBagQuantity(itemId, Math.max(0, quantity));
  notify();
  return toInventoryItem(bag);
}

export async function saveInventoryItems(
  storeId: string,
  items: InventoryItem[]
): Promise<InventoryItem[]> {
  for (const item of items) {
    await updateBagQuantity(item.id, Math.max(0, item.quantity));
  }
  notify();
  return fetchInventoryItems(storeId);
}

export function syncBagToInventoryShelf(_bag: BagItem) {
  notify();
}

export function removeBagFromInventoryShelf(_bagId: string) {
  notify();
}

export function subscribeInventory(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

