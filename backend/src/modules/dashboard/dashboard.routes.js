import { Router } from 'express';
import { query, queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { authenticate, authorize } from '../../middlewares/auth.js';

const router = Router();

/** Cancelled orders are excluded from every money figure on the dashboard. */
const EARNED = "status <> 'cancelled'";

/** The trend chart offers three windows; anything else falls back to a fortnight. */
const ALLOWED_RANGES = [7, 14, 30, 90];
const resolveRange = (raw) => {
  const days = Number.parseInt(raw, 10);
  return ALLOWED_RANGES.includes(days) ? days : 14;
};

/**
 * Revenue/orders for the last `days`, alongside the same span immediately before
 * it, so the UI can show a real change instead of a decorative arrow.
 */
const periodPair = async (days) =>
  queryOne(
    `SELECT
       COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN total END), 0) AS revenue,
       COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) AS orders,
       COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                          AND created_at <  DATE_SUB(NOW(), INTERVAL ? DAY) THEN total END), 0) AS prev_revenue,
       COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                   AND created_at <  DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) AS prev_orders
     FROM orders
     WHERE ${EARNED}`,
    [days, days, days * 2, days, days * 2, days]
  );

router.get(
  '/stats',
  authenticate,
  authorize('immortal', 'admin', 'manager'),
  asyncHandler(async (req, res) => {
    const days = resolveRange(req.query.days);

    const totals = await queryOne(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE is_active = 1) AS total_products,
        (SELECT COUNT(*) FROM categories WHERE is_active = 1) AS total_categories,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COUNT(DISTINCT customer_phone) FROM orders) AS total_customers,
        (SELECT COUNT(*) FROM team_members WHERE is_active = 1) AS total_team,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE ${EARNED}) AS total_revenue,
        (SELECT COALESCE(AVG(total), 0) FROM orders WHERE ${EARNED}) AS avg_order_value,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status IN ('pending','processing')) AS open_value,
        (SELECT COUNT(*) FROM products WHERE stock <= 5 AND is_active = 1) AS low_stock,
        (SELECT COUNT(*) FROM products WHERE stock <= 0 AND is_active = 1) AS out_of_stock,
        (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()) AS today_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE DATE(created_at) = CURDATE() AND ${EARNED}) AS today_revenue
    `);

    const [period, ordersByStatus, salesTrend, topProducts, categoryBreakdown, recentOrders] = await Promise.all([
      periodPair(days),

      // Every status is listed even at zero, so the pipeline never loses a stage.
      query(`
        SELECT s.status,
               COALESCE(o.count, 0) AS count,
               COALESCE(o.value, 0) AS value
        FROM (
          SELECT 'pending' AS status UNION ALL SELECT 'processing' UNION ALL
          SELECT 'shipped' UNION ALL SELECT 'delivered' UNION ALL SELECT 'cancelled'
        ) s
        LEFT JOIN (
          SELECT status, COUNT(*) AS count, SUM(total) AS value FROM orders GROUP BY status
        ) o ON o.status = s.status
        ORDER BY FIELD(s.status, 'pending','processing','shipped','delivered','cancelled')
      `),

      query(
        `SELECT DATE(created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
         FROM orders
         WHERE ${EARNED} AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        [days - 1]
      ),

      query(`
        SELECT oi.product_name, oi.product_image, SUM(oi.quantity) AS sold, SUM(oi.line_total) AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id AND o.${EARNED}
        GROUP BY oi.product_name, oi.product_image
        ORDER BY sold DESC
        LIMIT 5
      `),

      // Product counts and money earned per category, in one row each.
      query(`
        SELECT c.name, c.name_bn,
               COUNT(DISTINCT p.id) AS product_count,
               COALESCE(SUM(oi.line_total), 0) AS revenue
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.${EARNED}
        GROUP BY c.id, c.name, c.name_bn
        ORDER BY revenue DESC, product_count DESC
      `),

      query(`
        SELECT id, order_code, customer_name, customer_phone, total, status, created_at,
               (SELECT oi.product_name FROM order_items oi WHERE oi.order_id = orders.id LIMIT 1) AS first_product,
               (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = orders.id) AS item_count
        FROM orders ORDER BY created_at DESC LIMIT 8
      `),
    ]);

    const [lowStockList, topCustomers, paymentSplit, deliverySplit] = await Promise.all([
      query(`
        SELECT p.id, p.name, p.stock, p.price, c.name_bn AS category_bn, c.name AS category
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.is_active = 1 AND p.stock <= 5
        ORDER BY p.stock ASC, p.name ASC
        LIMIT 6
      `),

      // Customers are identified by phone — the storefront checkout has no accounts.
      query(`
        SELECT customer_phone, MAX(customer_name) AS customer_name,
               COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spent, MAX(created_at) AS last_order
        FROM orders
        WHERE ${EARNED}
        GROUP BY customer_phone
        ORDER BY spent DESC
        LIMIT 5
      `),

      query(`SELECT payment_method AS method, COUNT(*) AS count, COALESCE(SUM(total), 0) AS value
             FROM orders WHERE ${EARNED} GROUP BY payment_method`),

      query(`SELECT delivery_area AS area, COUNT(*) AS count, COALESCE(SUM(total), 0) AS value
             FROM orders WHERE ${EARNED} GROUP BY delivery_area`),
    ]);

    ok(res, {
      range: days,
      totals,
      period,
      ordersByStatus,
      salesTrend,
      topProducts,
      categoryBreakdown,
      recentOrders,
      lowStockList,
      topCustomers,
      paymentSplit,
      deliverySplit,
      generated_at: new Date().toISOString(),
    });
  })
);

export default router;
