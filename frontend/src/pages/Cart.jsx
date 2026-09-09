import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { Empty, SectionHead } from '../components/ui/index.jsx';
import { IconMinus, IconPlus, IconTrash, IconArrowRight, IconCart } from '../components/ui/Icons.jsx';
import { money, toBn, PLACEHOLDER_IMAGE } from '../utils/format.js';

const Cart = () => {
  const { items, setQuantity, remove, clear, subtotal, count } = useCart();
  const { settings } = useStore();
  const navigate = useNavigate();

  const delivery = Number(settings.delivery_charge_inside || 60);

  if (items.length === 0) {
    return (
      <div className="container section">
        <Empty
          icon={IconCart}
          title="আপনার কার্ট খালি"
          text="পছন্দের প্রোডাক্ট যোগ করে অর্ডার সম্পন্ন করুন।"
          action={
            <Link to="/products" className="btn btn--primary btn--sm" style={{ marginTop: 14 }}>
              শপিং শুরু করুন
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container section--tight">
      <SectionHead center eyebrow="Your bag" title="আপনার কার্ট" text={`মোট ${toBn(count)} টি আইটেম`} />

      <div className="checkout-grid">
        <div className="card card--pad">
          {items.map((item) => (
            <div className="cart-line" key={`${item.id}-${item.variant || ''}`}>
              <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name} />
              <div>
                <Link to={`/product/${item.slug}`} className="cart-line__name">
                  {item.name}
                </Link>
                {item.variant && <span className="badge badge--mute">সাইজ: {item.variant}</span>}
                <div className="mute-2">{money(item.price)} / টি</div>
                <div className="row gap-8" style={{ marginTop: 8 }}>
                  <div className="qty">
                    <button type="button" onClick={() => setQuantity(item.id, item.variant, item.quantity - 1)} disabled={item.quantity <= 1}>
                      <IconMinus width={13} height={13} />
                    </button>
                    <input value={toBn(item.quantity)} readOnly aria-label="পরিমাণ" />
                    <button type="button" onClick={() => setQuantity(item.id, item.variant, item.quantity + 1)}>
                      <IconPlus width={13} height={13} />
                    </button>
                  </div>
                  <button type="button" className="btn btn--danger btn--xs" onClick={() => remove(item.id, item.variant)}>
                    <IconTrash width={13} height={13} /> সরান
                  </button>
                </div>
              </div>
              <b style={{ fontFamily: 'var(--font-ui)' }}>{money(item.price * item.quantity)}</b>
            </div>
          ))}

          <div className="row gap-8" style={{ marginTop: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Link to="/products" className="btn btn--ghost btn--sm">
              ← আরও কেনাকাটা
            </Link>
            <button type="button" className="btn btn--danger btn--sm" onClick={clear}>
              কার্ট খালি করুন
            </button>
          </div>
        </div>

        <div className="card card--pad summary">
          <h3 style={{ marginBottom: 12 }}>অর্ডার সামারি</h3>
          <div className="summary__row">
            <span>সাবটোটাল</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="summary__row">
            <span>ডেলিভারি চার্জ (আনুমানিক)</span>
            <span>{money(delivery)}</span>
          </div>
          <div className="summary__row summary__row--total">
            <span>সর্বমোট</span>
            <span>{money(subtotal + delivery)}</span>
          </div>
          <button type="button" className="btn btn--primary btn--block" style={{ marginTop: 14 }} onClick={() => navigate('/checkout')}>
            চেকআউট করুন <IconArrowRight width={15} height={15} />
          </button>
          <p className="mute-2" style={{ marginTop: 10, marginBottom: 0 }}>
            চেকআউটে ডেলিভারি এলাকা অনুযায়ী চার্জ চূড়ান্ত হবে।
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cart;
