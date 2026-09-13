import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/index.js';
import { useStore } from '../context/StoreContext.jsx';
import { useI18n } from '../i18n/index.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { Loader, ErrorBox, Reveal, Empty, SectionHead } from '../components/ui/index.jsx';
import {
  IconArrowRight, IconPlus, IconShield, IconGem, IconLock, IconTruck, IconHeadset,
  IconAward, IconHandshake, IconChat, IconWallet, IconRefresh, IconBox, categoryIcon,
} from '../components/ui/Icons.jsx';
import { imageOf, toBn } from '../utils/format.js';

const TRUST = [IconShield, IconGem, IconLock, IconTruck, IconHeadset];
const WHY = [IconAward, IconHandshake, IconChat, IconWallet, IconRefresh];

const HERO_IMAGE = 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?auto=format&fit=crop&w=2000&q=80';
const OFFER_IMAGE = 'https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&w=900&q=80';

/** Splits "আপনার স্টাইল, আমাদের অনন্যতা" into a normal + accented half. */
const splitTitle = (title = '') => {
  const [first, ...rest] = title.split(',');
  return { first: first?.trim() || title, second: rest.join(',').trim() };
};

const Home = () => {
  const { categories, settings } = useStore();
  const { t, localName, setting } = useI18n();
  const [feed, setFeed] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([productApi.homeFeed(8), productApi.list({ featured: 'true', limit: 8, sort: 'featured' })])
      .then(([feedRes, featuredRes]) => {
        setFeed(feedRes.data || []);
        setFeatured(featuredRes.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const { first, second } = splitTitle(setting(settings, 'hero_title', 'home.heroTitle'));
  const totalProducts = feed.reduce((sum, g) => sum + (g.total_products || 0), 0);

  return (
    <>
      {/* ============================================ COVER */}
      <section className="cover">
        <img className="cover__img" src={HERO_IMAGE} alt={t('home.heroAlt')} fetchpriority="high" />
        <span className="cover__veil" />

        <div className="container cover__inner">
          <div className="cover__copy">
            <Reveal>
              <span className="eyebrow">{t('home.heroEyebrow')}</span>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="display t-hero cover__title">
                {second ? (
                  <>
                    {first},<br />
                    <em>{second}</em>
                  </>
                ) : (
                  first
                )}
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="cover__sub">{setting(settings, 'hero_subtitle', 'home.heroSubtitle')}</p>
            </Reveal>
            <Reveal delay={240} className="cover__cta">
              <Link to="/products" className="btn btn--primary btn--lg">
                {t('common.shopNow')} <IconArrowRight width={16} height={16} />
              </Link>
              <Link to="/track" className="btn btn--outline btn--lg">
                {t('common.trackOrder')}
              </Link>
            </Reveal>
          </div>
        </div>

        <div className="cover__bar">
          <div className="container cover__stats">
            <div>
              <b>{toBn(totalProducts || 29)}+</b>
              <span>{t('home.statProducts')}</span>
            </div>
            <div>
              <b>{toBn(categories.length || 5)}</b>
              <span>{t('home.statCategories')}</span>
            </div>
            <div>
              <b>{t('home.ratingValue')}</b>
              <span>{t('home.statRating')}</span>
            </div>
            <div>
              <b>{t('home.statDeliveryValue')}</b>
              <span>{t('home.statDelivery')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ TRUST */}
      <section className="container section--tight">
        <div className="features">
          {TRUST.map((Icon, i) => (
            <Reveal key={i} className="card feature" delay={i * 70}>
              <div className="feature__ico">
                <Icon width={21} height={21} />
              </div>
              <h4>{t(`home.trust${i + 1}`)}</h4>
              <p>{t(`home.trust${i + 1}Text`)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================ CATEGORY BENTO */}
      <section className="container section">
        <SectionHead
          center
          eyebrow="Collections"
          title={
            <>
              {t('home.collectionsTitle')} <span className="grad-text">{t('home.collectionsAccent')}</span>
            </>
          }
          text={t('home.collectionsText')}
        />

        <div className="bento">
          {categories.map((cat, i) => {
            const group = feed.find((f) => f.id === cat.id);
            const Icon = categoryIcon(cat.slug);
            const cover = group?.products?.[0] ? imageOf(group.products[0]) : cat.image_url;
            const size = i === 0 ? ' bento__cell--lg' : '';

            return (
              <Reveal key={cat.id} as={Link} to={`/category/${cat.slug}`} className={`bento__cell${size}`} delay={i * 80}>
                <img className="bento__img" src={cover} alt="" loading="lazy" />
                <span className="bento__veil" />
                <div className="bento__body">
                  <span className="bento__ico">
                    <Icon width={17} height={17} />
                  </span>
                  <h3 className="bento__title display">{localName(cat)}</h3>
                  <p>{cat.description}</p>
                  <div className="bento__foot">
                    <span className="badge badge--solid">{t('home.nProducts', { n: toBn(group?.total_products ?? 0) })}</span>
                    <span className="link-arrow">
                      {t('common.seeAll')} <IconArrowRight width={14} height={14} />
                    </span>
                  </div>
                </div>
              </Reveal>
            );
          })}

          <Reveal as={Link} to="/upcoming" className="bento__cell bento__cell--cta bento__cell--full" delay={categories.length * 80}>
            <div className="bento__body">
              <span className="bento__ico">
                <IconPlus width={17} height={17} />
              </span>
              <h3 className="bento__title display">{t('common.upcoming')}</h3>
              <p>Watches · Necklace · Sunglasses</p>
              <span className="link-arrow" style={{ marginTop: 6 }}>
                {t('common.view')} <IconArrowRight width={14} height={14} />
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================ FEATURED */}
      {featured.length > 0 && (
        <section className="container section--tight">
          <SectionHead
            eyebrow="Bestsellers"
            title={t('home.featuredTitle')}
            text={t('home.featuredText')}
            action={
              <Link to="/products?sort=featured" className="btn btn--outline btn--sm">
                {t('common.seeAll')} <IconArrowRight width={14} height={14} />
              </Link>
            }
          />
          <div className="grid-products">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ============================================ WHY US */}
      <section className="container section">
        <SectionHead center eyebrow="Why Aura Craft" title={t('home.whyTitle')} text={t('home.whyText')} />
        <div className="features features--row">
          {WHY.map((Icon, i) => (
            <Reveal key={i} className="card feature" delay={i * 70}>
              <div className="feature__ico">
                <Icon width={19} height={19} />
              </div>
              <div>
                <h4>{t(`home.why${i + 1}`)}</h4>
                <p>{t(`home.why${i + 1}Text`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================ OFFER */}
      <section className="container section--tight">
        <Reveal className="offer">
          <img src={OFFER_IMAGE} alt="" loading="lazy" />
          <div>
            <span className="eyebrow">Limited Time</span>
            <h3 className="display offer__title gold-text">{setting(settings, 'offer_title', 'home.offerTitle')}</h3>
            <p className="muted" style={{ margin: 0, maxWidth: '46ch' }}>
              {setting(settings, 'offer_text', 'home.offerText')}
            </p>
          </div>
          <Link to="/products?sort=price_asc" className="btn btn--gold btn--lg">
            {t('home.offerCta')} <IconArrowRight width={16} height={16} />
          </Link>
        </Reveal>
      </section>

      {/* ============================================ ALL PRODUCTS BY CATEGORY */}
      {loading && <Loader label={t('home.loadingProducts')} />}
      {error && !loading && (
        <div className="container">
          <ErrorBox message={error} onRetry={load} />
        </div>
      )}
      {!loading && !error && feed.length === 0 && (
        <div className="container">
          <Empty icon={IconBox} title={t('home.noProducts')} />
        </div>
      )}

      {!loading &&
        !error &&
        feed.map((group) => {
          const Icon = categoryIcon(group.slug);
          return (
            <section className="container section--tight" key={group.id}>
              <SectionHead
                eyebrow={group.name}
                title={
                  <span className="row gap-12" style={{ display: 'inline-flex' }}>
                    <span className="bento__ico" style={{ width: 34, height: 34 }}>
                      <Icon width={16} height={16} />
                    </span>
                    {localName(group)}
                  </span>
                }
                text={`${group.description ? `${group.description} · ` : ''}${t('home.totalProducts', { n: toBn(group.total_products) })}`}
                action={
                  <Link to={`/category/${group.slug}`} className="btn btn--outline btn--sm">
                    {t('common.seeAll')} <IconArrowRight width={14} height={14} />
                  </Link>
                }
              />

              {group.products.length === 0 ? (
                <p className="mute-2">{t('home.emptyCategory')}</p>
              ) : (
                <div className="grid-products">
                  {group.products.map((p, i) => (
                    <Reveal key={p.id} delay={(i % 4) * 60}>
                      <ProductCard product={p} compact />
                    </Reveal>
                  ))}
                </div>
              )}
            </section>
          );
        })}
    </>
  );
};

export default Home;
