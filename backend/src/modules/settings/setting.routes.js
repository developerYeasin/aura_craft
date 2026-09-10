import { Router } from 'express';
import { z } from 'zod';
import * as service from './setting.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

const settingsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));

router.get('/', asyncHandler(async (req, res) => ok(res, await service.getPublic())));

// Admin view keeps the real secret values so they can be edited.
router.get(
  '/admin',
  authenticate,
  authorize('immortal', 'admin'),
  asyncHandler(async (req, res) => ok(res, await service.getAll()))
);

router.put(
  '/',
  authenticate,
  authorize('immortal', 'admin'),
  validate(settingsSchema),
  asyncHandler(async (req, res) => ok(res, await service.saveMany(req.body)))
);

export default router;
