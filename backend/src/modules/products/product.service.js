import * as repo from './product.repository.js';
import { query } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { slugify } from '../../utils/slug.js';
import { discountError } from '../../utils/pricing.js';
import { notify } from '../notifications/notification.service.js';

/** Checks the discount against the price it will apply to (the merged row on edit). */
const assertDiscount = (row) => {
  const message = discountError(row);
  if (message) throw ApiError.badRequest(message, [{ field: 'discount_value', message }]);
};

const toFilters = (q, { activeOnly = true } = {}) => ({
  activeOnly,
  categorySlug: q.category,
  categoryId: q.categoryId,
  search: q.search,
  minPrice: q.minPrice,
  maxPrice: q.maxPrice,
  material: q.material,
  color: q.color,
  featured: q.featured === 'true',
  inStock: q.inStock === 'true',
});

export const list = async (q, options = {}) => {
  const { rows, total } = await repo.findMany(toFilters(q, options), { page: q.page, limit: q.limit, sort: q.sort });
  return { items: rows, page: q.page, limit: q.limit, total };
};

export const facets = (q) => repo.findFacets(toFilters(q));

export const homeFeed = (perCategory) => repo.findGroupedByCategory(perCategory);

export const getDetail = async (key, options) => {
  const product = await repo.findByKey(key, options);
  if (!product) throw ApiError.notFound('Product not found');
  const related = await repo.findRelated(product);
  return { ...product, related };
};

const prepare = (payload) => {
  const { images, ...rest } = payload;
  const data = { ...rest };
  // A removed discount must not leave a stale value behind to resurface later.
  if (data.discount_type === 'none') data.discount_value = 0;
  if (data.video_url === '') data.video_url = null;
  if (data.name && !data.slug) data.slug = `${slugify(data.name)}-${Date.now().toString(36)}`;
  else if (data.slug) data.slug = slugify(data.slug);
  return { data, images };
};

export const create = async (payload) => {
  const { data, images = [] } = prepare(payload);
  assertDiscount(data);
  const id = await repo.insert(data, images);
  const product = await repo.findByKey(id, { activeOnly: false });
  notify({
    type: 'product',
    title: 'নতুন প্রোডাক্ট যোগ হয়েছে',
    body: product.name,
    link: '/admin/products',
    meta: { productId: product.id },
  });
  return product;
};

export const edit = async (id, payload) => {
  const existing = await repo.findByKey(id, { activeOnly: false });
  if (!existing) throw ApiError.notFound('Product not found');
  const { data, images } = prepare(payload);
  assertDiscount({ ...existing, ...data });
  await repo.update(existing.id, data, images);
  const product = await repo.findByKey(existing.id, { activeOnly: false });
  const visibility =
    data.is_active !== undefined && Number(data.is_active) !== Number(existing.is_active)
      ? (Number(data.is_active) ? ' · এখন দৃশ্যমান' : ' · লুকানো হয়েছে')
      : '';
  notify({
    type: 'product',
    title: 'প্রোডাক্ট আপডেট হয়েছে',
    body: `${product.name}${visibility}`,
    link: '/admin/products',
    meta: { productId: product.id },
  });
  return product;
};

/**
 * Stock-only update. Kept apart from edit() so the product list can adjust
 * stock without sending (and risking overwriting) the whole product payload.
 */
export const setStock = async (id, { stock, delta }) => {
  const existing = await repo.findByKey(id, { activeOnly: false });
  if (!existing) throw ApiError.notFound('Product not found');
  const next = stock !== undefined ? stock : Math.max(0, Number(existing.stock) + Number(delta));
  await query('UPDATE products SET stock = ? WHERE id = ?', [next, existing.id]);
  return { id: existing.id, name: existing.name, stock: next, previous: Number(existing.stock) };
};

export const destroy = async (id) => {
  const existing = await repo.findByKey(id, { activeOnly: false });
  if (!existing) throw ApiError.notFound('Product not found');
  await repo.remove(existing.id);
};
