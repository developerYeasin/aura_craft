import * as repo from './product.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { slugify } from '../../utils/slug.js';

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
  if (data.name && !data.slug) data.slug = `${slugify(data.name)}-${Date.now().toString(36)}`;
  else if (data.slug) data.slug = slugify(data.slug);
  return { data, images };
};

export const create = async (payload) => {
  const { data, images = [] } = prepare(payload);
  const id = await repo.insert(data, images);
  return repo.findByKey(id, { activeOnly: false });
};

export const edit = async (id, payload) => {
  const existing = await repo.findByKey(id, { activeOnly: false });
  if (!existing) throw ApiError.notFound('Product not found');
  const { data, images } = prepare(payload);
  await repo.update(existing.id, data, images);
  return repo.findByKey(existing.id, { activeOnly: false });
};

export const destroy = async (id) => {
  const existing = await repo.findByKey(id, { activeOnly: false });
  if (!existing) throw ApiError.notFound('Product not found');
  await repo.remove(existing.id);
};
