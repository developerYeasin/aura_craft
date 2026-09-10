/**
 * Marketing tags, driven entirely by admin settings — nothing is hardcoded and
 * nothing loads until an ID is actually configured. Every tag is injected once
 * per page load; `loaded` guards against React re-renders re-adding scripts.
 */

const loaded = new Set();

const addScript = (src, attrs = {}) => {
  const el = document.createElement('script');
  el.async = true;
  el.src = src;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.head.appendChild(el);
  return el;
};

const initGtm = (id) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  addScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`);

  // The <noscript> iframe is what still records a visit when JS is blocked.
  const ns = document.createElement('noscript');
  const frame = document.createElement('iframe');
  frame.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`;
  frame.height = '0';
  frame.width = '0';
  frame.style.cssText = 'display:none;visibility:hidden';
  ns.appendChild(frame);
  document.body.prepend(ns);
};

const initGa4 = (id) => {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  window.gtag('js', new Date());
  window.gtag('config', id);
};

const initMetaPixel = (id) => {
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', id);
  window.fbq('track', 'PageView');
};

const initTiktok = (id) => {
  /* eslint-disable */
  !(function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    const ttq = (w[t] = w[t] || []);
    ttq.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];
    ttq.setAndDefer = function (obj, method) {
      obj[method] = function () { obj.push([method].concat(Array.prototype.slice.call(arguments, 0))); };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (id) {
      const inst = ttq._i[id] || [];
      for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(inst, ttq.methods[i]);
      return inst;
    };
    ttq.load = function (id, opts) {
      const url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {}; ttq._i[id] = []; ttq._i[id]._u = url;
      ttq._t = ttq._t || {}; ttq._t[id] = +new Date();
      ttq._o = ttq._o || {}; ttq._o[id] = opts || {};
      const script = d.createElement('script');
      script.type = 'text/javascript'; script.async = true; script.src = `${url}?sdkid=${id}&lib=${t}`;
      const first = d.getElementsByTagName('script')[0];
      first.parentNode.insertBefore(script, first);
    };
    ttq.load(id);
    ttq.page();
  })(window, document, 'ttq');
  /* eslint-enable */
};

const initClarity = (id) => {
  /* eslint-disable */
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', id);
  /* eslint-enable */
};

/** Called once the store settings arrive. Safe to call repeatedly. */
export const initTracking = (settings = {}) => {
  if (typeof window === 'undefined') return;

  // GTM and Analytics always load when configured. The Pixels only load
  // directly when auto-tracking is on — otherwise GTM is expected to fire them,
  // and loading both would double-count every purchase.
  const autoTracking = settings.auto_tracking === '1';
  const tags = [
    ['gtm', settings.gtm_id, initGtm],
    ['ga4', settings.ga4_id, initGa4],
    ['clarity', settings.clarity_id, initClarity],
    ...(autoTracking
      ? [
          ['meta', settings.meta_pixel_id, initMetaPixel],
          ['tiktok', settings.tiktok_pixel_id, initTiktok],
        ]
      : []),
  ];

  tags.forEach(([key, id, init]) => {
    const value = (id || '').trim();
    if (!value || loaded.has(key)) return;
    try {
      init(value);
      loaded.add(key);
    } catch (error) {
      // A blocked or broken tag must never take the storefront down with it.
      console.warn(`[tracking] ${key} failed to load`, error);
    }
  });
};

/**
 * One call fans an event out to whichever tags are actually installed, using
 * each platform's own event name.
 */
export const trackEvent = (name, payload = {}) => {
  if (typeof window === 'undefined') return;
  const { value, currency = 'BDT', items = [], id, name: itemName, quantity } = payload;

  const META = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase', search: 'Search' };
  const TIKTOK = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'CompletePayment', search: 'Search' };

  try {
    window.dataLayer?.push({ event: name, ecommerce: { currency, value, items } });
    window.gtag?.('event', name, { currency, value, items });

    if (window.fbq && META[name]) {
      window.fbq('track', META[name], {
        value,
        currency,
        content_ids: items.length ? items.map((i) => i.item_id) : id ? [id] : undefined,
        content_name: itemName,
        content_type: 'product',
        num_items: quantity,
      });
    }

    if (window.ttq && TIKTOK[name]) {
      window.ttq.track(TIKTOK[name], { value, currency, content_id: id, content_name: itemName, quantity });
    }
  } catch (error) {
    console.warn('[tracking] event failed', name, error);
  }
};

/** Shapes a product row into the item format every platform above accepts. */
export const toItem = (product, quantity = 1) => ({
  item_id: String(product?.id ?? ''),
  item_name: product?.name ?? '',
  item_category: product?.category_name || product?.category_name_bn || '',
  price: Number(product?.price ?? 0),
  quantity,
});
