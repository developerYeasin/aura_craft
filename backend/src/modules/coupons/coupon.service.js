import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Coupon rules live here rather than in the route so the checkout preview and
 * the actual order placement judge a code identically — a coupon that previews
 * as valid must never be rejected at submit, and vice versa.
 *
 * Window checks run in SQL (NOW()) because the database and the app server sit
 * in different timezones.
 */

const round = (n) => Math.round(Number(n) * 100) / 100;

export const evaluateCoupon = async ({ code, subtotal, phone }) => {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) throw ApiError.badRequest('কুপন কোড লিখুন।');

  const coupon = await queryOne(
    `SELECT *,
            (starts_at IS NOT NULL AND starts_at > NOW()) AS not_started,
            (expires_at IS NOT NULL AND expires_at < NOW()) AS expired
     FROM coupons WHERE code = ? LIMIT 1`,
    [clean]
  );

  if (!coupon || !coupon.is_active) throw ApiError.badRequest('কুপন কোডটি সঠিক নয়।');
  if (Number(coupon.not_started)) throw ApiError.badRequest('এই কুপন এখনো চালু হয়নি।');
  if (Number(coupon.expired)) throw ApiError.badRequest('কুপনের মেয়াদ শেষ হয়ে গেছে।');

  if (coupon.usage_limit && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
    throw ApiError.badRequest('এই কুপনের সীমা শেষ হয়ে গেছে।');
  }

  if (Number(subtotal) < Number(coupon.min_order)) {
    throw ApiError.badRequest(`এই কুপন ব্যবহার করতে কমপক্ষে ৳${Number(coupon.min_order)} এর অর্ডার লাগবে।`);
  }

  if (phone && coupon.per_phone_limit) {
    const { used } = await queryOne(
      'SELECT COUNT(*) AS used FROM orders WHERE coupon_code = ? AND customer_phone = ? AND status <> ?',
      [clean, phone, 'cancelled']
    );
    if (Number(used) >= Number(coupon.per_phone_limit)) {
      throw ApiError.badRequest('এই নম্বরে কুপনটি ব্যবহারের সীমা শেষ।');
    }
  }

  let discount = coupon.type === 'percent' ? (Number(subtotal) * Number(coupon.value)) / 100 : Number(coupon.value);
  if (coupon.max_discount) discount = Math.min(discount, Number(coupon.max_discount));
  // Never discount more than the goods are worth.
  discount = round(Math.min(discount, Number(subtotal)));

  return {
    code: clean,
    type: coupon.type,
    value: Number(coupon.value),
    discount,
    description: coupon.description,
  };
};

/** Bumps the redemption counter once an order using the code is committed. */
export const markCouponUsed = async (code) => {
  if (!code) return;
  await query('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?', [String(code).toUpperCase()]);
};
