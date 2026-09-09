import webpush from 'web-push';
import { query, queryOne } from '../../config/db.js';
import { env } from '../../config/env.js';

const pushEnabled = Boolean(env.vapid.publicKey && env.vapid.privateKey);

if (pushEnabled) {
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
} else {
  console.warn('⚠ VAPID keys missing — browser push disabled (live in-panel alerts still work)');
}

/* ------------------------------------------------------------------ SSE hub */

/** Open Server-Sent Events connections, keyed by an incrementing id. */
const clients = new Map();
let nextClientId = 1;

export const addClient = (res, user) => {
  const id = nextClientId++;
  clients.set(id, { res, user });
  return id;
};

export const removeClient = (id) => clients.delete(id);

export const clientCount = () => clients.size;

/** Push an event to every connected admin panel. */
const broadcast = (event, payload) => {
  const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const [id, client] of clients) {
    try {
      client.res.write(frame);
    } catch {
      clients.delete(id);
    }
  }
};

/** Keeps proxies from closing idle SSE connections. */
export const startHeartbeat = () => {
  const timer = setInterval(() => {
    for (const [id, client] of clients) {
      try {
        client.res.write(': ping\n\n');
      } catch {
        clients.delete(id);
      }
    }
  }, 25_000);
  timer.unref();
  return timer;
};

/* -------------------------------------------------------------- web push */

const sendWebPush = async (notification) => {
  if (!pushEnabled) return;
  const subs = await query('SELECT * FROM push_subscriptions');
  if (!subs.length) return;

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    link: notification.link,
    type: notification.type,
  });

  const dead = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (error) {
        // 404/410 mean the browser dropped the subscription — stop trying it.
        if (error.statusCode === 404 || error.statusCode === 410) dead.push(sub.id);
        else console.warn('⚠ push failed:', error.statusCode || error.message);
      }
    })
  );

  if (dead.length) {
    await query(`DELETE FROM push_subscriptions WHERE id IN (${dead.map(() => '?').join(',')})`, dead);
  }
};

/* ------------------------------------------------------------ public API */

/**
 * Persist a notification, stream it to open admin panels, and fire a browser push.
 * Never throws — a notification failure must not roll back the order that caused it.
 */
export const notify = async ({ type = 'system', title, body = null, link = null, meta = null }) => {
  try {
    const result = await query('INSERT INTO notifications SET ?', [
      { type, title, body, link, meta: meta ? JSON.stringify(meta) : null },
    ]);
    const notification = await queryOne('SELECT * FROM notifications WHERE id = ?', [result.insertId]);

    broadcast('notification', notification);
    broadcast('unread', { count: await unreadCount() });
    await sendWebPush(notification);

    return notification;
  } catch (error) {
    console.error('✖ notify failed:', error.message);
    return null;
  }
};

export const list = async ({ limit = 30, unreadOnly = false } = {}) =>
  query(
    `SELECT * FROM notifications ${unreadOnly ? 'WHERE is_read = 0' : ''}
     ORDER BY created_at DESC LIMIT ${Number(limit)}`
  );

export const unreadCount = async () => {
  const row = await queryOne('SELECT COUNT(*) AS c FROM notifications WHERE is_read = 0');
  return Number(row?.c || 0);
};

export const markRead = async (id) => {
  await query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
  broadcast('unread', { count: await unreadCount() });
};

export const markAllRead = async () => {
  await query('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
  broadcast('unread', { count: 0 });
};

export const removeAll = async () => {
  await query('DELETE FROM notifications');
  broadcast('unread', { count: 0 });
};

export const saveSubscription = async (subscription, userId, userAgent) => {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.p256dh || !keys?.auth) throw new Error('Invalid push subscription');
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
    [userId || null, endpoint, keys.p256dh, keys.auth, (userAgent || '').slice(0, 255)]
  );
};

export const removeSubscription = (endpoint) =>
  query('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);

export const vapidPublicKey = () => (pushEnabled ? env.vapid.publicKey : null);
