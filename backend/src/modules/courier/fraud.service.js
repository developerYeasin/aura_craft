import { query } from '../../config/db.js';
import { getAll } from '../settings/setting.service.js';
import { courierFraudCheck } from './courier.providers.js';
import { normalisePhone } from '../orders/order.guard.js';

/**
 * COD history lookups, cached.
 *
 * The orders table shows a success ratio per row, so an uncached implementation
 * would fire one external call per row on every page view. Results are kept in
 * `courier_fraud_cache` and only refreshed once they age out — a customer's
 * lifetime delivery record barely moves day to day.
 */

const TTL_DAYS = 7;
const CONCURRENCY = 4;

const readCache = async (phones) => {
  if (!phones.length) return new Map();
  const rows = await query(
    `SELECT phone, total_parcel, success_parcel, cancelled_parcel, success_ratio, checked_at,
            TIMESTAMPDIFF(DAY, checked_at, NOW()) AS age_days
     FROM courier_fraud_cache
     WHERE phone IN (${phones.map(() => '?').join(',')})`,
    phones
  );
  return new Map(rows.map((r) => [r.phone, r]));
};

const writeCache = async (phone, summary) => {
  await query(
    `INSERT INTO courier_fraud_cache (phone, total_parcel, success_parcel, cancelled_parcel, success_ratio, checked_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       total_parcel = VALUES(total_parcel), success_parcel = VALUES(success_parcel),
       cancelled_parcel = VALUES(cancelled_parcel), success_ratio = VALUES(success_ratio),
       checked_at = NOW()`,
    [phone, summary.total_parcel, summary.success_parcel, summary.cancelled_parcel, summary.success_ratio]
  );
};

const shape = (row) => ({
  total_parcel: Number(row.total_parcel),
  success_parcel: Number(row.success_parcel),
  cancelled_parcel: Number(row.cancelled_parcel),
  success_ratio: Number(row.success_ratio),
  cached: true,
  checked_at: row.checked_at,
});

/** Runs `worker` over `items` a few at a time so a page of 15 is not 15 serial calls. */
const pooled = async (items, worker) => {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(runners);
};

/**
 * @param {string[]} rawPhones
 * @param {{ force?: boolean }} options force skips the cache for a single lookup
 * @returns {Promise<Record<string, object|null>>} phone → summary (null = no data)
 */
export const lookupMany = async (rawPhones, { force = false } = {}) => {
  const phones = [...new Set(rawPhones.map(normalisePhone).filter(Boolean))];
  const out = {};
  if (!phones.length) return out;

  const cache = force ? new Map() : await readCache(phones);
  const stale = [];

  for (const phone of phones) {
    const hit = cache.get(phone);
    if (hit && Number(hit.age_days) < TTL_DAYS) out[phone] = shape(hit);
    else stale.push(phone);
  }

  if (stale.length) {
    const settings = await getAll();
    await pooled(stale, async (phone) => {
      try {
        const summary = await courierFraudCheck(settings, phone);
        if (summary?.total_parcel !== undefined) {
          await writeCache(phone, summary);
          const { configured, ...history } = summary;
          out[phone] = { ...history, cached: false, checked_at: new Date() };
        } else {
          // Not configured, lookup failed, or no record — fall back to whatever
          // stale value we have rather than showing nothing.
          const old = cache.get(phone);
          out[phone] = old ? shape(old) : null;
        }
      } catch {
        const old = cache.get(phone);
        out[phone] = old ? shape(old) : null;
      }
    });
  }

  return out;
};

export const lookupOne = async (phone, options) => {
  const result = await lookupMany([phone], options);
  return result[normalisePhone(phone)] ?? null;
};
