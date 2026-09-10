import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';

/**
 * Courier adapters. Each one exposes the same three calls so the rest of the
 * app never learns which company is configured:
 *
 *   verify()          — credentials work? (used by the "টেস্ট" button)
 *   createParcel(o)   — book a consignment, return { consignment_id, tracking_url, status }
 *   fetchStatus(id)   — current delivery status for a consignment
 *
 * Credentials come from settings, never from env, so the shop owner can rotate
 * them without a redeploy.
 */

const TIMEOUT_MS = 15_000;

/** fetch with a timeout — a hung courier API must not hold an admin request open. */
const request = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    if (error.name === 'AbortError') throw ApiError.badRequest('কুরিয়ার সার্ভার সাড়া দিচ্ছে না (টাইমআউট)।');
    throw ApiError.badRequest(`কুরিয়ার সার্ভারে পৌঁছানো যায়নি: ${error.message}`);
  } finally {
    clearTimeout(timer);
  }
};

const need = (value, label) => {
  if (!value) throw ApiError.badRequest(`${label} সেটিংসে বসানো হয়নি।`);
  return value;
};

/* ------------------------------------------------------------------ Steadfast */
const steadfast = {
  label: 'Steadfast',
  base: 'https://portal.packzy.com/api/v1',

  headers(s) {
    return {
      'Api-Key': need(s.steadfast_api_key, 'Steadfast API Key'),
      'Secret-Key': need(s.steadfast_api_secret, 'Steadfast Secret Key'),
      'Content-Type': 'application/json',
    };
  },

  async verify(s) {
    const { ok, body } = await request(`${this.base}/get_balance`, { headers: this.headers(s) });
    if (!ok) throw ApiError.badRequest(body?.message || 'Steadfast কী যাচাই করা যায়নি।');
    return { balance: body?.current_balance ?? null };
  },

  async createParcel(s, order) {
    const { ok, body } = await request(`${this.base}/create_order`, {
      method: 'POST',
      headers: this.headers(s),
      body: JSON.stringify({
        invoice: order.order_code,
        recipient_name: order.customer_name,
        recipient_phone: order.customer_phone,
        recipient_address: [order.address, order.city].filter(Boolean).join(', '),
        cod_amount: order.payment_method === 'cod' ? Number(order.total) : 0,
        note: order.note || '',
      }),
    });
    const consignment = body?.consignment;
    if (!ok || !consignment) {
      throw ApiError.badRequest(body?.message || 'Steadfast-এ কনসাইনমেন্ট তৈরি করা যায়নি।');
    }
    return {
      consignment_id: String(consignment.consignment_id),
      tracking_code: consignment.tracking_code || null,
      tracking_url: consignment.tracking_code ? `https://steadfast.com.bd/t/${consignment.tracking_code}` : null,
      status: consignment.status || 'in_review',
    };
  },

  async fetchStatus(s, consignmentId) {
    const { ok, body } = await request(`${this.base}/status_by_cid/${encodeURIComponent(consignmentId)}`, {
      headers: this.headers(s),
    });
    if (!ok) throw ApiError.badRequest(body?.message || 'স্ট্যাটাস আনা যায়নি।');
    return { status: body?.delivery_status || 'unknown' };
  },
};

