import { Router } from 'express';
import { query } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getAll } from '../settings/setting.service.js';

/**
 * Public XML feeds: a sitemap for search engines and product catalogues for the
 * Facebook and TikTok ad platforms. All three are generated on request from the
 * live catalogue, so a price or stock change is reflected the next time the
 * platform crawls — nothing to regenerate by hand.
 */

const router = Router();

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** The storefront origin, taken from settings and falling back to CLIENT_ORIGIN. */
const storeUrl = (settings, req) => {
  const configured = (settings.store_url || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  const origin = req.get('origin') || req.get('referer');
  if (origin) return origin.replace(/\/$/, '');
  return 'https://auracraft.bizscal.com';
};

const sendXml = (res, xml) => {
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=1800');
  res.send(xml);
};

const activeProducts = () =>
  query(
    `SELECT p.id, p.name, p.slug, p.short_description, p.description, p.price, p.compare_price,
            p.stock, p.sku, p.updated_at, c.name AS category_name, c.slug AS category_slug,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) AS image
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = 1
     ORDER BY p.id DESC`
  );

router.get(
  '/sitemap.xml',
  asyncHandler(async (req, res) => {
    const settings = await getAll();
    const base = storeUrl(settings, req);
    const [products, categories] = await Promise.all([
      activeProducts(),
      query('SELECT slug, updated_at FROM categories WHERE is_active = 1'),
    ]);

    const staticPaths = ['', '/products', '/track', '/team', '/upcoming'];
    const urls = [
      ...staticPaths.map((path) => ({ loc: `${base}${path}`, priority: path === '' ? '1.0' : '0.7' })),
      ...categories.map((c) => ({ loc: `${base}/category/${c.slug}`, lastmod: c.updated_at, priority: '0.8' })),
      ...products.map((p) => ({ loc: `${base}/product/${p.slug}`, lastmod: p.updated_at, priority: '0.9' })),
    ];

    sendXml(
      res,
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`
    );
  })
);

/** Shared product-feed body: Facebook and TikTok both read this Google-RSS shape. */
const feedItems = (products, base, brand) =>
  products
    .map((p) => {
      const description = p.short_description || p.description || p.name;
      return `    <item>
      <g:id>${escapeXml(p.sku || p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(String(description).slice(0, 4000))}</g:description>
      <g:link>${escapeXml(`${base}/product/${p.slug}`)}</g:link>
      <g:image_link>${escapeXml(p.image || `${base}/logo.svg`)}</g:image_link>
      <g:availability>${Number(p.stock) > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${Number(p.price).toFixed(2)} BDT</g:price>${
        p.compare_price && Number(p.compare_price) > Number(p.price)
          ? `\n      <g:sale_price>${Number(p.price).toFixed(2)} BDT</g:sale_price>`
          : ''
      }
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:product_type>${escapeXml(p.category_name || 'Jewellery')}</g:product_type>
    </item>`;
    })
    .join('\n');

const productFeed = (title) =>
  asyncHandler(async (req, res) => {
    const settings = await getAll();
    const base = storeUrl(settings, req);
    const brand = settings.site_name || 'AuraCraft';
    const products = await activeProducts();

    sendXml(
      res,
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(`${brand} — ${title}`)}</title>
    <link>${escapeXml(base)}</link>
    <description>${escapeXml(settings.site_tagline || brand)}</description>
${feedItems(products, base, brand)}
  </channel>
</rss>`
    );
  });

router.get('/facebook-feed.xml', productFeed('Facebook catalogue'));
router.get('/tiktok-feed.xml', productFeed('TikTok catalogue'));

router.get(
  '/robots.txt',
  asyncHandler(async (req, res) => {
    const settings = await getAll();
    const base = storeUrl(settings, req);
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(`User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${base.replace(/\/$/, '')}/sitemap.xml\n`);
  })
);

export default router;
