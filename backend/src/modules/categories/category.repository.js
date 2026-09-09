import { query, queryOne } from '../../config/db.js';

const BASE_SELECT = `
  SELECT c.*, (
    SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1
  ) AS product_count
  FROM categories c`;

export const findAll = ({ activeOnly = true, navOnly = false } = {}) => {
  const where = [];
  if (activeOnly) where.push('c.is_active = 1');
  if (navOnly) where.push('c.show_in_nav = 1');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return query(`${BASE_SELECT} ${clause} ORDER BY c.sort_order ASC, c.id ASC`);
};

export const findByIdOrSlug = (key) =>
  queryOne(`${BASE_SELECT} WHERE c.id = ? OR c.slug = ? LIMIT 1`, [Number(key) || 0, String(key)]);

export const insert = async (data) => {
  const rows = await query('INSERT INTO categories SET ?', [data]);
  return rows.insertId;
};

export const update = (id, data) => query('UPDATE categories SET ? WHERE id = ?', [data, id]);

export const remove = (id) => query('DELETE FROM categories WHERE id = ?', [id]);