/* --------------------------------------------------------------------- Pathao */
const pathao = {
  label: 'Pathao',
  base: 'https://api-hermes.pathao.com',

  /** Pathao is OAuth: every call needs a fresh-enough access token. */
  async token(s) {
    const { ok, body } = await request(`${this.base}/aladdin/api/v1/issue-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: need(s.pathao_client_id, 'Pathao Client ID'),
        client_secret: need(s.pathao_client_secret, 'Pathao Client Secret'),
        username: need(s.pathao_username, 'Pathao Username'),
        password: need(s.pathao_password, 'Pathao Password'),
        grant_type: 'password',
      }),
    });
    if (!ok || !body?.access_token) throw ApiError.badRequest(body?.message || 'Pathao টোকেন পাওয়া যায়নি।');
    return body.access_token;
  },

  async verify(s) {
    await this.token(s);
    return { ok: true };
  },

  async createParcel(s, order) {
    const token = await this.token(s);
    const inside = order.delivery_area !== 'outside_dhaka';
    const { ok, body } = await request(`${this.base}/aladdin/api/v1/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id: Number(need(s.pathao_store_id, 'Pathao Store ID')),
        merchant_order_id: order.order_code,
        recipient_name: order.customer_name,
        recipient_phone: order.customer_phone,
        recipient_address: [order.address, order.city].filter(Boolean).join(', '),
        recipient_city: Number(inside ? s.pathao_city_id || 1 : s.pathao_city_id_outside || 0) || undefined,
        recipient_zone: Number(inside ? s.pathao_zone_id || 0 : s.pathao_zone_id_outside || 0) || undefined,
        delivery_type: 48,
        item_type: 2,
        item_quantity: Number(order.item_count || 1),
        item_weight: Number(s.pathao_default_weight || 0.5),
        amount_to_collect: order.payment_method === 'cod' ? Number(order.total) : 0,
        item_description: order.first_product || 'Jewellery',
      }),
    });
    const data = body?.data;
    if (!ok || !data?.consignment_id) throw ApiError.badRequest(body?.message || 'Pathao-তে অর্ডার পাঠানো যায়নি।');
    return {
      consignment_id: String(data.consignment_id),
      tracking_code: data.consignment_id,
      tracking_url: `https://merchant.pathao.com/tracking?consignment_id=${data.consignment_id}`,
      status: data.order_status || 'Pending',
    };
  },

  async fetchStatus(s, consignmentId) {
    const token = await this.token(s);
    const { ok, body } = await request(`${this.base}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!ok) throw ApiError.badRequest(body?.message || 'স্ট্যাটাস আনা যায়নি।');
    return { status: body?.data?.order_status || 'unknown' };
  },
};

/* ----------------------------------------------------------------------- RedX */
const redx = {
  label: 'RedX',
  base: 'https://openapi.redx.com.bd/v1.0.0-beta',

  headers(s) {
    return {
      'API-ACCESS-TOKEN': `Bearer ${need(s.redx_api_token, 'RedX API Token')}`,
      'Content-Type': 'application/json',
    };
  },

  async verify(s) {
    const { ok, body } = await request(`${this.base}/areas`, { headers: this.headers(s) });
    if (!ok) throw ApiError.badRequest(body?.message || 'RedX টোকেন যাচাই করা যায়নি।');
    return { areas: Array.isArray(body?.areas) ? body.areas.length : null };
  },

  async createParcel(s, order) {
    const { ok, body } = await request(`${this.base}/parcel`, {
      method: 'POST',
      headers: this.headers(s),
      body: JSON.stringify({
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        delivery_area: order.city || (order.delivery_area === 'outside_dhaka' ? 'Outside Dhaka' : 'Dhaka'),
        delivery_area_id: Number(s.redx_area_id || 0) || undefined,
        customer_address: order.address,
        merchant_invoice_id: order.order_code,
        cash_collection_amount: order.payment_method === 'cod' ? String(order.total) : '0',
        parcel_weight: Number(s.redx_default_weight || 500),
        value: Number(order.total),
        parcel_details_json: [{ name: order.first_product || 'Jewellery', category: 'Jewellery', value: Number(order.total) }],
      }),
    });
    const id = body?.tracking_id;
    if (!ok || !id) throw ApiError.badRequest(body?.message || 'RedX-এ পার্সেল তৈরি করা যায়নি।');
    return {
      consignment_id: String(id),
      tracking_code: String(id),
      tracking_url: `https://redx.com.bd/track-parcel/?trackingId=${id}`,
      status: 'pickup-pending',
    };
  },

  async fetchStatus(s, consignmentId) {
    const { ok, body } = await request(`${this.base}/parcel/track/${encodeURIComponent(consignmentId)}`, {
      headers: this.headers(s),
    });
    if (!ok) throw ApiError.badRequest(body?.message || 'স্ট্যাটাস আনা যায়নি।');
    const last = Array.isArray(body?.tracking) ? body.tracking[body.tracking.length - 1] : null;
    return { status: last?.message_en || last?.status || 'unknown' };
  },
};

export const PROVIDERS = { steadfast, pathao, redx };

export const getProvider = (settings) => {
  const key = (settings.courier_provider || '').trim();
  if (!key || key === 'none') throw ApiError.badRequest('কোনো কুরিয়ার সেট করা নেই — সেটিংসে গিয়ে বেছে নিন।');
  const provider = PROVIDERS[key];
  if (!provider) throw ApiError.badRequest(`অচেনা কুরিয়ার: ${key}`);
  return provider;
};

/**
 * BDCourier aggregates delivery success/return history across couriers for a
 * phone number — the standard COD fraud check in Bangladesh. Optional: without
 * a key configured the caller simply gets nothing back.
 */
export const courierFraudCheck = async (settings, phone) => {
  // The platform key from env is the default; a shop may override with its own.
  const key = settings.bdcourier_api_key || env.fraudApi.key;
  // The three outcomes are kept apart so callers can word the message properly:
  // not configured / lookup failed / no history for this number.
  if (!key) return { configured: false };
  const { ok, body } = await request(env.fraudApi.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!ok) return { configured: true, failed: true, message: body?.message || null };
  const summary = body?.courierData?.summary;
  if (!summary) return { configured: true, empty: true };
  return {
    configured: true,
    total_parcel: Number(summary.total_parcel || 0),
    success_parcel: Number(summary.success_parcel || 0),
    cancelled_parcel: Number(summary.cancelled_parcel || 0),
    success_ratio: Number(summary.success_ratio || 0),
  };
};
