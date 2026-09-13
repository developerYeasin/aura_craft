import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { upload, uploadVideo } from '../../middlewares/upload.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { created, ok } from '../../utils/response.js';
import { query } from '../../config/db.js';
import { env } from '../../config/env.js';

const router = Router();
const staff = [authenticate, authorize('immortal', 'admin', 'manager')];

const publicUrl = (req, filename) => `${req.protocol}://${req.get('host')}/uploads/${filename}`;

router.post(
  '/image',
  ...staff,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image uploaded');
    created(res, { url: publicUrl(req, req.file.filename), filename: req.file.filename });
  })
);

router.post(
  '/images',
  ...staff,
  upload.array('images', 8),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw ApiError.badRequest('No images uploaded');
    created(res, req.files.map((f) => ({ url: publicUrl(req, f.filename), filename: f.filename })));
  })
);

router.post(
  '/video',
  ...staff,
  uploadVideo.single('video'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No video uploaded');
    created(res, { url: publicUrl(req, req.file.filename), filename: req.file.filename });
  })
);

/** Every URL column that can point at an uploaded file, flattened to one string for lookups. */
const referencedText = async () => {
  const rows = await query(
    `SELECT url AS u FROM product_images
     UNION ALL SELECT video_url FROM products WHERE video_url IS NOT NULL
     UNION ALL SELECT image_url FROM categories WHERE image_url IS NOT NULL
     UNION ALL SELECT banner_url FROM categories WHERE banner_url IS NOT NULL
     UNION ALL SELECT photo_url FROM team_members WHERE photo_url IS NOT NULL`
  );
  return rows.map((r) => r.u).join('\n');
};

router.get(
  '/',
  ...staff,
  asyncHandler(async (req, res) => {
    let names = [];
    try {
      names = (await fs.readdir(env.uploadDir)).filter((n) => !n.startsWith('.'));
    } catch {
      /* no upload dir yet */
    }
    const refs = await referencedText();
    const files = await Promise.all(
      names.map(async (name) => {
        const stat = await fs.stat(path.join(env.uploadDir, name));
        return {
          filename: name,
          url: publicUrl(req, name),
          size: stat.size,
          created_at: stat.mtime,
          kind: /\.(mp4|webm|mov|ogg)$/i.test(name) ? 'video' : 'image',
          in_use: refs.includes(`/uploads/${name}`),
        };
      })
    );
    files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    ok(res, files);
  })
);

router.delete(
  '/:filename',
  authenticate,
  authorize('immortal', 'admin'),
  asyncHandler(async (req, res) => {
    // basename() blocks "../" so only files inside the upload dir can be removed.
    const name = path.basename(req.params.filename);
    if (!name || name.startsWith('.')) throw ApiError.badRequest('Invalid file name');
    try {
      await fs.unlink(path.join(env.uploadDir, name));
    } catch {
      throw ApiError.notFound('File not found');
    }
    ok(res, { deleted: true });
  })
);

export default router;
