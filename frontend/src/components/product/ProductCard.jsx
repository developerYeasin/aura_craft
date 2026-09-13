import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useWishlist } from '../../hooks/useWishlist.js';
import { useI18n } from '../../i18n/index.jsx';
import { money, priceInfo, imageOf, toBn } from '../../utils/format.js';
import { IconHeart, IconCart, IconEye, IconArrowRight } from '../ui/Icons.jsx';
import { Rating } from '../ui/index.jsx';
import { DiscountBadge } from './PriceTag.jsx';

const ProductCard = ({ product, compact = false }) => {
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const { has, toggle } = useWishlist();
  const { t, localName } = useI18n();

  const price = priceInfo(product);
  const outOfStock = Number(product.stock) <= 0;
  const lowStock = !outOfStock && Number(product.stock) <= 5;
  const saved = has(product.id);

  const orderNow = () => {
    if (outOfStock) return;
    add(product, 1, null);
    navigate('/checkout');
  };

  const addToCart = () => {
    if (outOfStock) return;
    add(product, 1, null);
    toast.success(t('common.addedToCart', { name: product.name }));
  };

  return (
    <article className="pcard">
      <div className="pcard__top">
        <Link to={`/product/${product.slug}`} className="pcard__media" aria-label={product.name}>
          <img src={imageOf(product)} alt={product.name} loading="lazy" />
        </Link>

        <div className="pcard__flags">
          <DiscountBadge product={product} info={price} />
          {product.is_featured === 1 && <span className="badge badge--gold">{t('common.featured')}</span>}
          {outOfStock && <span className="badge badge--danger">{t('common.outOfStock')}</span>}
          {lowStock && <span className="badge badge--warn">{t('common.onlyLeft', { n: toBn(product.stock) })}</span>}
        </div>

        <button
          type="button"
          className={`pcard__fav${saved ? ' is-on' : ''}`}
          onClick={() => toggle(product.id)}
          aria-label={saved ? t('common.removeFromList') : t('common.saveToList')}
          aria-pressed={saved}
        >
          <IconHeart width={15} height={15} fill={saved ? 'currentColor' : 'none'} />
        </button>

        {/* slides up over the image only; stacks below it on touch devices */}
        <div className="pcard__hover">
          {compact ? (
            <button type="button" className="btn btn--primary" onClick={orderNow} disabled={outOfStock}>
              {t('common.orderNow')} <IconArrowRight width={14} height={14} />
            </button>
          ) : (
            <>
              <Link to={`/product/${product.slug}`} className="btn btn--outline">
                <IconEye width={14} height={14} /> {t('common.details')}
              </Link>
              <button type="button" className="btn btn--primary" onClick={addToCart} disabled={outOfStock}>
                <IconCart width={14} height={14} /> {t('common.addShort')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="pcard__body">
        <span className="pcard__cat">{localName({ name: product.category_name, name_bn: product.category_name_bn })}</span>
        <Link to={`/product/${product.slug}`} className="pcard__name">
          {product.name}
        </Link>
        {Number(product.rating) > 0 && (
          <Rating value={Number(product.rating)} count={product.rating_count} />
        )}
        <div className="pcard__price">
          <b>{money(price.final)}</b>
          {price.hasDiscount && <s>{money(price.original)}</s>}
          {price.hasDiscount && <span className="pcard__save">{t('product.youSave', { amount: money(price.saved) })}</span>}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
