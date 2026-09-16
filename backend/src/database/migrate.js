import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fresh = process.argv.includes('--fresh');

const DROP_ORDER = ['view_events', 'delivery_zones', 'notifications', 'push_subscriptions', 'order_items', 'orders', 'product_images', 'products', 'categories', 'team_members', 'settings', 'users'];

// Not exported: importing this file runs the migration.
const DEFAULT_ZONES = [
  { name: 'Dhanmondi', name_bn: 'ধানমন্ডি', region: 'inside_dhaka', charge: 0, note: 'যেকোনো এলাকা' },
  { name: 'New Market', name_bn: 'নিউ মার্কেট', region: 'inside_dhaka', charge: 0, note: null },
  { name: 'Nilkhet', name_bn: 'নীলক্ষেত', region: 'inside_dhaka', charge: 0, note: null },
  { name: 'Azimpur', name_bn: 'আজিমপুর', region: 'inside_dhaka', charge: 0, note: null },
  { name: 'Hazaribagh', name_bn: 'হাজারীবাগ', region: 'inside_dhaka', charge: 0, note: 'যেকোনো এলাকা' },
  { name: 'Kamrangir Char', name_bn: 'কামরাঙ্গীরচর', region: 'inside_dhaka', charge: 0, note: 'যেকোনো এলাকা' },
  { name: 'Zigatola', name_bn: 'জিগাতলা', region: 'inside_dhaka', charge: 0, note: 'যেকোনো এলাকা' },
  { name: 'Other areas of Dhaka', name_bn: 'ঢাকার অন্যান্য এলাকা', region: 'inside_dhaka', charge: 60, note: null },
  { name: 'Outside Dhaka', name_bn: 'ঢাকার বাইরে', region: 'outside_dhaka', charge: 120, note: null },
];

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
    ['orders', 'delivery_zone', 'VARCHAR(140) NULL AFTER delivery_area'],
    ['orders', 'payment_sender', 'VARCHAR(40) NULL AFTER payment_method'],
    ['orders', 'payment_trx_id', 'VARCHAR(40) NULL AFTER payment_sender'],
    ['order_items', 'original_price', 'DECIMAL(10,2) NULL AFTER unit_price'],
    ['products', 'video_url', 'VARCHAR(500) NULL AFTER description'],
    ['products', 'discount_type', "ENUM('none','percent','fixed') NOT NULL DEFAULT 'none' AFTER compare_price"],
    ['products', 'discount_value', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER discount_type'],
    ['products', 'view_count', 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_active'],
    ['team_members', 'tag', 'VARCHAR(80) NULL AFTER role'],
    ['team_members', 'joined_year', 'SMALLINT UNSIGNED NULL AFTER tag'],
    ['team_members', 'responsibilities', 'TEXT NULL AFTER bio'],
    ['team_members', 'email', 'VARCHAR(160) NULL AFTER photo_url'],
    ['team_members', 'phone', 'VARCHAR(40) NULL AFTER email'],
    ['team_members', 'website_url', 'VARCHAR(300) NULL AFTER phone'],
    ['team_members', 'linkedin_url', 'VARCHAR(300) NULL AFTER website_url'],
    ['team_members', 'profile_view_count', 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_active'],
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

  // delivery_area was an ENUM of two values; zones need room to grow.
  const [[areaCol]] = await conn.query(
    `SELECT DATA_TYPE AS type FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'delivery_area'`,
    [env.db.name]
  );
  if (areaCol?.type === 'enum') {
    await conn.query("ALTER TABLE orders MODIFY delivery_area VARCHAR(40) NOT NULL DEFAULT 'inside_dhaka'");
    console.log('• Widened orders.delivery_area');
  }

  // notifications.type was an ENUM; new event kinds (product, …) need a free string.
  const [[typeCol]] = await conn.query(
    `SELECT DATA_TYPE AS type FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'type'`,
    [env.db.name]
  );
  if (typeCol?.type === 'enum') {
    await conn.query("ALTER TABLE notifications MODIFY type VARCHAR(32) NOT NULL DEFAULT 'system'");
    console.log('• Widened notifications.type');
  }

  const [[{ zones }]] = await conn.query('SELECT COUNT(*) AS zones FROM delivery_zones');
  if (!zones) {
    await conn.query(
      'INSERT INTO delivery_zones (name, name_bn, region, charge, note, sort_order) VALUES ?',
      [DEFAULT_ZONES.map((z, i) => [z.name, z.name_bn, z.region, z.charge, z.note, i + 1])]
    );
    console.log(`• Seeded ${DEFAULT_ZONES.length} delivery zones`);
  }
  console.log(`✔ Migration complete on database "${env.db.name}"`);
  await conn.end();
};

run().catch((error) => {
  console.error('✖ Migration failed:', error.message);
  process.exit(1);
});
