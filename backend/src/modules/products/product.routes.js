import { Router } from 'express';
import * as controller from './product.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { listQuerySchema, createProductSchema, updateProductSchema, stockSchema } from './product.validation.js';

const router = Router();
const staff = [authenticate, authorize('immortal', 'admin', 'manager')];

router.get('/', validate(listQuerySchema, 'query'), controller.listPublic);
router.get('/home-feed', controller.homeFeed);
router.get('/facets', validate(listQuerySchema, 'query'), controller.getFacets);
router.get('/admin/all', ...staff, validate(listQuerySchema, 'query'), controller.listAdmin);
router.get('/:key', controller.getOne);

router.post('/', ...staff, validate(createProductSchema), controller.createOne);
router.put('/:id', ...staff, validate(updateProductSchema), controller.updateOne);
router.patch('/:id/stock', ...staff, validate(stockSchema), controller.updateStock);
router.delete('/:id', authenticate, authorize('immortal', 'admin'), controller.deleteOne);

export default router;
