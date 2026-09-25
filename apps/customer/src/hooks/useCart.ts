import { useMemo, useState } from 'react';
import type { CartItem, SurpriseBag } from '../shared/types/customer.types';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (bag: SurpriseBag, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.bag.id === bag.id);
      if (!existing) return [...current, { bag, merchantId: bag.merchantId, quantity }];
      return current.map((item) =>
        item.bag.id === bag.id
          ? { ...item, quantity: Math.min(item.quantity + quantity, bag.maxQuantity, bag.quantity) }
          : item
      );
    });
  };

  const updateQuantity = (bagId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((current) => current.filter((item) => item.bag.id !== bagId));
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.bag.id === bagId
          ? { ...item, quantity: Math.min(quantity, item.bag.maxQuantity, item.bag.quantity) }
          : item
      )
    );
  };

  const removeItem = (bagId: string) =>
    setItems((current) => current.filter((item) => item.bag.id !== bagId));

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

  return { items, addItem, updateQuantity, removeItem, clear: () => setItems([]), summary };
}
