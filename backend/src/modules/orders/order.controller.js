import { asyncHandler } from '../../utils/asyncHandler.js';
import { getSetting } from '../settings/setting.service.js';
import { ok, created, paginated } from '../../utils/response.js';
import * as service from './order.service.js';

/**
 * Which address to trust. Behind Cloudflare/Nginx the socket address is the
 * proxy's, so `req.ip` (X-Forwarded-For aware) is right; on a direct-exposed
 * server that header is attacker-controlled and the socket address is right.
 */
const clientIp = async (req) => {
  const trustProxy = (await getSetting('fraud_trust_proxy')) ?? '1';
  const useProxy = trustProxy === '1' || trustProxy === 'true' || trustProxy === null;
  return useProxy ? req.ip : req.socket?.remoteAddress || req.ip;
};

export const placeOrder = asyncHandler(async (req, res) =>
  created(
    res,
    await service.place(req.body, {
      ip: await clientIp(req),
      deviceId: req.body.device_id || null,
      // A hidden field no human ever fills in; bots fill everything.
      honeypot: Boolean(req.body.website),
    })
  ));

// Public tracking must not expose the internal fraud/IP columns that SELECT *
// now returns.
export const trackOrder = asyncHandler(async (req, res) => {
  const { ip_address, risk_flags, ...order } = await service.getOne(req.params.code);
  ok(res, order);
});

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
