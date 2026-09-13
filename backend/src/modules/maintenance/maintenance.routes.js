import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { query, transaction } from '../../config/db.js';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/response.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

/**
 * "Clear All" for each admin section. Every wipe needs the section key typed
 * back as `confirm`, so a stray click or a replayed request cannot empty a table.
 */

const router = Router();
const admins = [authenticate, authorize('immortal', 'admin')];

const countOf = async (sql) => Number((await query(sql))[0]?.c || 0);

const listUploads = async () => {
  try {
    const names = await fs.readdir(env.uploadDir);
    return names.filter((n) => !n.startsWith('.'));
  } catch {
    return [];
  }
};

const SECTIONS = {
  products: {
    count: () => countOf('SELECT COUNT(*) AS c FROM products'),
    // order_items keep their snapshot (product_id is SET NULL), so order history survives.
    clear: () => query('DELETE FROM products'),
  },
  categories: {
    count: () => countOf('SELECT COUNT(*) AS c FROM categories'),
    clear: () => query('DELETE FROM categories'),
  },
  orders: {
    count: () => countOf('SELECT COUNT(*) AS c FROM orders'),
    clear: () => query('DELETE FROM orders'),
  },
  // Customers are derived from orders by phone, so clearing them clears their
  // orders and the cached courier history for those numbers.
  customers: {
    count: () => countOf('SELECT COUNT(DISTINCT customer_phone) AS c FROM orders'),
    clear: () =>
      transaction(async (conn) => {
        await conn.query('DELETE FROM orders');
        await conn.query('DELETE FROM courier_fraud_cache');
      }),
  },
  coupons: {
    count: () => countOf('SELECT COUNT(*) AS c FROM coupons'),
    clear: () => query('DELETE FROM coupons'),
  },
  team: {
    count: () => countOf('SELECT COUNT(*) AS c FROM team_members'),
    clear: () => query('DELETE FROM team_members'),
  },
  notifications: {
    count: () => countOf('SELECT COUNT(*) AS c FROM notifications'),
    clear: () => query('DELETE FROM notifications'),
  },
  delivery_zones: {
    count: () => countOf('SELECT COUNT(*) AS c FROM delivery_zones'),
    clear: () => query('DELETE FROM delivery_zones'),
  },
  media: {
    count: async () => (await listUploads()).length,
    clear: async () => {
      const names = await listUploads();
      await Promise.all(names.map((n) => fs.unlink(path.join(env.uploadDir, n)).catch(() => {})));
    },
  },
};

router.get(
  '/counts',
  ...admins,
  asyncHandler(async (req, res) => {
    const entries = await Promise.all(Object.entries(SECTIONS).map(async ([key, s]) => [key, await s.count()]));
    ok(res, Object.fromEntries(entries));
  })
);

router.post(
  '/clear/:section',
  ...admins,
  validate(z.object({ confirm: z.string() })),
  asyncHandler(async (req, res) => {
    const { section } = req.params;
    const target = SECTIONS[section];
    if (!target) throw ApiError.notFound('Unknown section');
    if (req.body.confirm !== section) throw ApiError.badRequest('Confirmation text does not match');
    const removed = await target.count();
    await target.clear();
    ok(res, { section, removed });
  })
);

export default router;
