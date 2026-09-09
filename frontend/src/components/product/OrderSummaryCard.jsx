import { money, formatDateTime, toBn, ORDER_STATUS, PLACEHOLDER_IMAGE } from '../../utils/format.js';

const PAYMENT_LABEL = { cod: 'ক্যাশ অন ডেলিভারি', bkash: 'বিকাশ', nagad: 'নগদ' };
const AREA_LABEL = { inside_dhaka: 'ঢাকার ভেতরে', outside_dhaka: 'ঢাকার বাইরে' };

const OrderSummaryCard = ({ order }) => {
  const status = ORDER_STATUS[order.status] || ORDER_STATUS.pending;

  return (
    <div className="card card--pad">
      <div className="spread" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: 18 }}>{order.order_code}</h3>
          <span className="mute-2">{formatDateTime(order.created_at)}</span>
        </div>
        <span className={`badge ${status.badge}`}>{status.bn}</span>
      </div>

      {order.items?.map((item) => (
        <div className="cart-line" key={item.id}>
          <img src={item.product_image || PLACEHOLDER_IMAGE} alt={item.product_name} />
          <div>
            <div className="cart-line__name">{item.product_name}</div>
            <span className="mute-2">
              {toBn(item.quantity)} × {money(item.unit_price)}
              {item.variant ? ` · ${item.variant}` : ''}
            </span>
          </div>
          <b style={{ fontFamily: 'var(--font-ui)' }}>{money(item.line_total)}</b>
        </div>
      ))}

      <div className="summary__row" style={{ marginTop: 12 }}>
        <span>সাবটোটাল</span>
        <span>{money(order.subtotal)}</span>
      </div>
      <div className="summary__row">
        <span>ডেলিভারি চার্জ</span>
        <span>{money(order.delivery_charge)}</span>
      </div>
      <div className="summary__row summary__row--total">
        <span>সর্বমোট</span>
        <span>{money(order.total)}</span>
      </div>

      <ul className="spec-list" style={{ marginTop: 18 }}>
        <li><b>নাম:</b> {order.customer_name}</li>
        <li><b>মোবাইল:</b> {order.customer_phone}</li>
        {order.customer_email && <li><b>ইমেইল:</b> {order.customer_email}</li>}
        <li><b>ঠিকানা:</b> {order.address}{order.city ? `, ${order.city}` : ''}</li>
        <li><b>এলাকা:</b> {AREA_LABEL[order.delivery_area]}</li>
        <li><b>পেমেন্ট:</b> {PAYMENT_LABEL[order.payment_method]}</li>
        {order.note && <li><b>নোট:</b> {order.note}</li>}
      </ul>
    </div>
  );
};

export default OrderSummaryCard;
