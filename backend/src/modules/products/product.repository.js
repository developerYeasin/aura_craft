import { query, queryOne, transaction } from '../../config/db.js';

const PRODUCT_FIELDS = `
  p.id, p.category_id, p.name, p.slug, p.sku, p.short_description, p.description,
  p.price, p.compare_price, p.stock, p.material, p.color, p.size_options, p.warranty,
  p.rating, p.rating_count, p.is_featured, p.is_active, p.created_at,
  c.name AS category_name, c.name_bn AS category_name_bn, c.slug AS category_slug, c.icon AS category_icon,
  (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image`;

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  oldest: 'p.created_at ASC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  name_asc: 'p.name ASC',
  rating: 'p.rating DESC, p.rating_count DESC',
  featured: 'p.is_featured DESC, p.created_at DESC',
};

const buildFilters = (filters) => {
  const where = [];
  const params = [];

  if (filters.activeOnly !== false) where.push('p.is_active = 1');
  if (filters.categoryId) { where.push('p.category_id = ?'); params.push(filters.categoryId); }
  if (filters.categorySlug) { where.push('c.slug = ?'); params.push(filters.categorySlug); }
  if (filters.search) {
    where.push('(p.name LIKE ? OR p.short_description LIKE ? OR p.sku LIKE ? OR c.name LIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like, like, like);
  }
  if (filters.minPrice != null) { where.push('p.price >= ?'); params.push(filters.minPrice); }
  if (filters.maxPrice != null) { where.push('p.price <= ?'); params.push(filters.maxPrice); }
  if (filters.material) { where.push('p.material = ?'); params.push(filters.material); }
  if (filters.color) { where.push('p.color = ?'); params.push(filters.color); }
  if (filters.featured) where.push('p.is_featured = 1');
  if (filters.inStock) where.push('p.stock > 0');

  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
};

export const findMany = async (filters = {}, { page = 1, limit = 12, sort = 'newest' } = {}) => {
  const { clause, params } = buildFilters(filters);
  const offset = (page - 1) * limit;
  const orderBy = SORTS[sort] || SORTS.newest;

  const rows = await query(
    `SELECT ${PRODUCT_FIELDS} FROM products p
     JOIN categories c ON c.id = p.category_id
     ${clause} ORDER BY ${orderBy} LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM products p JOIN categories c ON c.id = p.category_id ${clause}`,
    params
  );
  return { rows, total: Number(total) };
};

export const findFacets = async (filters = {}) => {
  const { clause, params } = buildFilters({ ...filters, minPrice: null, maxPrice: null, material: null, color: null });
  const materials = await query(
    `SELECT p.material AS value, COUNT(*) AS count FROM products p JOIN categories c ON c.id = p.category_id
     ${clause} ${clause ? 'AND' : 'WHERE'} p.material IS NOT NULL GROUP BY p.material ORDER BY count DESC`,
    params
  );
  const colors = await query(
    `SELECT p.color AS value, COUNT(*) AS count FROM products p JOIN categories c ON c.id = p.category_id
     ${clause} ${clause ? 'AND' : 'WHERE'} p.color IS NOT NULL GROUP BY p.color ORDER BY count DESC`,
    params
  );
  const range = await queryOne(
    `SELECT MIN(p.price) AS min_price, MAX(p.price) AS max_price FROM products p
     JOIN categories c ON c.id = p.category_id ${clause}`,
    params
  );
  return { materials, colors, priceRange: range };
};

export const findByKey = async (key, { activeOnly = true } = {}) => {
  const product = await queryOne(
    `SELECT ${PRODUCT_FIELDS} FROM products p JOIN categories c ON c.id = p.category_id
     WHERE (p.id = ? OR p.slug = ?) ${activeOnly ? 'AND p.is_active = 1' : ''} LIMIT 1`,
    [Number(key) || 0, String(key)]
  );
  if (!product) return null;
  product.images = await query(
    'SELECT id, url, alt, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC',
    [product.id]
  );
  return product;
};

export const findRelated = (product, limit = 4) =>
  query(
    `SELECT ${PRODUCT_FIELDS} FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.category_id = ? AND p.id <> ? AND p.is_active = 1
     ORDER BY p.is_featured DESC, RAND() LIMIT ${Number(limit)}`,
    [product.category_id, product.id]
  );

export const findGroupedByCategory = async (perCategory = 6) => {
  const categories = await query(
    `SELECT id, name, name_bn, slug, description, icon, image_url FROM categories
     WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`
  );
  const results = [];
  for (const category of categories) {
    const products = await query(
      `SELECT ${PRODUCT_FIELDS} FROM products p JOIN categories c ON c.id = p.category_id
       WHERE p.category_id = ? AND p.is_active = 1
       ORDER BY p.is_featured DESC, p.created_at DESC LIMIT ${Number(perCategory)}`,
      [category.id]
    );
    const [{ total }] = await query(
      'SELECT COUNT(*) AS total FROM products WHERE category_id = ? AND is_active = 1',
      [category.id]
    );
    results.push({ ...category, total_products: Number(total), products });
  }
  return results;
};

export const insert = (data, images = []) =>
  transaction(async (conn) => {
    const [result] = await conn.query('INSERT INTO products SET ?', [data]);
    const productId = result.insertId;
    if (images.length) {
      await conn.query(
        'INSERT INTO product_images (product_id, url, alt, is_primary, sort_order) VALUES ?',
        [images.map((url, i) => [productId, url, data.name, i === 0 ? 1 : 0, i])]
      );
    }
    return productId;
  });

export const update = (id, data, images) =>
  transaction(async (conn) => {
    if (Object.keys(data).length) await conn.query('UPDATE products SET ? WHERE id = ?', [data, id]);
    if (Array.isArray(images)) {
      await conn.query('DELETE FROM product_images WHERE product_id = ?', [id]);
      if (images.length) {
        await conn.query(
          'INSERT INTO product_images (product_id, url, alt, is_primary, sort_order) VALUES ?',
          [images.map((url, i) => [id, url, data.name || null, i === 0 ? 1 : 0, i])]
        );
      }
    }
  });

export const remove = (id) => query('DELETE FROM products WHERE id = ?', [id]);
