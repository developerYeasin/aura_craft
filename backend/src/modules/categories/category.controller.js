import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as service from './category.service.js';

export const listPublic = asyncHandler(async (req, res) => {
  const navOnly = req.query.nav === 'true';
  ok(res, await service.list({ activeOnly: true, navOnly }));
});

export const listAdmin = asyncHandler(async (req, res) => ok(res, await service.list({ activeOnly: false })));

export const getOne = asyncHandler(async (req, res) => ok(res, await service.getByKey(req.params.key)));

export const createOne = asyncHandler(async (req, res) => created(res, await service.create(req.body)));

export const updateOne = asyncHandler(async (req, res) => ok(res, await service.edit(req.params.id, req.body)));

export const deleteOne = asyncHandler(async (req, res) => {
  await service.destroy(req.params.id);
  ok(res, { deleted: true });
});
