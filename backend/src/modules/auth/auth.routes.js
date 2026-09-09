import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/response.js';
import { authenticate, authorize, signToken } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['immortal', 'admin', 'manager']).default('admin'),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(4),
  new_password: z.string().min(6),
});

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  is_active: !!user.is_active,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in a few minutes.' },
});

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await queryOne('SELECT * FROM users WHERE email = ? LIMIT 1', [req.body.email]);
    if (!user || !bcrypt.compareSync(req.body.password, user.password_hash)) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (!user.is_active) throw ApiError.forbidden('This account has been disabled');

    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    ok(res, { token: signToken(user), user: publicUser(user) });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => ok(res, publicUser(req.user)))
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!bcrypt.compareSync(req.body.current_password, user.password_hash)) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [
      bcrypt.hashSync(req.body.new_password, 10),
      user.id,
    ]);
    ok(res, { updated: true });
  })
);

router.get(
  '/users',
  authenticate,
  authorize('immortal'),
  asyncHandler(async (req, res) =>
    ok(res, await query('SELECT id, name, email, role, is_active, last_login_at, created_at FROM users ORDER BY id'))
  )
);

router.post(
  '/users',
  authenticate,
  authorize('immortal'),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const exists = await queryOne('SELECT id FROM users WHERE email = ?', [req.body.email]);
    if (exists) throw ApiError.conflict('A user with this email already exists');
    const result = await query('INSERT INTO users SET ?', [
      {
        name: req.body.name,
        email: req.body.email,
        password_hash: bcrypt.hashSync(req.body.password, 10),
        role: req.body.role,
      },
    ]);
    created(res, { id: result.insertId, ...publicUser({ ...req.body, id: result.insertId, is_active: 1 }) });
  })
);

router.patch(
  '/users/:id/toggle',
  authenticate,
  authorize('immortal'),
  asyncHandler(async (req, res) => {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) throw ApiError.notFound('User not found');
    if (user.id === req.user.id) throw ApiError.badRequest('You cannot disable your own account');
    await query('UPDATE users SET is_active = ? WHERE id = ?', [user.is_active ? 0 : 1, user.id]);
    ok(res, { id: user.id, is_active: !user.is_active });
  })
);

router.delete(
  '/users/:id',
  authenticate,
  authorize('immortal'),
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === req.user.id) throw ApiError.badRequest('You cannot delete your own account');
    await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    ok(res, { deleted: true });
  })
);

export default router;
