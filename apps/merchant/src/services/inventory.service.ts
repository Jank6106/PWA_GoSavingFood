import type { BagItem, InventoryItem } from '../types';
import { fetchBagItems, getCachedBagItems, updateBagQuantity } from './bag.service';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const INVENTORY_CACHE_PREFIX = 'gsf_merchant_inventory:';
const TOMORROW_KEY_PREFIX = 'gsf_merchant_inv_tomorrow:';

export function getTomorrowSettings(storeId: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(`${TOMORROW_KEY_PREFIX}${storeId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTomorrowSettings(storeId: string, settings: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${TOMORROW_KEY_PREFIX}${storeId}`, JSON.stringify(settings));
  } catch {
    // Ignore storage quota
  }
}

export function getCachedInventoryItems(storeId: string): InventoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${INVENTORY_CACHE_PREFIX}${storeId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  // Fallback nhanh từ cache bags sẵn có
  const cachedBags = getCachedBagItems(storeId);
  const tomorrowMap = getTomorrowSettings(storeId);
  return cachedBags.filter((bag) => bag.status !== 'hidden').map((b) => toInventoryItem(b, tomorrowMap));
}

export function setCachedInventoryItems(storeId: string, items: InventoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${INVENTORY_CACHE_PREFIX}${storeId}`, JSON.stringify(items));
  } catch {
    // Ignore storage quota
  }
}

const toInventoryItem = (bag: BagItem, tomorrowMap: Record<string, boolean> = {}): InventoryItem => ({
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
  appliesTomorrow: Boolean(tomorrowMap[bag.id]),
  lastUpdated: bag.createdAt,
});

export async function fetchInventoryItems(storeId: string): Promise<InventoryItem[]> {
  const bags = await fetchBagItems(storeId);
  const tomorrowMap = getTomorrowSettings(storeId);
  const items = bags.filter((bag) => bag.status !== 'hidden').map((b) => toInventoryItem(b, tomorrowMap));
  setCachedInventoryItems(storeId, items);
  return items;
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
  const tomorrowMap: Record<string, boolean> = {};
  for (const item of items) {
    await updateBagQuantity(item.id, Math.max(0, item.quantity));
    tomorrowMap[item.id] = Boolean(item.appliesTomorrow);
  }
  saveTomorrowSettings(storeId, tomorrowMap);
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

