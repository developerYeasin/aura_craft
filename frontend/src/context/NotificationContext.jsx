import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { notificationApi } from '../api/index.js';
import { API_URL, TOKEN_KEY } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
};

/** Short chime via Web Audio — avoids shipping an audio asset. */
const playChime = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.16, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {
    /* audio unavailable — the visual alert still fires */
  }
};

const urlBase64ToUint8Array = (base64) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const SOUND_KEY = 'auracraft_notify_sound';

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem(SOUND_KEY) !== 'off');
  const [pushReady, setPushReady] = useState(false);

  const sourceRef = useRef(null);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      localStorage.setItem(SOUND_KEY, on ? 'off' : 'on');
      return !on;
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationApi.list();
      setItems(res.data || []);
      setUnread(res.meta?.unread || 0);
    } catch {
      /* the stream will resync on reconnect */
    }
  }, [user]);

  // Reflect a subscription registered in an earlier session.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !user) return;
    navigator.serviceWorker.getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setPushReady(Boolean(sub)))
      .catch(() => {});
  }, [user]);

  /* ------------------------------------------------ live stream */
  useEffect(() => {
    if (!user) {
      sourceRef.current?.close();
      sourceRef.current = null;
      setConnected(false);
      setItems([]);
      setUnread(0);
      return undefined;
    }

    refresh();

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return undefined;

    const source = new EventSource(`${API_URL}/notifications/stream?token=${encodeURIComponent(token)}`);
    sourceRef.current = source;

    source.addEventListener('ready', () => setConnected(true));

    source.addEventListener('notification', (event) => {
      const n = JSON.parse(event.data);
      setItems((list) => [n, ...list].slice(0, 50));
      setUnread((c) => c + 1);
      if (soundOn) playChime();

      // The in-app panel covers a visible tab; a system notification is for when it isn't.
      if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const notice = new Notification(n.title, { body: n.body || '', icon: '/logo.svg', tag: `n-${n.id}` });
        notice.onclick = () => {
          window.focus();
          if (n.link) window.location.assign(n.link);
        };
      }
    });

    source.addEventListener('unread', (event) => setUnread(JSON.parse(event.data).count));
    source.onerror = () => setConnected(false);
    source.onopen = () => setConnected(true);

    return () => {
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [user, refresh, soundOn]);

  /* ------------------------------------------------ actions */
  const markRead = useCallback(async (id) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    setUnread((c) => Math.max(0, c - 1));
    try {
      await notificationApi.markRead(id);
    } catch {
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setItems((list) => list.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      refresh();
    }
  }, [refresh]);

  const clearAll = useCallback(async () => {
    setItems([]);
    setUnread(0);
    try {
      await notificationApi.clear();
    } catch {
      refresh();
    }
  }, [refresh]);

  /**
   * Browsers can leave pushManager.subscribe() pending forever when no push
   * service is reachable (blocked FCM, corporate firewall, headless Chrome).
   * Never await it unbounded or the button spins with no feedback.
   */
  const withTimeout = (promise, ms, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} সাড়া দেয়নি`)), ms)),
    ]);

  /** Ask for permission and register a Web Push subscription for this device. */
  const enablePush = useCallback(async () => {
    if (typeof Notification === 'undefined') return { ok: false, message: 'এই ব্রাউজারে নোটিফিকেশন সাপোর্ট নেই।' };

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return { ok: false, message: 'নোটিফিকেশনের অনুমতি দেওয়া হয়নি।' };

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: true, message: 'নোটিফিকেশন চালু হয়েছে (এই ট্যাব খোলা থাকলে)।' };
    }

    try {
      const keyRes = await notificationApi.vapidKey();
      if (!keyRes.data?.key) return { ok: true, message: 'নোটিফিকেশন চালু হয়েছে (এই ট্যাব খোলা থাকলে)।' };

      const reg = await navigator.serviceWorker.register('/sw.js');
      await withTimeout(navigator.serviceWorker.ready, 8000, 'সার্ভিস ওয়ার্কার');

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await withTimeout(
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyRes.data.key),
          }),
          12000,
          'পুশ সার্ভিস'
        ));

      await notificationApi.subscribe(sub.toJSON());
      setPushReady(true);
      return { ok: true, message: 'ব্রাউজার পুশ চালু হয়েছে — ট্যাব বন্ধ থাকলেও নোটিফিকেশন আসবে।' };
    } catch (error) {
      // Permission is granted, so background + in-panel alerts still work. Only the
      // closed-tab push failed, and the user is told exactly that.
      return {
        ok: true,
        partial: true,
        message: `নোটিফিকেশন চালু হয়েছে, তবে ব্রাউজার পুশ রেজিস্টার হয়নি (${error.message}) — ট্যাব খোলা বা ব্যাকগ্রাউন্ডে থাকলে অ্যালার্ট আসবে।`,
      };
    }
  }, []);

  const value = useMemo(
    () => ({
      items, unread, connected, permission, soundOn, pushReady,
      refresh, markRead, markAllRead, clearAll, enablePush, toggleSound,
      test: () => notificationApi.test(),
    }),
    [items, unread, connected, permission, soundOn, pushReady, refresh, markRead, markAllRead, clearAll, enablePush, toggleSound]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
