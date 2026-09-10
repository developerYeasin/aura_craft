import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { getAll } from '../settings/setting.service.js';
import { courierFraudCheck } from '../courier/courier.providers.js';

/**
 * Fraud prevention engine for a COD storefront, where anyone can order with
 * nothing but a phone number.
 *
 * Two kinds of rule run here:
 *   • Hard rules    — a bad phone, a blocklisted number, an impossible total.
 *                     These reject outright, no score involved.
 *   • Scored layers — IP bursts, repeat devices, cooldowns, courier history,
 *                     VPNs. Each adds its weight; the order is blocked once the
 *                     total crosses the risk threshold.
 *
 * Every layer, weight and threshold is admin-configurable, the engine has a
 * master switch, and test mode records what *would* have been blocked without
 * turning a single customer away.
 */

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const truthy = (value) => value === '1' || value === 1 || value === 'true' || value === true;

/** Bangladeshi mobile numbers: 11 digits starting 013–019, optionally +880. */
export const normalisePhone = (raw = '') => {
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.startsWith('880')) return `0${digits.slice(3)}`;
  if (digits.length === 10 && digits.startsWith('1')) return `0${digits}`;
  return digits;
};

export const isValidBdPhone = (phone) => /^01[3-9]\d{8}$/.test(phone);

export const DEFAULTS = {
  fraud_enabled: '1',
  fraud_test_mode: '0',
  fraud_trust_proxy: '1',
  fraud_auto_unblock_days: '0',
  fraud_risk_threshold: '50',

  fraud_validate_phone: '1',
  fraud_max_order_total: '0',
  fraud_blocked_phones: '',

  fraud_layer_honeypot: '1',
  fraud_layer_ip_limit: '1',
  fraud_layer_device: '0',
  fraud_layer_cooldown: '1',
  fraud_layer_phone_limit: '1',
  fraud_layer_courier: '0',
  fraud_layer_vpn: '0',

  fraud_max_per_ip_hour: '6',
  fraud_min_minutes_between: '2',
  fraud_max_per_phone_day: '3',
  fraud_duplicate_window_minutes: '30',
  fraud_min_success_ratio: '0',

  fraud_weight_ip: '25',
  fraud_weight_device: '25',
  fraud_weight_cooldown: '15',
  fraud_weight_phone: '20',
  fraud_weight_courier: '30',
  fraud_weight_vpn: '20',

  fraud_block_title_bn: 'অর্ডারটি সম্পন্ন করা যায়নি',
  fraud_block_title_en: 'We could not place this order',
  fraud_block_desc_bn: 'অনুগ্রহ করে আমাদের কল করে অর্ডারটি নিশ্চিত করুন।',
  fraud_block_desc_en: 'Please call us to confirm this order.',
};

