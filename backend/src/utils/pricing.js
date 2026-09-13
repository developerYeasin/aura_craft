/**
 * Product discount maths. The SQL and JS versions must agree: SQL is used for
 * sorting/filtering the catalogue, JS is what an order is actually charged.
 */

export const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

export const DISCOUNT_TYPES = ['none', 'percent', 'fixed'];

export const hasDiscount = (p) =>
  (p?.discount_type === 'percent' || p?.discount_type === 'fixed') && Number(p.discount_value) > 0;

export const effectivePrice = (p) => {
  const base = Number(p?.price) || 0;
  if (!hasDiscount(p)) return round2(base);
  const value = Number(p.discount_value);
  if (p.discount_type === 'percent') return round2(Math.max(base * (1 - Math.min(value, 100) / 100), 0));
  return round2(Math.max(base - value, 0));
};

export const finalPriceSql = (alias = 'p') => `(CASE ${alias}.discount_type
    WHEN 'percent' THEN ROUND(${alias}.price * (1 - LEAST(${alias}.discount_value, 100) / 100), 2)
    WHEN 'fixed' THEN GREATEST(${alias}.price - ${alias}.discount_value, 0)
    ELSE ${alias}.price END)`;

/** Returns an error message, or null when the discount is valid for this price. */
export const discountError = ({ price, discount_type, discount_value }) => {
  const value = Number(discount_value) || 0;
  if (!discount_type || discount_type === 'none') return null;
  if (value <= 0) return 'Discount value must be greater than 0';
  if (discount_type === 'percent' && value > 100) return 'Discount percentage cannot exceed 100';
  if (discount_type === 'fixed' && value > Number(price)) return 'Discount amount cannot exceed the price';
  return null;
};
