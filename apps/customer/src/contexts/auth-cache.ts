import type { User } from '../shared/types/customer.types';
export const CUSTOMER_USER_CACHE_KEY = 'gsf_cached_customer_user';

export function getCachedCustomerUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      localStorage.getItem(CUSTOMER_USER_CACHE_KEY) ||
      localStorage.getItem('gsf_cached_auth_user') ||
      localStorage.getItem('gsf_customer_user_cache');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedCustomerUser(u: User | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (u) {
      const serialized = JSON.stringify(u);
      localStorage.setItem(CUSTOMER_USER_CACHE_KEY, serialized);
      localStorage.setItem('gsf_cached_auth_user', serialized);
      localStorage.setItem('gsf_customer_user_cache', serialized);
    } else {
      localStorage.removeItem(CUSTOMER_USER_CACHE_KEY);
      localStorage.removeItem('gsf_cached_auth_user');
      localStorage.removeItem('gsf_customer_user_cache');
    }
  } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
}

export function requestPersistentStorage(): void {
  if (typeof window !== 'undefined' && 'storage' in navigator && navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

export const isCustomerProfileComplete = (user: User | null): boolean => {
  if (!user) return false;
  const hasValidName = Boolean(user.name && user.name.trim().length >= 2);
  const digitsOnly = (user.phone || '').replace(/\D/g, '');
  const hasValidPhone = digitsOnly.length === 10 && /^0[3|5|7|8|9]\d{8}$/.test(digitsOnly);
  return hasValidName && hasValidPhone;
};

