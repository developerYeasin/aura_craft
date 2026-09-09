import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { categoryApi, settingApi } from '../api/index.js';

const StoreContext = createContext(null);

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
};

const FALLBACK_SETTINGS = {
  site_name: 'AuraCraft',
  site_tagline: 'Style • Elegance • You',
  hero_title: 'আপনার স্টাইল, আমাদের অনন্যতা',
  hero_subtitle: 'প্রিমিয়াম জুয়েলারি, পারফিউম এবং এক্সক্লুসিভ আতরসামগ্রী এখন এক আঙিনায়।',
  contact_phone: '+880 1XXX-XXXX',
  contact_email: 'support@auracraft.com',
  contact_address: 'Dhaka, Bangladesh',
  delivery_charge_inside: '60',
  delivery_charge_outside: '120',
};

/** Shared store-wide data: categories (for navbar/routing) and site settings. */
export const StoreProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    Promise.all([categoryApi.list(), settingApi.get()])
      .then(([catRes, setRes]) => {
        setCategories(catRes.data || []);
        setSettings({ ...FALLBACK_SETTINGS, ...(setRes.data || {}) });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({
      categories,
      navCategories: categories.filter((c) => c.show_in_nav !== 0),
      settings,
      loading,
      refresh,
    }),
    [categories, settings, loading]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};
