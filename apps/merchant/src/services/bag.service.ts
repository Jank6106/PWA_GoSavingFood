import { INITIAL_BAGS_MOCK } from '../mocks';
import type { BagInput, BagItem, BagStatus } from '../types';
import { removeBagFromInventoryShelf, syncBagToInventoryShelf } from './inventory.service';
import { clone, delay } from './utils';

let bagStore = clone(INITIAL_BAGS_MOCK);

export async function fetchBagItems(storeId: string) { await delay(); return clone(bagStore.filter((bag) => bag.storeId === storeId)); }
export async function updateBagStatus(bagId: string, status: BagStatus) { await delay(160); const bag = bagStore.find((item) => item.id === bagId); if (!bag) throw new Error('Không tìm thấy túi hàng.'); bag.status = status; syncBagToInventoryShelf(bag); return clone(bag); }
export async function updateBagQuantity(bagId: string, quantity: number) { await delay(140); const bag = bagStore.find((item) => item.id === bagId); if (!bag) throw new Error('Không tìm thấy túi hàng.'); bag.availableQuantity = Math.max(0, quantity); bag.quantity = Math.max(bag.quantity, bag.availableQuantity); if (bag.status !== 'hidden') bag.status = bag.availableQuantity === 0 ? 'sold_out' : 'active'; syncBagToInventoryShelf(bag); return clone(bag); }
export async function createBagItem(storeId: string, input: BagInput) { await delay(360); const bag: BagItem = { ...input, id: `bag-${Date.now()}`, storeId, availableQuantity: input.quantity, status: input.quantity > 0 ? 'active' : 'sold_out', createdAt: new Date().toISOString() }; bagStore.unshift(bag); syncBagToInventoryShelf(bag); return clone(bag); }
export async function deleteBagItem(bagId: string) { await delay(260); bagStore = bagStore.filter((bag) => bag.id !== bagId); removeBagFromInventoryShelf(bagId); return true; }

