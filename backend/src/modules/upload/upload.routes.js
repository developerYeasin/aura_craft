import { Router } from 'express';
import { upload } from '../../middlewares/upload.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { created } from '../../utils/response.js';

const router = Router();

const publicUrl = (req, filename) => `${req.protocol}://${req.get('host')}/uploads/${filename}`;

router.post(
  '/image',
  authenticate,
  authorize('immortal', 'admin', 'manager'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image uploaded');
    created(res, { url: publicUrl(req, req.file.filename), filename: req.file.filename });
  })
);

router.post(
  '/images',
  authenticate,
  authorize('immortal', 'admin', 'manager'),
  upload.array('images', 8),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw ApiError.badRequest('No images uploaded');
    created(res, req.files.map((f) => ({ url: publicUrl(req, f.filename), filename: f.filename })));
  })
);

export default router;
