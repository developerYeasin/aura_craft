import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/response.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();
const staff = [authenticate, authorize('immortal', 'admin')];

const memberSchema = z.object({
  name: z.string().min(2).max(140),
  role: z.string().min(2).max(140),
  bio: z.string().optional().nullable(),
  photo_url: z.string().max(500).optional().nullable(),
  facebook_url: z.string().max(300).optional().nullable(),
  instagram_url: z.string().max(300).optional().nullable(),
  twitter_url: z.string().max(300).optional().nullable(),
  youtube_url: z.string().max(300).optional().nullable(),
  sort_order: z.coerce.number().int().optional(),
  is_active: z.coerce.number().int().min(0).max(1).optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) =>
    ok(res, await query('SELECT * FROM team_members WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'))
  )
);

router.get(
  '/all',
  ...staff,
  asyncHandler(async (req, res) => ok(res, await query('SELECT * FROM team_members ORDER BY sort_order ASC, id ASC')))
);

router.post(
  '/',
  ...staff,
  validate(memberSchema),
  asyncHandler(async (req, res) => {
    const result = await query('INSERT INTO team_members SET ?', [req.body]);
    created(res, await queryOne('SELECT * FROM team_members WHERE id = ?', [result.insertId]));
  })
);

router.put(
  '/:id',
  ...staff,
  validate(memberSchema.partial()),
  asyncHandler(async (req, res) => {
    const member = await queryOne('SELECT * FROM team_members WHERE id = ?', [req.params.id]);
    if (!member) throw ApiError.notFound('Team member not found');
    if (Object.keys(req.body).length) await query('UPDATE team_members SET ? WHERE id = ?', [req.body, member.id]);
    ok(res, await queryOne('SELECT * FROM team_members WHERE id = ?', [member.id]));
  })
);

router.delete(
  '/:id',
  ...staff,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM team_members WHERE id = ?', [req.params.id]);
    ok(res, { deleted: true });
  })
);

export default router;
