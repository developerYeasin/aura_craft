import { Router } from 'express';
import * as controller from './category.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { createCategorySchema, updateCategorySchema } from './category.validation.js';

const router = Router();

router.get('/', controller.listPublic);
router.get('/all', authenticate, authorize('immortal', 'admin', 'manager'), controller.listAdmin);
router.get('/:key', controller.getOne);

router.post('/', authenticate, authorize('immortal', 'admin'), validate(createCategorySchema), controller.createOne);
router.put('/:id', authenticate, authorize('immortal', 'admin'), validate(updateCategorySchema), controller.updateOne);
router.delete('/:id', authenticate, authorize('immortal', 'admin'), controller.deleteOne);

export default router;
