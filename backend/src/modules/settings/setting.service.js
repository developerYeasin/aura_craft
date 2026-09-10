import { query, queryOne, transaction } from '../../config/db.js';

/**
 * GET /settings is public (the storefront reads it on every load), so anything
 * secret must be stripped from that response. Tracking IDs are deliberately not
 * secret — they ship in the page source anyway.
 */
const SECRET_SUFFIXES = ['_api_key', '_secret', '_password', '_token'];
const isSecret = (key) => SECRET_SUFFIXES.some((suffix) => key.endsWith(suffix));

/** Everything, including secrets — for internal/admin use only. */
export const getAll = async () => {
  const rows = await query('SELECT setting_key, setting_value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
};

/** Safe for the storefront: secret values are replaced with a set/unset marker. */
export const getPublic = async () => {
  const all = await getAll();
  return Object.fromEntries(
    Object.entries(all).map(([key, value]) => [key, isSecret(key) ? (value ? '__set__' : '') : value])
  );
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
