import { query, queryOne, transaction } from '../../config/db.js';

export const getAll = async () => {
  const rows = await query('SELECT setting_key, setting_value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
};

export const getSetting = async (key) => {
  const row = await queryOne('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', [key]);
  return row ? row.setting_value : null;
};

export const saveMany = async (payload) => {
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined);
  if (!entries.length) return getAll();
  await transaction(async (conn) => {
    for (const [key, value] of entries) {
      await conn.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [key, value === null ? null : String(value)]
      );
    }
  });
  return getAll();
};
