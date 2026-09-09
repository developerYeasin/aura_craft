import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginated } from '../../utils/response.js';
import * as service from './order.service.js';

export const placeOrder = asyncHandler(async (req, res) => created(res, await service.place(req.body)));

export const trackOrder = asyncHandler(async (req, res) => ok(res, await service.getOne(req.params.code)));

export const listOrders = asyncHandler(async (req, res) => {
  const { items, ...meta } = await service.list(req.validatedQuery);
  paginated(res, items, meta);
});

export const getOrder = asyncHandler(async (req, res) => ok(res, await service.getOne(req.params.id)));

export const updateStatus = asyncHandler(async (req, res) =>
  ok(res, await service.changeStatus(req.params.id, req.body.status))
);

export const deleteOrder = asyncHandler(async (req, res) => {
  await service.destroy(req.params.id);
  ok(res, { deleted: true });
});
