import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { evaluateCoupon } from './coupon.service.js';
import { normalisePhone } from '../orders/order.guard.js';

const router = Router();
const staff = [authenticate, authorize('immortal', 'admin', 'manager')];

const optionalDate = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v.replace('T', ' ').slice(0, 19) : null));

const couponSchema = z.object({
  code: z.string().trim().min(2).max(40),
  description: z.string().trim().max(200).optional().nullable(),
  type: z.enum(['percent', 'fixed']).default('percent'),
  value: z.coerce.number().min(0),
  min_order: z.coerce.number().min(0).default(0),
  max_discount: z.coerce.number().min(0).optional().nullable(),
  usage_limit: z.coerce.number().int().min(0).optional().nullable(),
  per_phone_limit: z.coerce.number().int().min(0).optional().nullable(),
  starts_at: optionalDate,
  expires_at: optionalDate,
  is_active: z.coerce.number().int().min(0).max(1).default(1),
});

/** Percent coupons are a share; fixed coupons must not exceed the order itself. */
const validateShape = (body) => {
  if (body.type === 'percent' && body.value > 100) {
    throw ApiError.badRequest('শতাংশ ১০০-এর বেশি হতে পারে না।');
  }
  if (body.value <= 0) throw ApiError.badRequest('ডিসকাউন্টের মান ০-এর বেশি দিন।');
};

router.get(
  '/',
  ...staff,
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM coupons ORDER BY is_active DESC, created_at DESC');
    ok(res, rows);
  })
);

router.post(
  '/',
  ...staff,
  validate(couponSchema),
  asyncHandler(async (req, res) => {
    validateShape(req.body);
    const code = req.body.code.toUpperCase();
    const exists = await queryOne('SELECT id FROM coupons WHERE code = ?', [code]);
    if (exists) throw ApiError.conflict('এই কোড আগে থেকেই আছে।');
    const [result] = await query('INSERT INTO coupons SET ?', [{ ...req.body, code }]).then((r) => [r]);
    created(res, await queryOne('SELECT * FROM coupons WHERE id = ?', [result.insertId]));
  })
);

router.put(
  '/:id',
  ...staff,
  validate(couponSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await queryOne('SELECT * FROM coupons WHERE id = ?', [req.params.id]);
    if (!existing) throw ApiError.notFound('Coupon not found');
    const payload = { ...req.body };
    if (payload.code) payload.code = payload.code.toUpperCase();
    if (payload.type || payload.value !== undefined) validateShape({ ...existing, ...payload });
    await query('UPDATE coupons SET ? WHERE id = ?', [payload, existing.id]);
    ok(res, await queryOne('SELECT * FROM coupons WHERE id = ?', [existing.id]));
  })
);

router.delete(
  '/:id',
  authenticate,
  authorize('immortal', 'admin'),
  asyncHandler(async (req, res) => {
    await query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
    ok(res, { deleted: true });
  })
);

/** Public: the checkout page checks a code before the order is placed. */
router.post(
  '/validate',
  validate(z.object({ code: z.string().trim().min(1), subtotal: z.coerce.number().min(0), phone: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const result = await evaluateCoupon({
      code: req.body.code,
      subtotal: req.body.subtotal,
      phone: req.body.phone ? normalisePhone(req.body.phone) : null,
    });
    ok(res, result);
  })
);

export default router;
