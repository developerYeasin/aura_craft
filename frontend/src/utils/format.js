const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * The storefront language decides the digit system. It lives at module level
 * (set by I18nProvider) so every money()/toBn() call follows the switch without
 * each caller having to thread the language through.
 */
let formatLocale = 'bn';
export const setFormatLocale = (locale) => {
  formatLocale = locale;
};

export const toBn = (value) =>
  formatLocale === 'bn' ? String(value ?? '').replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : String(value ?? '');

/** Format a price as ৳ 1,200 (Bengali numerals when the site is in Bangla). */
export const money = (value) => {
  const num = Number(value || 0);
  const formatted = num.toLocaleString('en-US', { maximumFractionDigits: num % 1 === 0 ? 0 : 2 });
  return `৳ ${toBn(formatted)}`;
};

/**
 * Latin-digit counterparts of toBn/money, for the admin panel. Staff read
 * numbers there all day next to order codes and dates that are already Latin,
 * and mixed digit systems in one table slow that down badly.
 */
export const enNum = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  return n.toLocaleString('en-US', { maximumFractionDigits: n % 1 === 0 ? 0 : 2 });
};

export const enMoney = (value) => `৳ ${enNum(Number(value || 0))}`;

/** Trims a trailing .00 so a full record reads "100%", not "100.00%". */
export const enPercent = (value) => `${enNum(Math.round(Number(value || 0) * 100) / 100)}%`;

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

/**
 * Everything a price label needs, in one place. A product-level discount
 * (discount_type/discount_value) wins; the older compare_price "was" price is
 * still honoured for products that were never given a discount.
 * Mirrors backend/src/utils/pricing.js — the server's number is what is charged.
 */
export const priceInfo = (product) => {
  const price = Number(product?.price || 0);
  const type = product?.discount_type;
  const value = Number(product?.discount_value || 0);

  if ((type === 'percent' || type === 'fixed') && value > 0) {
    const computed = type === 'percent' ? price * (1 - Math.min(value, 100) / 100) : price - value;
    const final = round2(product.final_price != null ? Number(product.final_price) : Math.max(computed, 0));
    return {
      final,
      original: price,
      hasDiscount: final < price,
      percent: price > 0 ? Math.round(((price - final) / price) * 100) : 0,
      type,
      value,
      saved: round2(price - final),
    };
  }

  const compare = Number(product?.compare_price || 0);
  if (compare > price) {
    return {
      final: price,
      original: compare,
      hasDiscount: true,
      percent: Math.round(((compare - price) / compare) * 100),
      type: 'percent',
      value: 0,
      saved: round2(compare - price),
    };
  }
  return { final: price, original: price, hasDiscount: false, percent: 0, type: 'none', value: 0, saved: 0 };
};

export const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-CA');
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString('en-CA')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1c3a"/><stop offset="1" stop-color="#140e1d"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><text x="50%" y="50%" fill="#c9a35a" font-family="Georgia,serif" font-size="26" text-anchor="middle">Aura Craft</text></svg>`
  );

export const imageOf = (product) => product?.image || product?.images?.[0]?.url || PLACEHOLDER_IMAGE;

export const ORDER_STATUS = {
  pending: { label: 'Pending', bn: 'পেন্ডিং', badge: 'badge--warn' },
  processing: { label: 'Processing', bn: 'প্রসেসিং', badge: 'badge--info' },
  shipped: { label: 'Shipped', bn: 'শিপড', badge: 'badge--pink' },
  delivered: { label: 'Delivered', bn: 'ডেলিভার্ড', badge: 'badge--ok' },
  cancelled: { label: 'Cancelled', bn: 'বাতিল', badge: 'badge--danger' },
};

export const categoryLabel = (category) => category?.name_bn || category?.name || '';
