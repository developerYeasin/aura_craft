import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fresh = process.argv.includes('--fresh');

const DROP_ORDER = ['notifications', 'push_subscriptions', 'order_items', 'orders', 'product_images', 'products', 'categories', 'team_members', 'settings', 'users'];

const run = async () => {
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.changeUser({ database: env.db.name });

  if (fresh) {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of DROP_ORDER) await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('• Dropped existing tables');
  }

  const sql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await conn.query(sql);

  // schema.sql only creates missing tables, so columns added after a database
  // was first built have to be patched in. MySQL has no ADD COLUMN IF NOT
  // EXISTS, hence the information_schema lookup.
  const ADDED_COLUMNS = [
    ['orders', 'ip_address', 'VARCHAR(64) NULL AFTER status'],
    ['orders', 'risk_flags', 'VARCHAR(255) NULL AFTER ip_address'],
    ['orders', 'courier_provider', 'VARCHAR(32) NULL AFTER risk_flags'],
    ['orders', 'courier_consignment_id', 'VARCHAR(64) NULL AFTER courier_provider'],
    ['orders', 'courier_tracking_url', 'VARCHAR(300) NULL AFTER courier_consignment_id'],
    ['orders', 'courier_status', 'VARCHAR(64) NULL AFTER courier_tracking_url'],
    ['orders', 'coupon_code', 'VARCHAR(40) NULL AFTER courier_status'],
    ['orders', 'discount', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER subtotal'],
  ];
  for (const [table, column, definition] of ADDED_COLUMNS) {
    const [[{ found }]] = await conn.query(
      `SELECT COUNT(*) AS found FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [env.db.name, table, column]
    );
    if (!found) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`• Added ${table}.${column}`);
    }
  }
  console.log(`✔ Migration complete on database "${env.db.name}"`);
  await conn.end();
};

run().catch((error) => {
  console.error('✖ Migration failed:', error.message);
  process.exit(1);
});
