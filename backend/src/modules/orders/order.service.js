import { query, transaction } from '../../config/db.js';
import * as repo from './order.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateOrderCode } from '../../utils/orderCode.js';
import { getSetting } from '../settings/setting.service.js';
import { notify } from '../notifications/notification.service.js';
import { toBn, money as bnMoney } from '../../utils/bn.js';
import { screenOrder } from './order.guard.js';
import { evaluateCoupon, markCouponUsed } from '../coupons/coupon.service.js';

const LOW_STOCK_THRESHOLD = 5;

export const list = async (q) => {
  const { rows, total } = await repo.findMany(q);
  return { items: rows, page: q.page, limit: q.limit, total };
};

export const getOne = async (id) => {
  const order = await repo.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  return order;
};

export const place = async (payload, context = {}) => {
  const ids = [...new Set(payload.items.map((i) => i.product_id))];
  const products = await query(
    `SELECT p.id, p.name, p.price, p.stock, p.is_active,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) AS image
     FROM products p WHERE p.id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = payload.items.map((item) => {
    const product = byId.get(item.product_id);
    if (!product || !product.is_active) throw ApiError.badRequest(`Product #${item.product_id} is unavailable`);
    if (product.stock < item.quantity) {
      throw ApiError.badRequest(`${product.name} — only ${product.stock} left in stock`);
    }
    const unitPrice = Number(product.price);
    return {
      product_id: product.id,
      product_name: product.name,
      product_image: product.image,
      unit_price: unitPrice,
      quantity: item.quantity,
      variant: item.variant || null,
      line_total: Number((unitPrice * item.quantity).toFixed(2)),
    };
  });

  const subtotal = Number(lines.reduce((sum, l) => sum + l.line_total, 0).toFixed(2));
  const insideCharge = Number((await getSetting('delivery_charge_inside')) || 60);
  const outsideCharge = Number((await getSetting('delivery_charge_outside')) || 120);
  const deliveryCharge = payload.delivery_area === 'outside_dhaka' ? outsideCharge : insideCharge;

  // The coupon is re-evaluated here even though checkout already previewed it:
  // the browser's number is a suggestion, this one is the price actually charged.
  let discount = 0;
  let couponCode = null;
  if (payload.coupon_code) {
    const applied = await evaluateCoupon({
      code: payload.coupon_code,
      subtotal,
      phone: payload.customer_phone,
    });
    discount = applied.discount;
    couponCode = applied.code;
  }

  const total = Number((subtotal - discount + deliveryCharge).toFixed(2));

  // Screened after pricing (the rules look at the real total) but before any
  // write, so a rejected order never touches stock.
  const screening = await screenOrder({
    phone: payload.customer_phone,
    customerName: payload.customer_name,
    ip: context.ip,
    deviceId: context.deviceId,
    honeypot: context.honeypot,
    total,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
  });

  const orderId = await transaction(async (conn) => {
    const [result] = await conn.query('INSERT INTO orders SET ?', [
      {
        order_code: generateOrderCode(),
        customer_name: payload.customer_name,
        customer_phone: screening.phone || payload.customer_phone,
        customer_email: payload.customer_email || null,
        address: payload.address,
        city: payload.city || null,
        delivery_area: payload.delivery_area,
        note: payload.note || null,
        payment_method: payload.payment_method,
        subtotal,
        discount,
        coupon_code: couponCode,
        delivery_charge: deliveryCharge,
        total,
        ip_address: context.ip || null,
        risk_flags: screening.flags.length ? screening.flags.join(',') : null,
      },
    ]);
    const id = result.insertId;

    await conn.query(
      `INSERT INTO order_items
        (order_id, product_id, product_name, product_image, unit_price, quantity, variant, line_total)
       VALUES ?`,
      [
        lines.map((l) => [
          id, l.product_id, l.product_name, l.product_image, l.unit_price, l.quantity, l.variant, l.line_total,
        ]),
      ]
    );

    for (const line of lines) {
      await conn.query('UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?', [
        line.quantity,
        line.product_id,
      ]);
    }
    return id;
  });

  await markCouponUsed(couponCode);

  const order = await repo.findById(orderId);

  // Fire-and-forget: notify() swallows its own errors so a notification problem
  // can never fail an order that is already committed.
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  notify({
    type: 'order',
    title: `নতুন অর্ডার — ${order.order_code}`,
    body: `${order.customer_name} · ${toBn(itemCount)} টি আইটেম · ${bnMoney(order.total)}`,
    link: '/admin/orders',
    meta: { orderId: order.id, orderCode: order.order_code, total: order.total },
  });

  // Warn once per product that just crossed the low-stock line.
  for (const line of lines) {
    const product = byId.get(line.product_id);
    const remaining = product.stock - line.quantity;
    if (remaining <= LOW_STOCK_THRESHOLD && product.stock > LOW_STOCK_THRESHOLD) {
      notify({
        type: 'low_stock',
        title: 'স্টক কমে আসছে',
        body: `${product.name} — বাকি আছে মাত্র ${toBn(remaining)} টি`,
        link: '/admin/products',
        meta: { productId: product.id, remaining },
      });
    }
  }

  return order;
};

export const changeStatus = async (id, status) => {
  const order = await getOne(id);
  await repo.updateStatus(order.id, status);
  return repo.findById(order.id);
};

export const destroy = async (id) => {
  const order = await getOne(id);
  await repo.remove(order.id);
};
