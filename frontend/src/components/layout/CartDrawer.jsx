import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { IconClose, IconMinus, IconPlus, IconTrash, IconArrowRight, IconCart } from '../ui/Icons.jsx';
import { money, toBn, PLACEHOLDER_IMAGE } from '../../utils/format.js';

const CartDrawer = ({ open, onClose }) => {
  const { items, setQuantity, remove, subtotal, count } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const go = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer cart-drawer" role="dialog" aria-label={t('cart.title')}>
        <div className="spread cart-drawer__head">
          <span className="eyebrow">
            {t('cart.title')} {count > 0 && `(${toBn(count)})`}
          </span>
          <button type="button" className="nav__btn" onClick={onClose} aria-label={t('common.close')}>
            <IconClose />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <IconCart width={40} height={40} />
            <h4>{t('cart.empty')}</h4>
            <p className="mute-2">{t('cart.emptyText')}</p>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => go('/products')}>
              {t('cart.startShopping')}
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer__list">
              {items.map((item) => (
                <div className="cart-line cart-drawer__line" key={`${item.id}-${item.variant || ''}`}>
                  <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name} />
                  <div>
                    <Link to={`/product/${item.slug}`} className="cart-line__name" onClick={onClose}>
                      {item.name}
                    </Link>
                    {item.variant && <span className="badge badge--mute">{t('cart.sizeLabel', { v: item.variant })}</span>}
                    <div className="mute-2">{money(item.price * item.quantity)}</div>
                    <div className="row gap-8" style={{ marginTop: 6 }}>
                      <div className="qty">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, item.variant, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={t('product.decrease')}
                        >
                          <IconMinus width={12} height={12} />
                        </button>
                        <input value={toBn(item.quantity)} readOnly aria-label={t('product.quantity')} />
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, item.variant, item.quantity + 1)}
                          aria-label={t('product.increase')}
                        >
                          <IconPlus width={12} height={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn btn--danger btn--xs"
                        onClick={() => remove(item.id, item.variant)}
                        aria-label={t('common.remove')}
                      >
                        <IconTrash width={13} height={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-drawer__foot">
              <div className="summary__row">
                <span>{t('common.subtotal')}</span>
                <b>{money(subtotal)}</b>
              </div>
              <p className="mute-2" style={{ margin: '4px 0 12px' }}>{t('cart.deliveryLater')}</p>
              <button type="button" className="btn btn--primary btn--block" onClick={() => go('/checkout')}>
                {t('cart.checkout')} <IconArrowRight width={15} height={15} />
              </button>
              <button type="button" className="btn btn--ghost btn--block" style={{ marginTop: 8 }} onClick={() => go('/cart')}>
                {t('cart.viewCart')}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

export default CartDrawer;
