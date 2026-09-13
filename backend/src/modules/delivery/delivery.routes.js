import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/response.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as service from './delivery.service.js';

const router = Router();
const staff = [authenticate, authorize('immortal', 'admin', 'manager')];
const admins = [authenticate, authorize('immortal', 'admin')];

const zoneSchema = z.object({
  name: z.string().trim().min(2).max(120),
  name_bn: z.string().trim().max(120).optional().nullable(),
  region: z.enum(['inside_dhaka', 'outside_dhaka']).default('inside_dhaka'),
  charge: z.coerce.number().min(0).default(0),
  note: z.string().trim().max(200).optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
});

router.get('/', asyncHandler(async (req, res) => ok(res, await service.listActive())));
router.get('/all', ...staff, asyncHandler(async (req, res) => ok(res, await service.listAll())));

router.post(
  '/',
  ...admins,
  validate(zoneSchema),
  asyncHandler(async (req, res) => {
    const result = await query('INSERT INTO delivery_zones SET ?', [req.body]);
    created(res, await service.findById(result.insertId));
  })
);

router.put(
  '/:id',
  ...admins,
  validate(zoneSchema.partial()),
  asyncHandler(async (req, res) => {
    const zone = await service.findById(req.params.id);
    if (!zone) throw ApiError.notFound('Delivery zone not found');
    if (Object.keys(req.body).length) await query('UPDATE delivery_zones SET ? WHERE id = ?', [req.body, zone.id]);
    ok(res, await service.findById(zone.id));
  })
);

router.delete(
  '/:id',
  ...admins,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM delivery_zones WHERE id = ?', [req.params.id]);
    ok(res, { deleted: true });
  })
);

export default router;
