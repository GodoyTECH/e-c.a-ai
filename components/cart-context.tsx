'use client';

import { CartItem } from '@/lib/types';
import { createContext, useContext, useMemo, useState } from 'react';

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (lineId: string) => void;
  clear: () => void;
  totalCents: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.lineId === item.lineId);
      if (existing) {
        return prev.map((i) => (i.lineId === item.lineId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (lineId: string) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.lineId === lineId
            ? {
                ...item,
                quantity: item.quantity - 1
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const totalCents = useMemo(
    () => items.reduce((acc, item) => acc + item.priceCents * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear: () => setItems([]), totalCents }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado com CartProvider');
  return context;
}
