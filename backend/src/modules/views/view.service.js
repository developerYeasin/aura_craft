import crypto from 'node:crypto';
import { query, queryOne } from '../../config/db.js';

/**
 * Trackable entities. Adding a new kind (category, blog post, …) is one entry
 * here: the counter column lives on the entity's own table, and every counted
 * view is also logged to view_events for dedupe and time-series analytics.
 */
export const ENTITIES = {
  product: { table: 'products', counter: 'view_count', active: 'is_active = 1' },
  team: { table: 'team_members', counter: 'profile_view_count', active: 'is_active = 1' },
};

/** A repeat open by the same visitor inside this window is not counted again. */
export const DEDUPE_MINUTES = 30;

/**
 * Stable, non-reversible visitor key. The browser sends a random id it keeps in
 * localStorage; IP + user agent is the fallback (and is mixed in so a forged id
 * alone cannot inflate counts from one machine as freely).
 */
export const visitorKey = ({ visitorId, ip, userAgent }) =>
  crypto
    .createHash('sha256')
    .update(`${visitorId || ''}|${ip || ''}|${(userAgent || '').slice(0, 200)}`)
    .digest('hex');

/**
 * Count one view. Returns { counted, views } — counted is false when the visitor
 * already viewed this entity within the dedupe window.
 */
export const record = async (type, id, visitor) => {
  const entity = ENTITIES[type];
  const entityId = Number(id);
  if (!entity || !Number.isInteger(entityId) || entityId <= 0) return null;

  const exists = await queryOne(
    `SELECT id, ${entity.counter} AS views FROM ${entity.table} WHERE id = ? AND ${entity.active}`,
    [entityId]
  );
  if (!exists) return null;

  const key = visitorKey(visitor);
  const recent = await queryOne(
    `SELECT id FROM view_events
     WHERE visitor_key = ? AND entity_type = ? AND entity_id = ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL ${DEDUPE_MINUTES} MINUTE)
     LIMIT 1`,
    [key, type, entityId]
  );
  if (recent) return { counted: false, views: Number(exists.views) };

  await query('INSERT INTO view_events (entity_type, entity_id, visitor_key) VALUES (?, ?, ?)', [type, entityId, key]);
  await query(`UPDATE ${entity.table} SET ${entity.counter} = ${entity.counter} + 1 WHERE id = ?`, [entityId]);
  return { counted: true, views: Number(exists.views) + 1 };
};

const ALLOWED_RANGES = [7, 14, 30, 90];

/** Everything the dashboard analytics block needs, in one call. */
export const summary = async ({ days: rawDays, limit = 5 } = {}) => {
  const days = ALLOWED_RANGES.includes(Number(rawDays)) ? Number(rawDays) : 14;

  const [totals, topProducts, topTeam, daily] = await Promise.all([
    queryOne(`
      SELECT
        (SELECT COALESCE(SUM(view_count), 0) FROM products) AS product_views,
        (SELECT COALESCE(SUM(profile_view_count), 0) FROM team_members) AS team_views,
        (SELECT COUNT(DISTINCT visitor_key) FROM view_events
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${days - 1} DAY)) AS unique_visitors
    `),
    query(
      `SELECT p.id, p.name, p.slug, p.is_active, p.stock, p.view_count,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id
                ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image
       FROM products p
       WHERE p.view_count > 0
       ORDER BY p.view_count DESC, p.id ASC
       LIMIT ${Number(limit)}`
    ),
    query(
      `SELECT id, name, role, tag, photo_url, is_active, profile_view_count
       FROM team_members
       WHERE profile_view_count > 0
       ORDER BY profile_view_count DESC, id ASC
       LIMIT ${Number(limit)}`
    ),
    query(
      `SELECT DATE(created_at) AS day,
              SUM(entity_type = 'product') AS product_views,
              SUM(entity_type = 'team') AS team_views
       FROM view_events
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [days - 1]
    ),
  ]);

  return {
    range: days,
    totals: {
      product_views: Number(totals?.product_views || 0),
      team_views: Number(totals?.team_views || 0),
      unique_visitors: Number(totals?.unique_visitors || 0),
    },
    topProducts,
    topTeam,
    daily: daily.map((d) => ({
      day: d.day,
      product_views: Number(d.product_views || 0),
      team_views: Number(d.team_views || 0),
    })),
  };
};
