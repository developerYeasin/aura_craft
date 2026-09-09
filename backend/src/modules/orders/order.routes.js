import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './order.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { createOrderSchema, updateStatusSchema, orderQuerySchema } from './order.validation.js';

const router = Router();
const staff = [authenticate, authorize('immortal', 'admin', 'manager')];

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many orders from this device, please try again later.' },
});

router.post('/', orderLimiter, validate(createOrderSchema), controller.placeOrder);
router.get('/track/:code', controller.trackOrder);

router.get('/', ...staff, validate(orderQuerySchema, 'query'), controller.listOrders);
router.get('/:id', ...staff, controller.getOrder);
router.patch('/:id/status', ...staff, validate(updateStatusSchema), controller.updateStatus);
router.delete('/:id', authenticate, authorize('immortal', 'admin'), controller.deleteOrder);

export default router;
