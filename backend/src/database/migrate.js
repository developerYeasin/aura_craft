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
  console.log(`✔ Migration complete on database "${env.db.name}"`);
  await conn.end();
};

run().catch((error) => {
  console.error('✖ Migration failed:', error.message);
  process.exit(1);
});
