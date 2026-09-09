import { Router } from 'express';
import { isDbHealthy } from './config/db.js';
import authRoutes from './modules/auth/auth.routes.js';
import categoryRoutes from './modules/categories/category.routes.js';
import productRoutes from './modules/products/product.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import teamRoutes from './modules/team/team.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import settingRoutes from './modules/settings/setting.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';

const router = Router();

// Reports the database too — a process that is up but cannot reach MySQL is not healthy,
// and reporting 200 there hides exactly the failure that takes every page down.
router.get('/health', async (req, res) => {
  const db = await isDbHealthy();
  res.status(db ? 200 : 503).json({
    success: db,
    data: { status: db ? 'ok' : 'degraded', database: db ? 'up' : 'down', uptime: process.uptime() },
  });
});

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/team', teamRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingRoutes);
router.use('/uploads', uploadRoutes);
router.use('/notifications', notificationRoutes);

export default router;
