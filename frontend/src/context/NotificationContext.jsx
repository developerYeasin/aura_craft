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
  // Read inside the stream handlers so toggling sound never tears the stream down.
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const listenersRef = useRef(new Set());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      localStorage.setItem(SOUND_KEY, on ? 'off' : 'on');
      return !on;
    });
  }, []);

  /**
   * Pages (e.g. the dashboard) subscribe here to reload their own data when a
   * notification lands. Returns an unsubscribe function.
   */
  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  const emit = useCallback((n) => {
    listenersRef.current.forEach((fn) => {
      try {
        fn(n);
      } catch {
        /* a listener failure must not break the stream */
      }
    });
  }, []);

  const userId = user?.id;

  /** Server is the source of truth: list + unread count survive refreshes and missed events. */
  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await notificationApi.list();
      setItems(res.data || []);
      setUnread(Number(res.meta?.unread) || 0);
    } catch {
      /* the stream or the next poll will resync */
    }
  }, [userId]);

  // Reflect a subscription registered in an earlier session.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !userId) return;
    navigator.serviceWorker.getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setPushReady(Boolean(sub)))
      .catch(() => {});
  }, [userId]);

  /* ------------------------------------------------ live stream */
  // Keyed on the user id, not the user object, so re-fetching the profile does not
  // reconnect. Three layers keep the panel correct:
  //  1. SSE for instant delivery, resyncing from the API every time it (re)opens;
  //  2. a manual reconnect with backoff when the browser gives up on the stream
  //     (it never retries after a non-200 such as an expired token or a proxy error);
  //  3. a slow poll + focus refresh, because some hosts/proxies buffer SSE and the
  //     events then never arrive until the page is reloaded.
  useEffect(() => {
    if (!userId) {
      sourceRef.current?.close();
      sourceRef.current = null;
      setConnected(false);
      setItems([]);
      setUnread(0);
      return undefined;
    }

    let disposed = false;
    let retryTimer = null;
    let attempt = 0;

    refresh();

    const onNotification = (event) => {
      let n;
      try {
        n = JSON.parse(event.data);
      } catch {
        return;
      }
      // A resync after reconnect can already contain this id — never show it twice.
      if (itemsRef.current.some((x) => x.id === n.id)) return;
      setItems((list) => (list.some((x) => x.id === n.id) ? list : [n, ...list].slice(0, 50)));
      // Optimistic; the server's `unread` frame that follows sets the exact count.
      if (!n.is_read) setUnread((c) => c + 1);
      emit(n);
      if (soundRef.current) playChime();

      // The in-app panel covers a visible tab; a system notification is for when it isn't.
      if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const notice = new Notification(n.title, { body: n.body || '', icon: '/logo.svg?v=2', tag: `n-${n.id}` });
        notice.onclick = () => {
          window.focus();
          if (n.link) window.location.assign(n.link);
        };
      }
    };

    const connect = () => {
      if (disposed) return;
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;

      const source = new EventSource(`${API_URL}/notifications/stream?token=${encodeURIComponent(token)}`);
      sourceRef.current = source;

      const opened = () => {
        attempt = 0;
        setConnected(true);
      };
      source.addEventListener('ready', () => {
        opened();
        refresh(); // catch anything created while we were disconnected
      });
      source.onopen = opened;
      source.addEventListener('notification', onNotification);
      source.addEventListener('unread', (event) => {
        try {
          setUnread(Number(JSON.parse(event.data).count) || 0);
        } catch {
          /* ignore malformed frame */
        }
      });
      source.onerror = () => {
        setConnected(false);
        if (source.readyState === EventSource.CLOSED && !disposed) {
          source.close();
          attempt += 1;
          const delay = Math.min(60_000, 3000 * 2 ** Math.min(attempt, 5));
          retryTimer = setTimeout(connect, delay);
        }
      };
    };

    connect();

    const poll = setInterval(() => {
      if (!document.hidden) refresh();
    }, 45_000);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      sourceRef.current?.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [userId, refresh, emit]);

  /* ------------------------------------------------ actions */
  const markRead = useCallback(async (id) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    setUnread((c) => Math.max(0, c - 1));
    try {
      const res = await notificationApi.markRead(id);
      if (res.data?.unread !== undefined) setUnread(Number(res.data.unread) || 0);
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
      refresh, markRead, markAllRead, clearAll, enablePush, toggleSound, subscribe,
      test: () => notificationApi.test(),
    }),
    [items, unread, connected, permission, soundOn, pushReady, refresh, markRead, markAllRead, clearAll, enablePush, toggleSound, subscribe]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
