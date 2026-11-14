import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { CartItem, SurpriseBag } from '../shared/types/customer.types';

const GUEST_CART_KEY = 'gsf_cart_guest';

function getCartStorageKey(userId?: string | null): string {
  return userId ? `gsf_cart_${userId}` : GUEST_CART_KEY;
}

function loadStoredCart(key: string): CartItem[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// A stable external-store snapshot keeps cache hydration out of render effects.
const cartSnapshots = new Map<string, { raw: string | null; items: CartItem[] }>();
const cartListeners = new Set<() => void>();
const EMPTY_CART: CartItem[] = [];
function subscribeCart(listener: () => void) {
  cartListeners.add(listener);
  return () => { cartListeners.delete(listener); };
}

function readCartRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getCartSnapshot(key: string): CartItem[] {
  const raw = readCartRaw(key);
  const cached = cartSnapshots.get(key);
  if (cached && cached.raw === raw) return cached.items;
  const items = loadStoredCart(key);
  cartSnapshots.set(key, { raw, items });
  return items;
}

function saveStoredCart(key: string, items: CartItem[]): void {
  try {
    if (items.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(items));
    }
  } catch {
    // Browser storage failure must not block in-memory cart updates.
  }
  // Retain in-memory updates even when browser storage is full or unavailable.
  cartSnapshots.set(key, { raw: readCartRaw(key), items });
  for (const listener of cartListeners) listener();
}

export function useCart(userId?: string | null) {
  const currentKey = getCartStorageKey(userId);
  const items = useSyncExternalStore(subscribeCart, () => getCartSnapshot(currentKey), () => EMPTY_CART);
  const prevUserIdRef = useRef<string | null | undefined>(userId);

  // Xử lý chuyển đổi session người dùng (đăng nhập, đăng xuất, đổi tài khoản)
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    if (prevUserId === userId) return;

    // 1. Trường hợp: Khách vãng lai (guest) đăng nhập vào tài khoản
    if (!prevUserId && userId) {
      const guestItems = loadStoredCart(GUEST_CART_KEY);
      const userItems = loadStoredCart(`gsf_cart_${userId}`);

      if (guestItems.length > 0) {
        // Gộp các món từ giỏ hàng guest vào giỏ của tài khoản đăng nhập
        const merged = [...userItems];
        guestItems.forEach((guestItem) => {
          const idx = merged.findIndex((i) => i.bag.id === guestItem.bag.id);
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx],
              quantity: Math.min(
                merged[idx].quantity + guestItem.quantity,
                guestItem.bag.maxQuantity,
                guestItem.bag.quantity
              ),
            };
          } else {
            merged.push(guestItem);
          }
        });
        saveStoredCart(`gsf_cart_${userId}`, merged);
        saveStoredCart(GUEST_CART_KEY, []);
        return;
      }

      return;
    }

    // 2. Trường hợp: Người dùng bấm Đăng xuất (userId -> null/undefined)
    if (prevUserId && !userId) {
      // Giỏ hàng của tài khoản cũ vẫn được lưu an toàn trong gsf_cart_${prevUserId}
      // Đăng xuất: chuyển về giỏ hàng guest (trống, số badge biến mất)
      return;
    }

    // 3. Trường hợp: Chuyển đổi trực tiếp giữa 2 tài khoản (User A -> User B)
  }, [userId]);

  const updateAndPersist = useCallback(
    (updater: (current: CartItem[]) => CartItem[]) => {
      const key = getCartStorageKey(userId);
      saveStoredCart(key, updater(getCartSnapshot(key)));
    },
    [userId]
  );

  const addItem = useCallback(
    (bag: SurpriseBag, quantity = 1) => {
      updateAndPersist((current) => {
        const existing = current.find((item) => item.bag.id === bag.id);
        if (!existing) {
          return [...current, { bag, merchantId: bag.merchantId, quantity }];
        }
        return current.map((item) =>
          item.bag.id === bag.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, bag.maxQuantity, bag.quantity) }
            : item
        );
      });
    },
    [updateAndPersist]
  );

  const updateQuantity = useCallback(
    (bagId: string, quantity: number) => {
      updateAndPersist((current) => {
        if (quantity <= 0) {
          return current.filter((item) => item.bag.id !== bagId);
        }
        return current.map((item) =>
          item.bag.id === bagId
            ? { ...item, quantity: Math.min(quantity, item.bag.maxQuantity, item.bag.quantity) }
            : item
        );
      });
    },
    [updateAndPersist]
  );

  const removeItem = useCallback(
    (bagId: string) => {
      updateAndPersist((current) => current.filter((item) => item.bag.id !== bagId));
    },
    [updateAndPersist]
  );

  const clear = useCallback(() => {
    saveStoredCart(getCartStorageKey(userId), []);
  }, [userId]);

  const summary = useMemo(() => {
    const original = items.reduce((sum, item) => sum + item.bag.originalPrice * item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.bag.discountPrice * item.quantity, 0);
    return {
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      original,
      subtotal,
      saved: original - subtotal,
    };
  }, [items]);

  return { items, addItem, updateQuantity, removeItem, clear, summary };
}
