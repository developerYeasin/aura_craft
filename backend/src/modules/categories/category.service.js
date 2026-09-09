import * as repo from './category.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { slugify } from '../../utils/slug.js';

export const list = (options) => repo.findAll(options);

export const getByKey = async (key) => {
  const category = await repo.findByIdOrSlug(key);
  if (!category) throw ApiError.notFound('Category not found');
  return category;
};

export const create = async (payload) => {
  const data = { ...payload, slug: payload.slug ? slugify(payload.slug) : slugify(payload.name) };
  const id = await repo.insert(data);
  return repo.findByIdOrSlug(id);
};

export const edit = async (id, payload) => {
  await getByKey(id);
  const data = { ...payload };
  if (data.slug) data.slug = slugify(data.slug);
  if (Object.keys(data).length) await repo.update(id, data);
  return repo.findByIdOrSlug(id);
};

export const destroy = async (id) => {
  await getByKey(id);
  await repo.remove(id);
};
