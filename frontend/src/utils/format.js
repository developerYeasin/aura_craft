const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const toBn = (value) => String(value ?? '').replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/** Format a price as ৳ 1,200 (Bengali numerals). */
export const money = (value) => {
  const num = Number(value || 0);
  const formatted = num.toLocaleString('en-US', { maximumFractionDigits: num % 1 === 0 ? 0 : 2 });
  return `৳ ${toBn(formatted)}`;
};

export const discountPercent = (price, comparePrice) => {
  const p = Number(price);
  const c = Number(comparePrice || 0);
  if (!c || c <= p) return 0;
  return Math.round(((c - p) / c) * 100);
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#170f2a"/><text x="50%" y="50%" fill="#5b5175" font-family="sans-serif" font-size="20" text-anchor="middle">AuraCraft</text></svg>`
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
