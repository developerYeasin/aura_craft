import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'auracraft_cart';

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
};

const readStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(readStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable — cart stays in memory */
    }
  }, [items]);

  const lineKey = (id, variant) => `${id}::${variant || ''}`;

  const add = useCallback((product, quantity = 1, variant = null) => {
    setItems((list) => {
      const key = lineKey(product.id, variant);
      const existing = list.find((i) => lineKey(i.id, i.variant) === key);
      if (existing) {
        return list.map((i) =>
          lineKey(i.id, i.variant) === key ? { ...i, quantity: Math.min(i.quantity + quantity, 99) } : i
        );
      }
      return [
        ...list,
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: Number(product.price),
          image: product.image || product.images?.[0]?.url || null,
          stock: product.stock ?? 99,
          variant,
          quantity,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((id, variant, quantity) => {
    setItems((list) =>
      list
        .map((i) => (lineKey(i.id, i.variant) === lineKey(id, variant) ? { ...i, quantity: Math.max(1, quantity) } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const remove = useCallback((id, variant) => {
    setItems((list) => list.filter((i) => lineKey(i.id, i.variant) !== lineKey(id, variant)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { items, add, setQuantity, remove, clear, count, subtotal };
  }, [items, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
