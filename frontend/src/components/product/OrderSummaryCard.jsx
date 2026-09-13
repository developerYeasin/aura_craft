import { useI18n } from '../../i18n/index.jsx';
import { money, formatDateTime, toBn, ORDER_STATUS, PLACEHOLDER_IMAGE } from '../../utils/format.js';

const OrderSummaryCard = ({ order }) => {
  const { t, lang } = useI18n();
  const status = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
  const areaLabel = order.delivery_zone || t(order.delivery_area === 'outside_dhaka' ? 'checkout.outsideDhaka' : 'checkout.insideDhaka');
  const freeDelivery = Number(order.delivery_charge) === 0;

  return (
    <div className="card card--pad">
      <div className="spread" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: 18 }}>{order.order_code}</h3>
          <span className="mute-2">{formatDateTime(order.created_at)}</span>
        </div>
        <span className={`badge ${status.badge}`}>{lang === 'bn' ? status.bn : status.label}</span>
      </div>

      {order.items?.map((item) => (
        <div className="cart-line" key={item.id}>
          <img src={item.product_image || PLACEHOLDER_IMAGE} alt={item.product_name} />
          <div>
            <div className="cart-line__name">{item.product_name}</div>
            <span className="mute-2">
              {toBn(item.quantity)} × {item.original_price ? <s style={{ marginRight: 4 }}>{money(item.original_price)}</s> : null}
              {money(item.unit_price)}
              {item.variant ? ` · ${item.variant}` : ''}
            </span>
          </div>
          <b style={{ fontFamily: 'var(--font-ui)' }}>{money(item.line_total)}</b>
        </div>
      ))}

      <div className="summary__row" style={{ marginTop: 12 }}>
        <span>{t('common.subtotal')}</span>
        <span>{money(order.subtotal)}</span>
      </div>
      {Number(order.discount) > 0 && (
        <div className="summary__row summary__row--save">
          <span>{t('order.discount')}{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
          <span>− {money(order.discount)}</span>
        </div>
      )}
      <div className={`summary__row${freeDelivery ? ' summary__row--free' : ''}`}>
        <span>{t('common.deliveryCharge')}</span>
        <span>{freeDelivery ? t('common.freeDelivery') : money(order.delivery_charge)}</span>
      </div>
      <div className="summary__row summary__row--total">
        <span>{t('common.total')}</span>
        <span>{money(order.total)}</span>
      </div>

      <ul className="spec-list" style={{ marginTop: 18 }}>
        <li><b>{t('order.name')}</b> {order.customer_name}</li>
        <li><b>{t('order.mobile')}</b> {order.customer_phone}</li>
        {order.customer_email && <li><b>{t('order.email')}</b> {order.customer_email}</li>}
        <li><b>{t('order.address')}</b> {order.address}{order.city ? `, ${order.city}` : ''}</li>
        <li><b>{t('order.area')}</b> {areaLabel}</li>
        <li><b>{t('order.payment')}</b> {t(`checkout.${order.payment_method}`)}</li>
        {order.payment_sender && <li><b>{t('order.sender')}</b> {order.payment_sender}</li>}
        {order.payment_trx_id && <li><b>{t('order.trxId')}</b> <span className="num">{order.payment_trx_id}</span></li>}
        {order.note && <li><b>{t('order.note')}</b> {order.note}</li>}
      </ul>
    </div>
  );
};

export default OrderSummaryCard;
