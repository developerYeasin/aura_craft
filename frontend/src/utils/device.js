/**
 * A stable, privacy-light device id for fraud checks.
 *
 * Deliberately not a canvas/WebGL fingerprint: this is a random id kept in
 * localStorage, hashed together with coarse browser traits so a cleared storage
 * still lands on the same bucket for an unchanged browser. It identifies a
 * browser profile, never a person, and carries nothing personal.
 */

const KEY = 'auracraft_device';

const hash = (input) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

export const getDeviceId = () => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return stored;
  } catch {
    /* storage blocked — fall through to a per-session id */
  }

  const traits = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('|');

  const id = `${hash(traits)}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* nothing to persist to; the id still travels with this order */
  }
  return id;
};
