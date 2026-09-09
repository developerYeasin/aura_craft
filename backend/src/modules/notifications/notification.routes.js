import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/response.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import * as service from './notification.service.js';

const router = Router();
const staff = [authenticate, authorize('immortal', 'admin', 'manager')];

/**
 * EventSource cannot send an Authorization header, so the stream accepts the token
 * as a query parameter instead. Tokens in URLs can end up in access logs, so this
 * route is excluded from request logging (see app.js) and the token is never
 * forwarded anywhere else.
 */
const authenticateStream = async (req, res, next) => {
  try {
    const token = req.query.token || (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) throw ApiError.unauthorized('Authentication token missing');
    const payload = jwt.verify(token, env.jwt.secret);
    const user = await queryOne('SELECT id, name, email, role, is_active FROM users WHERE id = ?', [payload.sub]);
    if (!user || !user.is_active) throw ApiError.unauthorized('Account is not active');
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Invalid or expired token'));
    }
    next(error);
  }
};

/** Live stream of notifications for open admin panels. */
router.get('/stream', authenticateStream, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');
  res.write(`event: ready\ndata: ${JSON.stringify({ user: req.user.name })}\n\n`);

  const id = service.addClient(res, req.user);
  req.on('close', () => service.removeClient(id));
});

router.get(
  '/',
  ...staff,
  asyncHandler(async (req, res) =>
    ok(res, await service.list({ limit: Number(req.query.limit) || 30, unreadOnly: req.query.unread === 'true' }), {
      unread: await service.unreadCount(),
    })
  )
);

router.patch(
  '/:id/read',
  ...staff,
  asyncHandler(async (req, res) => {
    await service.markRead(req.params.id);
    ok(res, { updated: true, unread: await service.unreadCount() });
  })
);

router.post(
  '/read-all',
  ...staff,
  asyncHandler(async (req, res) => {
    await service.markAllRead();
    ok(res, { updated: true, unread: 0 });
  })
);

router.delete(
  '/',
  authenticate,
  authorize('immortal', 'admin'),
  asyncHandler(async (req, res) => {
    await service.removeAll();
    ok(res, { cleared: true });
  })
);

/* --------------------------------------------------------------- web push */

router.get('/vapid-key', ...staff, (req, res) => ok(res, { key: service.vapidPublicKey() }));

router.post(
  '/subscribe',
  ...staff,
  asyncHandler(async (req, res) => {
    await service.saveSubscription(req.body, req.user.id, req.headers['user-agent']);
    ok(res, { subscribed: true });
  })
);

router.post(
  '/unsubscribe',
  ...staff,
  asyncHandler(async (req, res) => {
    await service.removeSubscription(req.body.endpoint);
    ok(res, { unsubscribed: true });
  })
);

/** Lets an admin confirm notifications actually reach their device. */
router.post(
  '/test',
  ...staff,
  asyncHandler(async (req, res) => {
    const n = await service.notify({
      type: 'system',
      title: 'টেস্ট নোটিফিকেশন',
      body: `${req.user.name} — নোটিফিকেশন ঠিকমতো কাজ করছে ✅`,
      link: '/admin',
    });
    ok(res, n);
  })
);

export default router;
