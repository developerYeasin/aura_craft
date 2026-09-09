import { query, queryOne } from '../../config/db.js';

export const findMany = async ({ page, limit, status, search }) => {
  const where = [];
  const params = [];
  if (status) {
    where.push('o.status = ?');
    params.push(status);
  }
  if (search) {
    where.push('(o.order_code LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const rows = await query(
    `SELECT o.*,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
            (SELECT oi.product_name FROM order_items oi WHERE oi.order_id = o.id LIMIT 1) AS first_product
     FROM orders o ${clause}
     ORDER BY o.created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM orders o ${clause}`, params);
  return { rows, total: Number(total) };
};

export const findById = async (id) => {
  const order = await queryOne('SELECT * FROM orders WHERE id = ? OR order_code = ? LIMIT 1', [
    Number(id) || 0,
    String(id),
  ]);
  if (!order) return null;
  order.items = await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  return order;
};

export const updateStatus = (id, status) => query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

export const remove = (id) => query('DELETE FROM orders WHERE id = ?', [id]);
