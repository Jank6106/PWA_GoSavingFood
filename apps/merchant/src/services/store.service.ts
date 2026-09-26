import { STORE_PROFILE_MOCK } from '../mocks';
import type { StoreUpdateInput } from '../types';
import { clone, delay } from './utils';

let profileStore = clone(STORE_PROFILE_MOCK);
export async function fetchStoreProfile(storeId: string) { void storeId; await delay(); return clone(profileStore); }
export async function updateStoreProfile(_storeId: string, input: StoreUpdateInput) { await delay(360); profileStore = { ...profileStore, ...input, updatedAt: new Date().toISOString() }; return clone(profileStore); }
export async function toggleStoreOpenStatus(storeId: string) { void storeId; await delay(160); profileStore.isOpen = !profileStore.isOpen; return clone(profileStore); }
