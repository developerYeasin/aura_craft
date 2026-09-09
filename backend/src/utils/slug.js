export const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}\p{M}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `item-${Date.now()}`;
