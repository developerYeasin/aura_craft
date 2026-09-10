import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginated } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { normalisePhone, DEFAULTS } from '../orders/order.guard.js';

const router = Router();
const staff = [authenticate, authorize('immortal', 'admin', 'manager')];

/** Defaults so the settings page can render before anything has been saved. */
router.get('/defaults', ...staff, asyncHandler(async (req, res) => ok(res, DEFAULTS)));

/* ------------------------------------------------------------------ dashboard */
router.get(
  '/stats',
  ...staff,
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);

    const totals = await queryOne(
      `SELECT
         COUNT(*) AS events,
         COUNT(CASE WHEN action = 'blocked' THEN 1 END) AS blocked,
         COUNT(CASE WHEN action = 'test_blocked' THEN 1 END) AS test_blocked,
         COUNT(CASE WHEN action = 'flagged' THEN 1 END) AS flagged,
         COUNT(CASE WHEN action = 'allowed' THEN 1 END) AS allowed,
         COUNT(DISTINCT phone) AS phones,
         COALESCE(SUM(CASE WHEN action = 'blocked' THEN order_total END), 0) AS blocked_value
       FROM fraud_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );

    const trend = await query(
      `SELECT DATE(created_at) AS day,
              COUNT(CASE WHEN action IN ('blocked','test_blocked') THEN 1 END) AS blocked,
              COUNT(CASE WHEN action = 'flagged' THEN 1 END) AS flagged
       FROM fraud_events WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY day ASC`,
      [days - 1]
    );

    // reasons is a comma-joined list; the first entry is what actually decided it.
    const topReasons = await query(
      `SELECT SUBSTRING_INDEX(reasons, ',', 1) AS reason, COUNT(*) AS count
       FROM fraud_events
       WHERE action IN ('blocked','test_blocked') AND reasons IS NOT NULL
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY reason ORDER BY count DESC LIMIT 8`,
      [days]
    );

    const repeatOffenders = await query(
      `SELECT phone, COUNT(*) AS attempts, MAX(created_at) AS last_attempt
       FROM fraud_events
       WHERE action IN ('blocked','test_blocked') AND phone IS NOT NULL
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY phone ORDER BY attempts DESC LIMIT 5`,
      [days]
    );

    const listCounts = await queryOne(
      `SELECT COUNT(CASE WHEN list_type = 'block' THEN 1 END) AS blocklist,
              COUNT(CASE WHEN list_type = 'allow' THEN 1 END) AS allowlist
       FROM fraud_lists`
    );

    ok(res, { days, totals, trend, topReasons, repeatOffenders, listCounts });
  })
);

/* -------------------------------------------------------------- activity log */
const eventQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  action: z.enum(['blocked', 'test_blocked', 'flagged', 'allowed']).optional(),
  search: z.string().trim().optional(),
});

router.get(
  '/events',
  ...staff,
  validate(eventQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, action, search } = req.validatedQuery;
    const where = [];
    const params = [];
    if (action) {
      where.push('action = ?');
      params.push(action);
    }
    if (search) {
      where.push('(phone LIKE ? OR ip_address LIKE ? OR reasons LIKE ? OR customer_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `SELECT * FROM fraud_events ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    const { total } = await queryOne(`SELECT COUNT(*) AS total FROM fraud_events ${clause}`, params);

    paginated(res, rows, { page, limit, total });
  })
);

router.delete(
  '/events',
  authenticate,
  authorize('immortal', 'admin'),
  asyncHandler(async (req, res) => {
    const days = Number(req.query.older_than_days);
    if (Number.isFinite(days) && days > 0) {
      await query('DELETE FROM fraud_events WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]);
    } else {
      await query('DELETE FROM fraud_events');
    }
    ok(res, { cleared: true });
  })
);

/* ----------------------------------------------------------- block/allow list */
const listSchema = z.object({
  list_type: z.enum(['block', 'allow']).default('block'),
  value_type: z.enum(['phone', 'ip', 'device']).default('phone'),
  value: z.string().trim().min(2).max(120),
  note: z.string().trim().max(200).optional().nullable(),
  expires_at: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v.replace('T', ' ').slice(0, 19) : null)),
});

router.get(
  '/lists',
  ...staff,
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM fraud_lists ORDER BY list_type ASC, created_at DESC');
    ok(res, rows);
  })
);

router.post(
  '/lists',
  ...staff,
  validate(listSchema),
  asyncHandler(async (req, res) => {
    const payload = { ...req.body, created_by: req.user?.name || req.user?.email || null };
    // Phones are stored normalised so a lookup by 8801… matches an 01… entry.
    if (payload.value_type === 'phone') payload.value = normalisePhone(payload.value);
    if (!payload.value) throw ApiError.badRequest('মান খালি রাখা যাবে না।');

    const exists = await queryOne(
      'SELECT id FROM fraud_lists WHERE list_type = ? AND value_type = ? AND value = ?',
      [payload.list_type, payload.value_type, payload.value]
    );
    if (exists) throw ApiError.conflict('এই এন্ট্রি আগে থেকেই তালিকায় আছে।');

    const [result] = await query('INSERT INTO fraud_lists SET ?', [payload]).then((r) => [r]);
    created(res, await queryOne('SELECT * FROM fraud_lists WHERE id = ?', [result.insertId]));
  })
);

router.delete(
  '/lists/:id',
  ...staff,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM fraud_lists WHERE id = ?', [req.params.id]);
    ok(res, { deleted: true });
  })
);

/** One click from the activity log: block whatever attribute caused trouble. */
router.post(
  '/lists/from-event/:id',
  ...staff,
  validate(z.object({ value_type: z.enum(['phone', 'ip', 'device']).default('phone'), note: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const event = await queryOne('SELECT * FROM fraud_events WHERE id = ?', [req.params.id]);
    if (!event) throw ApiError.notFound('Event not found');

    const column = { phone: 'phone', ip: 'ip_address', device: 'device_id' }[req.body.value_type];
    const value = event[column];
    if (!value) throw ApiError.badRequest('এই ইভেন্টে ওই তথ্যটি নেই।');

    const exists = await queryOne(
      'SELECT id FROM fraud_lists WHERE list_type = ? AND value_type = ? AND value = ?',
      ['block', req.body.value_type, value]
    );
    if (exists) return ok(res, { already: true });

    await query('INSERT INTO fraud_lists SET ?', [
      {
        list_type: 'block',
        value_type: req.body.value_type,
        value,
        note: req.body.note || `Event #${event.id}: ${event.reasons || ''}`.slice(0, 200),
        created_by: req.user?.name || req.user?.email || null,
      },
    ]);
    ok(res, { blocked: value });
  })
);

export default router;
