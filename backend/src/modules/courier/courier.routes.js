import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { getAll } from '../settings/setting.service.js';
import { env } from '../../config/env.js';
import { getProvider, PROVIDERS, courierFraudCheck } from './courier.providers.js';
import { lookupMany } from './fraud.service.js';
import { normalisePhone } from '../orders/order.guard.js';

const router = Router();
const staff = [authenticate, authorize('immortal', 'admin', 'manager')];

const loadOrder = async (id) => {
  const order = await queryOne(
    `SELECT o.*,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
            (SELECT oi.product_name FROM order_items oi WHERE oi.order_id = o.id LIMIT 1) AS first_product
     FROM orders o WHERE o.id = ? LIMIT 1`,
    [id]
  );
  if (!order) throw ApiError.notFound('Order not found');
  return order;
};

/** Which couriers exist, and whether the configured one has its keys filled in. */
router.get(
  '/providers',
  ...staff,
  asyncHandler(async (req, res) => {
    const settings = await getAll();
    ok(res, {
      active: settings.courier_provider || 'none',
      providers: Object.entries(PROVIDERS).map(([key, p]) => ({ key, label: p.label })),
      fraud_check_enabled: Boolean(settings.bdcourier_api_key || env.fraudApi.key),
    });
  })
);

/** One-click credential test from the settings page. */
router.post(
  '/verify',
  ...staff,
  asyncHandler(async (req, res) => {
    const settings = await getAll();
    const provider = getProvider(settings);
    const result = await provider.verify(settings);
    ok(res, { provider: provider.label, ...result });
  })
);

/** Book the consignment and remember it on the order. */
router.post(
  '/orders/:id/send',
  ...staff,
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.params.id);
    if (order.courier_consignment_id) {
      throw ApiError.conflict(`এই অর্ডার আগেই কুরিয়ারে পাঠানো হয়েছে (${order.courier_consignment_id})।`);
    }
    if (order.status === 'cancelled') throw ApiError.badRequest('বাতিল অর্ডার কুরিয়ারে পাঠানো যাবে না।');

    const settings = await getAll();
    const provider = getProvider(settings);
    const parcel = await provider.createParcel(settings, order);

    await query(
      `UPDATE orders
       SET courier_provider = ?, courier_consignment_id = ?, courier_tracking_url = ?, courier_status = ?,
           status = CASE WHEN status IN ('pending','processing') THEN 'shipped' ELSE status END
       WHERE id = ?`,
      [settings.courier_provider, parcel.consignment_id, parcel.tracking_url, parcel.status, order.id]
    );

    ok(res, { ...parcel, provider: settings.courier_provider, order_id: order.id });
  })
);

/** Pull the live delivery status for an already-booked order. */
router.get(
  '/orders/:id/status',
  ...staff,
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.params.id);
    if (!order.courier_consignment_id) throw ApiError.badRequest('এই অর্ডার এখনো কুরিয়ারে পাঠানো হয়নি।');

    const settings = await getAll();
    const provider = PROVIDERS[order.courier_provider] || getProvider(settings);
    const { status } = await provider.fetchStatus(settings, order.courier_consignment_id);

    await query('UPDATE orders SET courier_status = ? WHERE id = ?', [status, order.id]);
    ok(res, { order_id: order.id, consignment_id: order.courier_consignment_id, status });
  })
);

/**
 * Success ratios for a page of orders. Cached server-side, so opening the order
 * list repeatedly costs no external calls.
 */
router.post(
  '/fraud-check/bulk',
  ...staff,
  validate(z.object({ phones: z.array(z.string().min(6)).max(50) })),
  asyncHandler(async (req, res) => {
    ok(res, await lookupMany(req.body.phones));
  })
);

/** COD risk history for a phone number, via BDCourier. */
router.get(
  '/fraud-check',
  ...staff,
  validate(z.object({ phone: z.string().min(6) }), 'query'),
  asyncHandler(async (req, res) => {
    const settings = await getAll();
    const phone = normalisePhone(req.validatedQuery.phone);
    const summary = await courierFraudCheck(settings, phone);
    if (!summary.configured) throw ApiError.badRequest('কুরিয়ার ফ্রড-চেক চালু নেই (BDCourier API key বসানো হয়নি)।');
    if (summary.failed) throw ApiError.badRequest(summary.message || 'কুরিয়ার ফ্রড-চেক সার্ভিস এখন সাড়া দিচ্ছে না।');
    if (summary.empty) throw ApiError.badRequest('এই নম্বরের কোনো কুরিয়ার রেকর্ড পাওয়া যায়নি।');
    const { configured, ...history } = summary;
    ok(res, { phone, ...history });
  })
);

export default router;
