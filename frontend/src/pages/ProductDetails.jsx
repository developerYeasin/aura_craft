import { useEffect, useRef, useState } from 'react';
import { trackEvent, toItem } from '../utils/tracking.js';
import { recordView } from '../utils/views.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../api/index.js';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWishlist } from '../hooks/useWishlist.js';
import { useI18n } from '../i18n/index.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { DiscountBadge } from '../components/product/PriceTag.jsx';
import { Loader, ErrorBox, Rating, Field, SectionHead, Reveal } from '../components/ui/index.jsx';
import {
  IconMinus, IconPlus, IconCart, IconArrowRight, IconHeart,
  IconTruck, IconWallet, IconRefresh, IconShield, IconEye, categoryIcon,
} from '../components/ui/Icons.jsx';
import { money, priceInfo, PLACEHOLDER_IMAGE, toBn } from '../utils/format.js';

const ProductDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const toast = useToast();
  const { has, toggle } = useWishlist();
  const { t, localName } = useI18n();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variant, setVariant] = useState('');
  const [tab, setTab] = useState('description');
  const [showBar, setShowBar] = useState(false);

  const buyRef = useRef(null);

  const load = () => {
    setLoading(true);
    setError(null);
    productApi
      .get(slug)
      .then((res) => {
        setProduct(res.data);
        // Only an opened detail page counts as a view (cards never do).
        recordView('product', res.data?.id).then((r) => {
          if (r?.views != null) setProduct((p) => (p && p.id === res.data.id ? { ...p, view_count: r.views } : p));
        });
        trackEvent('view_item', {
          value: priceInfo(res.data).final,
          items: [toItem(res.data)],
          id: res.data?.id,
          name: res.data?.name,
        });
        setActiveImage(0);
        setQuantity(1);
        setVariant(res.data.size_options?.split('/')[0]?.trim() || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [slug]);

  // reveal the sticky buy bar once the main buy box scrolls out of view
  useEffect(() => {
    const node = buyRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting), { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [product]);

  if (loading) return <div className="container"><Loader label={t('common.loading')} /></div>;
  if (error) return <div className="container"><ErrorBox message={error} onRetry={load} /></div>;
  if (!product) return null;

  const images = product.images?.length ? product.images : [{ url: PLACEHOLDER_IMAGE, id: 0 }];
  const hasVideo = Boolean(product.video_url);
  const showingVideo = hasVideo && activeImage === images.length;
  const price = priceInfo(product);
  const outOfStock = Number(product.stock) <= 0;
  const sizes = (product.size_options || '').split('/').map((s) => s.trim()).filter(Boolean);
  const CatIcon = categoryIcon(product.category_slug);
  const saved = has(product.id);
  const categoryName = localName({ name: product.category_name, name_bn: product.category_name_bn });

  const addToCart = () => {
    add(product, quantity, variant || null);
    toast.success(t('common.addedToCartShort'));
  };

  const orderNow = () => {
    add(product, quantity, variant || null);
    navigate('/checkout');
  };

  return (
    <>
      <div className="container">
        <nav className="crumbs" style={{ marginTop: 24 }}>
          <Link to="/">{t('common.home')}</Link> <span>›</span>
          <Link to={`/category/${product.category_slug}`}>{categoryName}</Link>
          <span>›</span>
          <span className="faint">{product.name}</span>
        </nav>

        <div className="pdp">
          {/* ------------------------------------------------ gallery */}
          <div className="gallery">
            <div className="gallery__thumbs">
              {images.map((img, i) => (
                <button
                  type="button"
                  key={img.id || i}
                  className={`gallery__thumb${i === activeImage ? ' is-active' : ''}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={t('product.image', { n: toBn(i + 1) })}
                >
                  <img src={img.url} alt="" loading="lazy" />
                </button>
              ))}
              {hasVideo && (
                <button
                  type="button"
                  className={`gallery__thumb gallery__thumb--video${showingVideo ? ' is-active' : ''}`}
                  onClick={() => setActiveImage(images.length)}
                  aria-label={t('product.video')}
                >
                  ▶ {t('product.video')}
                </button>
              )}
            </div>
            <div className="gallery__main">
              {showingVideo ? (
                <video className="gallery__video" src={product.video_url} controls autoPlay muted playsInline poster={images[0]?.url} />
              ) : (
                <img src={images[activeImage]?.url} alt={product.name} />
              )}
            </div>
          </div>

          {/* ------------------------------------------------ info */}
          <div>
            <div className="row gap-12 wrap" style={{ marginBottom: 10 }}>
              <span className="chip">
                <CatIcon width={14} height={14} />
                {categoryName}
              </span>
              {product.is_featured === 1 && <span className="badge badge--gold">{t('common.featured')}</span>}
            </div>

            <h1 className="display t-h1">{product.name}</h1>

            <div className="row gap-12 wrap" style={{ marginTop: 10 }}>
              <Rating value={product.rating} count={product.rating_count} />
              {product.sku && <span className="mute-2">SKU: {product.sku}</span>}
              {Number(product.view_count) > 0 && (
                <span className="mute-2 view-pill" title={t('product.views', { n: toBn(product.view_count) })}>
                  <IconEye width={13} height={13} /> {t('product.views', { n: toBn(product.view_count) })}
                </span>
              )}
            </div>

            <div className="pdp__price">
              <b>{money(price.final)}</b>
              {price.hasDiscount && (
                <>
                  <s title={t('product.regularPrice')}>{money(price.original)}</s>
                  <DiscountBadge product={product} info={price} long />
                </>
              )}
              <span className={`badge ${outOfStock ? 'badge--danger' : 'badge--ok'}`}>
                {outOfStock ? t('common.outOfStock') : t('common.inStock', { n: toBn(product.stock) })}
              </span>
              {price.hasDiscount && <span className="pdp__save">{t('product.youSave', { amount: money(price.saved) })}</span>}
            </div>

            <p className="muted">{product.short_description}</p>

            <ul className="spec-list">
              {product.material && <li><b>{t('product.material')}</b> {product.material}</li>}
              {product.color && <li><b>{t('product.color')}</b> {product.color}</li>}
              {product.warranty && <li><b>{t('product.warranty')}</b> {product.warranty}</li>}
            </ul>

            {/* ---------------------------------------- buy box */}
            <div className="card card--pad" ref={buyRef} style={{ marginTop: 22 }}>
              {sizes.length > 1 && (
                <Field label={t('product.variant')}>
                  <div className="swatches">
                    {sizes.map((s) => (
                      <button
                        type="button"
                        key={s}
                        className={`swatch${variant === s ? ' is-on' : ''}`}
                        onClick={() => setVariant(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <div className="row gap-12 wrap" style={{ marginTop: 6 }}>
                <div className="qty">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label={t('product.decrease')}>
                    <IconMinus width={14} height={14} />
                  </button>
                  <input value={toBn(quantity)} readOnly aria-label={t('product.quantity')} />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(q + 1, Math.max(1, product.stock)))}
                    disabled={quantity >= product.stock}
                    aria-label={t('product.increase')}
                  >
                    <IconPlus width={14} height={14} />
                  </button>
                </div>
                <button type="button" className="btn btn--primary" onClick={orderNow} disabled={outOfStock}>
                  {t('common.orderNow')} <IconArrowRight width={15} height={15} />
                </button>
                <button type="button" className="btn btn--outline" onClick={addToCart} disabled={outOfStock}>
                  <IconCart width={15} height={15} /> {t('common.addToCart')}
                </button>
                <button
                  type="button"
                  className="btn btn--icon btn--outline"
                  onClick={() => toggle(product.id)}
                  aria-label={t('common.wishlist')}
                  aria-pressed={saved}
                >
                  <IconHeart width={16} height={16} fill={saved ? 'currentColor' : 'none'} style={{ color: saved ? 'var(--pink)' : undefined }} />
                </button>
              </div>

              <div className="summary__row summary__row--total" style={{ marginTop: 14 }}>
                <span>{t('common.subtotal')}</span>
                <span>
                  {price.hasDiscount && <s>{money(price.original * quantity)}</s>}
                  {money(price.final * quantity)}
                </span>
              </div>
            </div>

            <div className="features features--row" style={{ marginTop: 18, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {[
                { Icon: IconTruck, title: t('product.fastDelivery') },
                { Icon: IconWallet, title: t('product.cod') },
                { Icon: IconRefresh, title: t('product.replacement') },
                { Icon: IconShield, title: t('product.original') },
              ].map((f) => (
                <div className="card feature" key={f.title} style={{ padding: 14 }}>
                  <div className="feature__ico" style={{ width: 34, height: 34 }}>
                    <f.Icon width={16} height={16} />
                  </div>
                  <h4 style={{ fontSize: 13 }}>{f.title}</h4>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ tabs */}
        <div className="tabs">
          {[
            ['description', t('product.tabDescription')],
            ['specs', t('product.tabSpecs')],
            ['delivery', t('product.tabDelivery')],
          ].map(([key, label]) => (
            <button type="button" key={key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="card card--pad">
          {tab === 'description' && (
            <p className="muted" style={{ whiteSpace: 'pre-line', margin: 0, maxWidth: '78ch' }}>
              {product.description}
            </p>
          )}
          {tab === 'specs' && (
            <ul className="spec-list" style={{ margin: 0 }}>
              <li><b>{t('product.category')}</b> {categoryName}</li>
              <li><b>{t('product.material')}</b> {product.material || '—'}</li>
              <li><b>{t('product.color')}</b> {product.color || '—'}</li>
              <li><b>{t('product.size')}</b> {product.size_options || '—'}</li>
              <li><b>{t('product.warranty')}</b> {product.warranty || '—'}</li>
              <li><b>{t('product.stock')}</b> {t('common.pieces', { n: toBn(product.stock) })}</li>
              <li><b>SKU</b> {product.sku || '—'}</li>
            </ul>
          )}
          {tab === 'delivery' && (
            <ul className="spec-list" style={{ margin: 0 }}>
              <li><b>{t('product.freeAreas')}</b> {t('product.freeAreasText')}</li>
              <li><b>{t('product.insideDhaka')}</b> {t('product.insideDhakaText')}</li>
              <li><b>{t('product.outsideDhaka')}</b> {t('product.outsideDhakaText')}</li>
              <li><b>{t('product.payment')}</b> {t('product.paymentText')}</li>
              <li><b>{t('product.returns')}</b> {t('product.returnsText')}</li>
            </ul>
          )}
        </div>

        {product.related?.length > 0 && (
          <section className="section--tight">
            <SectionHead
              eyebrow={t('product.relatedEyebrow')}
              title={t('product.related')}
              action={
                <Link to={`/category/${product.category_slug}`} className="btn btn--outline btn--sm">
                  {t('common.seeAll')} <IconArrowRight width={14} height={14} />
                </Link>
              }
            />
            <div className="grid-products">
              {product.related.map((p, i) => (
                <Reveal key={p.id} delay={i * 70}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ------------------------------------------------ sticky buy bar */}
      <div className={`buybar${showBar && !outOfStock ? ' is-on' : ''}`}>
        <div className="container buybar__inner">
          <img src={images[0]?.url} alt="" />
          <div className="buybar__info">
            <b>{product.name}</b>
            <span className="mute-2">
              {money(price.final)} · {t('common.pieces', { n: toBn(quantity) })}{variant ? ` · ${variant}` : ''}
            </span>
          </div>
          <div className="buybar__actions">
            <button type="button" className="btn btn--outline btn--sm" onClick={addToCart}>
              <IconCart width={14} height={14} /> {t('product.add')}
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={orderNow}>
              {t('common.orderNow')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;
