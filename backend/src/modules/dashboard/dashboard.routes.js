import { Router } from 'express';
import { query, queryOne } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { authenticate, authorize } from '../../middlewares/auth.js';

const router = Router();

router.get(
  '/stats',
  authenticate,
  authorize('immortal', 'admin', 'manager'),
  asyncHandler(async (req, res) => {
    const totals = await queryOne(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE is_active = 1) AS total_products,
        (SELECT COUNT(*) FROM categories WHERE is_active = 1) AS total_categories,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COUNT(DISTINCT customer_phone) FROM orders) AS total_customers,
        (SELECT COUNT(*) FROM team_members WHERE is_active = 1) AS total_team,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status <> 'cancelled') AS total_revenue,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders,
        (SELECT COUNT(*) FROM products WHERE stock <= 5 AND is_active = 1) AS low_stock
    `);

    const ordersByStatus = await query('SELECT status, COUNT(*) AS count FROM orders GROUP BY status');

    const salesTrend = await query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `);

    const topProducts = await query(`
      SELECT oi.product_name, SUM(oi.quantity) AS sold, SUM(oi.line_total) AS revenue
      FROM order_items oi
      GROUP BY oi.product_name
      ORDER BY sold DESC
      LIMIT 5
    `);

    const categoryBreakdown = await query(`
      SELECT c.name, c.name_bn, COUNT(p.id) AS product_count
      FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id ORDER BY product_count DESC
    `);

    const recentOrders = await query(`
      SELECT id, order_code, customer_name, total, status, created_at,
             (SELECT oi.product_name FROM order_items oi WHERE oi.order_id = orders.id LIMIT 1) AS first_product
      FROM orders ORDER BY created_at DESC LIMIT 8
    `);

    ok(res, { totals, ordersByStatus, salesTrend, topProducts, categoryBreakdown, recentOrders });
  })
);

export default router;
