const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Convert ASCII digits in a value to Bengali numerals. */
export const toBn = (value) => String(value ?? '').replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/** Format an amount the way the storefront does: ৳ ১,২৬০ */
export const money = (value) =>
  `৳${toBn(Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }))}`;
