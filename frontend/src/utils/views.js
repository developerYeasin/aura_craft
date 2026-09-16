import { viewApi } from '../api/index.js';

const VISITOR_KEY = 'auracraft_visitor';
const SEEN_KEY = 'auracraft_viewed';

/** Client-side guard; the server enforces its own 30-minute dedupe window too. */
const CLIENT_WINDOW_MS = 30 * 60 * 1000;

/** Anonymous random id per browser — no personal data, used only to de-duplicate views. */
const visitorId = () => {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (window.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).slice(0, 64);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
};

const readSeen = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) || '{}');
  } catch {
    return {};
  }
};

/** In-flight requests, so React StrictMode's double effects never send two. */
const pending = new Map();

/**
 * Count one real view of a product detail or team profile. Resolves to the
 * server's { counted, views }, or null when skipped or failed. Never throws:
 * analytics must not break the page.
 */
export const recordView = (type, id) => {
  if (!id) return Promise.resolve(null);
  const key = `${type}:${id}`;
  if (pending.has(key)) return pending.get(key);

  const seen = readSeen();
  if (seen[key] && Date.now() - seen[key] < CLIENT_WINDOW_MS) return Promise.resolve(null);

  const request = viewApi
    .record(type, id, visitorId())
    .then((res) => {
      try {
        sessionStorage.setItem(SEEN_KEY, JSON.stringify({ ...readSeen(), [key]: Date.now() }));
      } catch {
        /* storage unavailable — the server still de-duplicates */
      }
      return res.data || null;
    })
    .catch(() => null)
    .finally(() => setTimeout(() => pending.delete(key), 0));

  pending.set(key, request);
  return request;
};
