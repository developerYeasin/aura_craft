import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginated } from '../../utils/response.js';
import * as service from './product.service.js';

export const listPublic = asyncHandler(async (req, res) => {
  const { items, ...meta } = await service.list(req.validatedQuery);
  paginated(res, items, meta);
});

export const listAdmin = asyncHandler(async (req, res) => {
  const { items, ...meta } = await service.list(req.validatedQuery, { activeOnly: false });
  paginated(res, items, meta);
});

export const getFacets = asyncHandler(async (req, res) => ok(res, await service.facets(req.validatedQuery)));

export const homeFeed = asyncHandler(async (req, res) => {
  const perCategory = Math.min(Number(req.query.perCategory) || 6, 24);
  ok(res, await service.homeFeed(perCategory));
});

export const getOne = asyncHandler(async (req, res) => ok(res, await service.getDetail(req.params.key)));

export const createOne = asyncHandler(async (req, res) => created(res, await service.create(req.body)));

export const updateOne = asyncHandler(async (req, res) => ok(res, await service.edit(req.params.id, req.body)));

export const deleteOne = asyncHandler(async (req, res) => {
  await service.destroy(req.params.id);
  ok(res, { deleted: true });
});
