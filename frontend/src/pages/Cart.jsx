import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useI18n } from '../i18n/index.jsx';
import { Empty, SectionHead } from '../components/ui/index.jsx';
import { IconMinus, IconPlus, IconTrash, IconArrowRight, IconCart } from '../components/ui/Icons.jsx';
import { money, toBn, PLACEHOLDER_IMAGE } from '../utils/format.js';

const Cart = () => {
  const { items, setQuantity, remove, clear, subtotal, count } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container section">
        <Empty
          icon={IconCart}
          title={t('cart.empty')}
          text={t('cart.emptyText')}
          action={
            <Link to="/products" className="btn btn--primary btn--sm" style={{ marginTop: 14 }}>
              {t('cart.startShopping')}
            </Link>
          }
        />
      </div>
    );
  }

  const savings = items.reduce(
    (sum, i) => sum + (i.original_price ? (i.original_price - i.price) * i.quantity : 0),
    0
  );

  return (
    <div className="container section--tight">
      <SectionHead center eyebrow={t('cart.eyebrow')} title={t('cart.title')} text={t('cart.itemCount', { n: toBn(count) })} />

      <div className="checkout-grid">
        <div className="card card--pad">
          {items.map((item) => (
            <div className="cart-line" key={`${item.id}-${item.variant || ''}`}>
              <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name} />
              <div>
                <Link to={`/product/${item.slug}`} className="cart-line__name">
                  {item.name}
                </Link>
                {item.variant && <span className="badge badge--mute">{t('cart.sizeLabel', { v: item.variant })}</span>}
                <div className="mute-2">
                  {item.original_price ? <s style={{ marginRight: 6 }}>{money(item.original_price)}</s> : null}
                  {t('cart.perUnit', { price: money(item.price) })}
                </div>
                <div className="row gap-8" style={{ marginTop: 8 }}>
                  <div className="qty">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, item.variant, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label={t('product.decrease')}
                    >
                      <IconMinus width={13} height={13} />
                    </button>
                    <input value={toBn(item.quantity)} readOnly aria-label={t('product.quantity')} />
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, item.variant, item.quantity + 1)}
                      aria-label={t('product.increase')}
                    >
                      <IconPlus width={13} height={13} />
                    </button>
                  </div>
                  <button type="button" className="btn btn--danger btn--xs" onClick={() => remove(item.id, item.variant)}>
                    <IconTrash width={13} height={13} /> {t('common.remove')}
                  </button>
                </div>
              </div>
              <b style={{ fontFamily: 'var(--font-ui)' }}>{money(item.price * item.quantity)}</b>
            </div>
          ))}

          <div className="row gap-8" style={{ marginTop: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Link to="/products" className="btn btn--ghost btn--sm">
              {t('cart.keepShopping')}
            </Link>
            <button type="button" className="btn btn--danger btn--sm" onClick={clear}>
              {t('cart.clear')}
            </button>
          </div>
        </div>

        <div className="card card--pad summary">
          <h3 style={{ marginBottom: 12 }}>{t('cart.summary')}</h3>
          <div className="summary__row">
            <span>{t('common.subtotal')}</span>
            <span>{money(subtotal)}</span>
          </div>
          {savings > 0 && (
            <div className="summary__row summary__row--save">
              <span>{t('checkout.productSavings')}</span>
              <span>− {money(savings)}</span>
            </div>
          )}
          <div className="summary__row">
            <span>{t('common.deliveryCharge')}</span>
            <span className="mute-2">{t('cart.deliveryLater')}</span>
          </div>
          <div className="summary__row summary__row--total">
            <span>{t('common.total')}</span>
            <span>{money(subtotal)}+</span>
          </div>
          <button type="button" className="btn btn--primary btn--block" style={{ marginTop: 14 }} onClick={() => navigate('/checkout')}>
            {t('cart.checkout')} <IconArrowRight width={15} height={15} />
          </button>
          <p className="mute-2" style={{ marginTop: 10, marginBottom: 0 }}>
            {t('cart.deliveryNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cart;
