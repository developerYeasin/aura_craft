import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useWishlist } from '../../hooks/useWishlist.js';
import { money, discountPercent, imageOf, toBn } from '../../utils/format.js';
import { IconHeart, IconCart, IconEye, IconArrowRight } from '../ui/Icons.jsx';
import { Rating } from '../ui/index.jsx';

const ProductCard = ({ product, compact = false }) => {
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const { has, toggle } = useWishlist();

  const off = discountPercent(product.price, product.compare_price);
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
    toast.success(`${product.name} কার্টে যোগ হয়েছে`);
  };

  return (
    <article className="pcard">
      <div className="pcard__top">
        <Link to={`/product/${product.slug}`} className="pcard__media" aria-label={product.name}>
          <img src={imageOf(product)} alt={product.name} loading="lazy" />
        </Link>

        <div className="pcard__flags">
          {off > 0 && <span className="badge badge--solid">-{toBn(off)}%</span>}
          {product.is_featured === 1 && <span className="badge badge--gold">ফিচার্ড</span>}
          {outOfStock && <span className="badge badge--danger">স্টক নেই</span>}
          {lowStock && <span className="badge badge--warn">শেষ {toBn(product.stock)} টি</span>}
        </div>

        <button
          type="button"
          className={`pcard__fav${saved ? ' is-on' : ''}`}
          onClick={() => toggle(product.id)}
          aria-label={saved ? 'পছন্দের তালিকা থেকে সরান' : 'পছন্দের তালিকায় রাখুন'}
          aria-pressed={saved}
        >
          <IconHeart width={15} height={15} fill={saved ? 'currentColor' : 'none'} />
        </button>

        {/* slides up over the image only; stacks below it on touch devices */}
        <div className="pcard__hover">
          {compact ? (
            <button type="button" className="btn btn--primary" onClick={orderNow} disabled={outOfStock}>
              অর্ডার করুন <IconArrowRight width={14} height={14} />
            </button>
          ) : (
            <>
              <Link to={`/product/${product.slug}`} className="btn btn--outline">
                <IconEye width={14} height={14} /> বিস্তারিত
              </Link>
              <button type="button" className="btn btn--primary" onClick={addToCart} disabled={outOfStock}>
                <IconCart width={14} height={14} /> কার্টে
              </button>
            </>
          )}
        </div>
      </div>

      <div className="pcard__body">
        <span className="pcard__cat">{product.category_name_bn || product.category_name}</span>
        <Link to={`/product/${product.slug}`} className="pcard__name">
          {product.name}
        </Link>
        {Number(product.rating) > 0 && (
          <Rating value={Number(product.rating)} count={product.rating_count} />
        )}
        <div className="pcard__price">
          <b>{money(product.price)}</b>
          {off > 0 && <s>{money(product.compare_price)}</s>}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
