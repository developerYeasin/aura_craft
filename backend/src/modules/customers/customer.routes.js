import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, paginated } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { normalisePhone } from '../orders/order.guard.js';

/**
 * There is no customers table — the storefront checkout has no accounts. A
 * "customer" is every order that shares a phone number, so this module reads
 * them straight out of `orders`.
 */

const router = Router();
const staff = [authenticate, authorize('immortal', 'admin', 'manager')];

const SORTS = {
  spent: 'spent DESC',
  orders: 'orders_count DESC',
  recent: 'last_order DESC',
  name: 'customer_name ASC',
};

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sort: z.enum(['spent', 'orders', 'recent', 'name']).default('spent'),
});

router.get(
  '/',
  ...staff,
  validate(listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, search, sort } = req.validatedQuery;
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (search) {
      where.push('(customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `SELECT
         customer_phone,
         MAX(customer_name) AS customer_name,
         MAX(customer_email) AS customer_email,
         MAX(city) AS city,
         COUNT(*) AS orders_count,
         COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total END), 0) AS spent,
         COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count,
         COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered_count,
         MIN(created_at) AS first_order,
         MAX(created_at) AS last_order,
         (SELECT f.success_ratio FROM courier_fraud_cache f WHERE f.phone = orders.customer_phone) AS success_ratio,
         (SELECT f.total_parcel FROM courier_fraud_cache f WHERE f.phone = orders.customer_phone) AS total_parcel
       FROM orders
       ${clause}
       GROUP BY customer_phone
       ORDER BY ${SORTS[sort]}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const { total } = await queryOne(
      `SELECT COUNT(DISTINCT customer_phone) AS total FROM orders ${clause}`,
      params
    );

    paginated(res, rows, { page, limit, total });
  })
);

/** One customer: their profile totals plus every order they have placed. */
router.get(
  '/:phone',
  ...staff,
  asyncHandler(async (req, res) => {
    const phone = normalisePhone(req.params.phone);
    const profile = await queryOne(
      `SELECT customer_phone, MAX(customer_name) AS customer_name, MAX(customer_email) AS customer_email,
              MAX(address) AS address, MAX(city) AS city,
              COUNT(*) AS orders_count,
              COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total END), 0) AS spent,
              COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count,
              MIN(created_at) AS first_order, MAX(created_at) AS last_order
       FROM orders WHERE customer_phone = ? GROUP BY customer_phone`,
      [phone]
    );
    if (!profile) throw ApiError.notFound('Customer not found');

    const orders = await query(
      `SELECT id, order_code, total, status, created_at, risk_flags,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = orders.id) AS item_count
       FROM orders WHERE customer_phone = ? ORDER BY created_at DESC`,
      [phone]
    );

    ok(res, { ...profile, orders });
  })
);

export default router;
