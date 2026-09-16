import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/response.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import * as service from './view.service.js';

const router = Router();

// Views are public and fire on page open; this only stops scripted floods.
const viewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
});

router.get(
  '/summary',
  authenticate,
  authorize('immortal', 'admin', 'manager'),
  asyncHandler(async (req, res) => ok(res, await service.summary({ days: req.query.days })))
);

router.post(
  '/:type/:id',
  viewLimiter,
  asyncHandler(async (req, res) => {
    const visitorId = typeof req.body?.visitorId === 'string' ? req.body.visitorId.slice(0, 64) : '';
    const result = await service.record(req.params.type, req.params.id, {
      visitorId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (!result) throw ApiError.notFound('Nothing to count');
    ok(res, result);
  })
);

export default router;