const PRIVATE_IP = /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/** ip-api.com is free and needs no key; a failure simply yields no VPN signal. */
const lookupIpRisk = async (ip) => {
  if (!ip || PRIVATE_IP.test(ip)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,proxy,hosting,countryCode`, {
      signal: controller.signal,
    });
    const body = await res.json();
    if (body?.status !== 'success') return null;
    return { proxy: Boolean(body.proxy), hosting: Boolean(body.hosting), country: body.countryCode };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Block/allow entries, honouring per-entry expiry and the global auto-unblock. */
const listMatch = async (values, autoUnblockDays) => {
  const pairs = Object.entries(values).filter(([, v]) => v);
  if (!pairs.length) return { blocked: null, allowed: null };

  const clauses = pairs.map(() => '(value_type = ? AND value = ?)').join(' OR ');
  const params = pairs.flat();
  const days = Number(autoUnblockDays) || 0;

  const rows = await query(
    `SELECT list_type, value_type, value, note FROM fraud_lists
     WHERE (${clauses})
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (? = 0 OR list_type = 'allow' OR created_at > DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [...params, days, days]
  );

  return {
    blocked: rows.find((r) => r.list_type === 'block') || null,
    allowed: rows.find((r) => r.list_type === 'allow') || null,
  };
};

const logEvent = async (event) => {
  try {
    await query('INSERT INTO fraud_events SET ?', [event]);
  } catch {
    // Logging must never break checkout.
  }
};

/**
 * @returns {{ phone: string, flags: string[], score: number }}
 * @throws  {ApiError} when the order is rejected
 */
export const screenOrder = async ({ phone, ip, total, itemCount, deviceId, honeypot, customerName }) => {
  const settings = { ...DEFAULTS, ...(await getAll()) };
  const clean = normalisePhone(phone);

  if (!truthy(settings.fraud_enabled)) return { phone: clean, flags: [], score: 0 };

  const testMode = truthy(settings.fraud_test_mode);
  const threshold = num(settings.fraud_risk_threshold, 50);
  const reasons = [];
  const flags = [];
  let score = 0;

  const base = {
    customer_name: customerName || null,
    phone: clean || null,
    ip_address: ip || null,
    device_id: deviceId || null,
    order_total: total ?? null,
    item_count: itemCount ?? null,
  };

  /** Rejects — unless test mode is on, which records and lets the order through. */
  const reject = async (message, why) => {
    reasons.push(why);
    await logEvent({
      ...base,
      action: testMode ? 'test_blocked' : 'blocked',
      score: Math.max(score, threshold),
      reasons: reasons.join(', ').slice(0, 500),
      message: String(message).slice(0, 300),
    });
    if (testMode) return;
    throw ApiError.badRequest(message);
  };

  // --- allow list wins over everything ------------------------------------
  const lists = await listMatch(
    { phone: clean, ip: ip || '', device: deviceId || '' },
    settings.fraud_auto_unblock_days
  );
  if (lists.allowed) {
    await logEvent({ ...base, action: 'allowed', score: 0, reasons: `allowlist:${lists.allowed.value_type}` });
    return { phone: clean, flags: ['allowlisted'], score: 0 };
  }

  // --- hard rules ----------------------------------------------------------
  if (truthy(settings.fraud_layer_honeypot) && honeypot) {
    await reject('অর্ডারটি সম্পন্ন করা যায়নি।', 'honeypot');
  }

  if (truthy(settings.fraud_validate_phone) && !isValidBdPhone(clean)) {
    await reject('সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন ০১৭XXXXXXXX)।', 'invalid_phone');
  }

  const legacyBlocked = String(settings.fraud_blocked_phones || '')
    .split(/[\s,;\n]+/)
    .map(normalisePhone)
    .filter(Boolean);
  if (lists.blocked || legacyBlocked.includes(clean)) {
    await reject(
      'এই তথ্য দিয়ে অর্ডার নেওয়া সম্ভব হচ্ছে না। সহায়তার জন্য আমাদের কল করুন।',
      `blocklist:${lists.blocked?.value_type || 'phone'}`
    );
  }

  const maxTotal = num(settings.fraud_max_order_total, 0);
  if (maxTotal > 0 && Number(total) > maxTotal) {
    await reject('এত বড় অর্ডার অনলাইনে নেওয়া যাচ্ছে না — অনুগ্রহ করে সরাসরি কল করুন।', 'over_max_total');
  }

  // --- scored layers -------------------------------------------------------
  const dupWindow = num(settings.fraud_duplicate_window_minutes, 30);
  const phoneStats = await queryOne(
    `SELECT
       COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 END) AS today_count,
       TIMESTAMPDIFF(MINUTE, MAX(created_at), NOW()) AS minutes_since_last,
       COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
                   AND ROUND(total, 2) = ROUND(?, 2) THEN 1 END) AS duplicate_count,
       COUNT(*) AS lifetime,
       COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled
     FROM orders WHERE customer_phone = ?`,
    [dupWindow || 0, Number(total), clean]
  );

  if (dupWindow > 0 && Number(phoneStats?.duplicate_count) > 0) {
    await reject('একই অর্ডার কিছুক্ষণ আগে করা হয়েছে। অর্ডার ট্র্যাক পেজে দেখে নিন।', 'duplicate_order');
  }

  // Elapsed time is measured by the database: the two clocks sit in different
  // timezones and a JS-side subtraction is hours off.
  if (truthy(settings.fraud_layer_cooldown)) {
    const gap = num(settings.fraud_min_minutes_between, 2);
    const since = phoneStats?.minutes_since_last;
    if (gap > 0 && since !== null && since !== undefined && Number(since) < gap) {
      score += num(settings.fraud_weight_cooldown, 15);
      reasons.push(`cooldown(${since}m<${gap}m)`);
      flags.push('rapid_repeat');
    }
  }

  if (truthy(settings.fraud_layer_phone_limit)) {
    const cap = num(settings.fraud_max_per_phone_day, 3);
    if (cap > 0 && Number(phoneStats?.today_count) >= cap) {
      score += num(settings.fraud_weight_phone, 20);
      reasons.push(`phone_limit(${phoneStats.today_count}/${cap})`);
      flags.push('phone_limit');
    }
  }

  if (truthy(settings.fraud_layer_ip_limit) && ip) {
    const cap = num(settings.fraud_max_per_ip_hour, 6);
    if (cap > 0) {
      const ipStats = await queryOne(
        `SELECT COUNT(*) AS count FROM orders
         WHERE ip_address = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [ip]
      );
      if (Number(ipStats?.count) >= cap) {
        score += num(settings.fraud_weight_ip, 25);
        reasons.push(`ip_limit(${ipStats.count}/${cap})`);
        flags.push('ip_burst');
      }
    }
  }

  // A device that was blocked before is a far stronger signal than a new one.
  if (truthy(settings.fraud_layer_device) && deviceId) {
    const seen = await queryOne(
      `SELECT COUNT(*) AS count FROM fraud_events
       WHERE device_id = ? AND action IN ('blocked','test_blocked')
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [deviceId]
    );
    if (Number(seen?.count) > 0) {
      score += num(settings.fraud_weight_device, 25);
      reasons.push(`device_seen(${seen.count})`);
      flags.push('repeat_device');
    }
  }

  if (truthy(settings.fraud_layer_vpn) && ip) {
    const risk = await lookupIpRisk(ip);
    if (risk?.proxy || risk?.hosting) {
      score += num(settings.fraud_weight_vpn, 20);
      reasons.push(risk.proxy ? 'vpn_proxy' : 'datacenter_ip');
      flags.push('vpn');
    }
  }

  if (truthy(settings.fraud_layer_courier)) {
    try {
      const history = await courierFraudCheck(settings, clean);
      if (history?.total_parcel > 0) {
        const minRatio = num(settings.fraud_min_success_ratio, 0);
        if (minRatio > 0 && history.success_ratio < minRatio) {
          await reject(
            'দুঃখিত, এই নম্বরে অনলাইন অর্ডার নেওয়া যাচ্ছে না। অনুগ্রহ করে আমাদের কল করে অর্ডার করুন।',
            `courier_ratio(${history.success_ratio}%)`
          );
        }
        if (history.success_ratio < 60) {
          score += num(settings.fraud_weight_courier, 30);
          reasons.push(`courier_ratio(${history.success_ratio}%)`);
          flags.push(`courier_success_${Math.round(history.success_ratio)}%`);
        }
        if (history.cancelled_parcel >= 5) flags.push(`${history.cancelled_parcel}_returns`);
      }
    } catch (error) {
      if (error?.statusCode) throw error;
      // Lookup unavailable — carry on without the extra signal.
    }
  }

  // --- verdict -------------------------------------------------------------
  if (score >= threshold) {
    await reject(settings.fraud_block_desc_bn || DEFAULTS.fraud_block_desc_bn, `score(${score}>=${threshold})`);
  }

  const cancelled = Number(phoneStats?.cancelled || 0);
  if (Number(phoneStats?.lifetime || 0) === 0) flags.push('new_customer');
  if (cancelled >= 2) flags.push(`${cancelled}x_cancelled_before`);
  if (Number(itemCount) >= 10) flags.push('bulk_quantity');

  if (score > 0 || flags.length) {
    await logEvent({
      ...base,
      action: 'flagged',
      score,
      reasons: [...reasons, ...flags].join(', ').slice(0, 500),
    });
  }

  return { phone: clean, flags, score };
};
