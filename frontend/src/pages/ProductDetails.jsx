import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../api/index.js';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWishlist } from '../hooks/useWishlist.js';
import ProductCard from '../components/product/ProductCard.jsx';
import { Loader, ErrorBox, Rating, Field, SectionHead, Reveal } from '../components/ui/index.jsx';
import {
  IconMinus, IconPlus, IconCart, IconArrowRight, IconHeart,
  IconTruck, IconWallet, IconRefresh, IconShield, categoryIcon,
} from '../components/ui/Icons.jsx';
import { money, discountPercent, PLACEHOLDER_IMAGE, toBn } from '../utils/format.js';

const ProductDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const toast = useToast();
  const { has, toggle } = useWishlist();

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

  if (loading) return <div className="container"><Loader /></div>;
  if (error) return <div className="container"><ErrorBox message={error} onRetry={load} /></div>;
  if (!product) return null;

  const images = product.images?.length ? product.images : [{ url: PLACEHOLDER_IMAGE, id: 0 }];
  const off = discountPercent(product.price, product.compare_price);
  const outOfStock = Number(product.stock) <= 0;
  const sizes = (product.size_options || '').split('/').map((s) => s.trim()).filter(Boolean);
  const CatIcon = categoryIcon(product.category_slug);
  const saved = has(product.id);

  const addToCart = () => {
    add(product, quantity, variant || null);
    toast.success('কার্টে যোগ করা হয়েছে');
  };

  const orderNow = () => {
    add(product, quantity, variant || null);
    navigate('/checkout');
  };

  return (
    <>
      <div className="container">
        <nav className="crumbs" style={{ marginTop: 24 }}>
          <Link to="/">হোম</Link> <span>›</span>
          <Link to={`/category/${product.category_slug}`}>{product.category_name_bn || product.category_name}</Link>
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
                  aria-label={`ছবি ${i + 1}`}
                >
                  <img src={img.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
            <div className="gallery__main">
              <img src={images[activeImage]?.url} alt={product.name} />
            </div>
          </div>

          {/* ------------------------------------------------ info */}
          <div>
            <div className="row gap-12 wrap" style={{ marginBottom: 10 }}>
              <span className="chip">
                <CatIcon width={14} height={14} />
                {product.category_name_bn || product.category_name}
              </span>
              {product.is_featured === 1 && <span className="badge badge--gold">ফিচার্ড</span>}
            </div>

            <h1 className="display t-h1">{product.name}</h1>

            <div className="row gap-12 wrap" style={{ marginTop: 10 }}>
              <Rating value={product.rating} count={product.rating_count} />
              <span className="mute-2">SKU: {product.sku}</span>
            </div>

            <div className="pdp__price">
              <b>{money(product.price)}</b>
              {off > 0 && (
                <>
                  <s>{money(product.compare_price)}</s>
                  <span className="badge badge--pink">{toBn(off)}% ছাড়</span>
                </>
              )}
              <span className={`badge ${outOfStock ? 'badge--danger' : 'badge--ok'}`}>
                {outOfStock ? 'স্টক নেই' : `স্টকে ${toBn(product.stock)} টি`}
              </span>
            </div>

            <p className="muted">{product.short_description}</p>

            <ul className="spec-list">
              {product.material && <li><b>উপাদান</b> {product.material}</li>}
              {product.color && <li><b>রঙ</b> {product.color}</li>}
              {product.warranty && <li><b>ওয়ারেন্টি</b> {product.warranty}</li>}
            </ul>

            {/* ---------------------------------------- buy box */}
            <div className="card card--pad" ref={buyRef} style={{ marginTop: 22 }}>
              {sizes.length > 1 && (
                <Field label="সাইজ / ভ্যারিয়েন্ট">
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
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="কমান">
                    <IconMinus width={14} height={14} />
                  </button>
                  <input value={toBn(quantity)} readOnly aria-label="পরিমাণ" />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(q + 1, Math.max(1, product.stock)))}
                    disabled={quantity >= product.stock}
                    aria-label="বাড়ান"
                  >
                    <IconPlus width={14} height={14} />
                  </button>
                </div>
                <button type="button" className="btn btn--primary" onClick={orderNow} disabled={outOfStock}>
                  অর্ডার করুন <IconArrowRight width={15} height={15} />
                </button>
                <button type="button" className="btn btn--outline" onClick={addToCart} disabled={outOfStock}>
                  <IconCart width={15} height={15} /> কার্টে যোগ করুন
                </button>
                <button
                  type="button"
                  className="btn btn--icon btn--outline"
                  onClick={() => toggle(product.id)}
                  aria-label="পছন্দের তালিকা"
                  aria-pressed={saved}
                >
                  <IconHeart width={16} height={16} fill={saved ? 'currentColor' : 'none'} style={{ color: saved ? 'var(--pink)' : undefined }} />
                </button>
              </div>

              <div className="summary__row summary__row--total" style={{ marginTop: 14 }}>
                <span>সাবটোটাল</span>
                <span>{money(Number(product.price) * quantity)}</span>
              </div>
            </div>

            <div className="features features--row" style={{ marginTop: 18, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {[
                { Icon: IconTruck, title: 'দ্রুত ডেলিভারি' },
                { Icon: IconWallet, title: 'ক্যাশ অন ডেলিভারি' },
                { Icon: IconRefresh, title: '৭ দিনে রিপ্লেসমেন্ট' },
                { Icon: IconShield, title: '১০০% অরিজিনাল' },
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
            ['description', 'বিস্তারিত'],
            ['specs', 'স্পেসিফিকেশন'],
            ['delivery', 'ডেলিভারি ও রিটার্ন'],
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
              <li><b>ক্যাটাগরি</b> {product.category_name_bn || product.category_name}</li>
              <li><b>উপাদান</b> {product.material || '—'}</li>
              <li><b>রঙ</b> {product.color || '—'}</li>
              <li><b>সাইজ</b> {product.size_options || '—'}</li>
              <li><b>ওয়ারেন্টি</b> {product.warranty || '—'}</li>
              <li><b>স্টক</b> {toBn(product.stock)} টি</li>
              <li><b>SKU</b> {product.sku || '—'}</li>
            </ul>
          )}
          {tab === 'delivery' && (
            <ul className="spec-list" style={{ margin: 0 }}>
              <li><b>ঢাকার ভেতরে</b> ২৪–৪৮ ঘণ্টার মধ্যে ডেলিভারি</li>
              <li><b>ঢাকার বাইরে</b> ২–৪ কর্মদিবস</li>
              <li><b>পেমেন্ট</b> ক্যাশ অন ডেলিভারি, বিকাশ, নগদ</li>
              <li><b>রিটার্ন</b> পণ্যে সমস্যা থাকলে ৭ দিনের মধ্যে রিপ্লেসমেন্ট</li>
            </ul>
          )}
        </div>

        {product.related?.length > 0 && (
          <section className="section--tight">
            <SectionHead
              eyebrow="You may also like"
              title="সম্পর্কিত প্রোডাক্ট"
              action={
                <Link to={`/category/${product.category_slug}`} className="btn btn--outline btn--sm">
                  সব দেখুন <IconArrowRight width={14} height={14} />
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
              {money(product.price)} · {toBn(quantity)} টি{variant ? ` · ${variant}` : ''}
            </span>
          </div>
          <div className="buybar__actions">
            <button type="button" className="btn btn--outline btn--sm" onClick={addToCart}>
              <IconCart width={14} height={14} /> Add
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={orderNow}>
              অর্ডার করুন
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;
