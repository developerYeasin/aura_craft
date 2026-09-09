import app from './app.js';
import { env } from './config/env.js';
import { assertDbConnection, isDbHealthy, pool } from './config/db.js';
import { startHeartbeat } from './modules/notifications/notification.service.js';

const start = async () => {
  try {
    await assertDbConnection();
    console.log(`✔ MySQL connected — ${env.db.name}@${env.db.host}`);
  } catch (error) {
    console.error('✖ Database connection failed:', error.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`✔ AuraCraft API running at http://localhost:${env.port}/api/v1 (${env.nodeEnv})`);
  });

  // Remote MySQL drops idle connections; a light periodic ping keeps the pool warm
  // so a visitor never pays for a dead socket.
  const sseHeartbeat = startHeartbeat();

  const heartbeat = setInterval(() => {
    isDbHealthy().then((ok) => {
      if (!ok) console.warn('⚠ database heartbeat failed — pool will reconnect on next query');
    });
  }, 60_000);
  heartbeat.unref();

  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down`);
    clearInterval(heartbeat);
    clearInterval(sseHeartbeat);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
};

start();
