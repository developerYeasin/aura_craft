import { useCallback, useEffect, useState } from 'react';

const KEY = 'auracraft_wishlist';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

const listeners = new Set();
let current = read();

const broadcast = (next) => {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn(next));
};

/** Tiny shared wishlist store backed by localStorage. */
export const useWishlist = () => {
  const [ids, setIds] = useState(current);

  useEffect(() => {
    listeners.add(setIds);
    return () => listeners.delete(setIds);
  }, []);

  const toggle = useCallback((id) => {
    broadcast(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }, []);

  const has = useCallback((id) => ids.includes(id), [ids]);

  return { ids, has, toggle, count: ids.length };
};
