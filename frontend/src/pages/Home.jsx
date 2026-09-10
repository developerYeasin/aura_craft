import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/index.js';
import { useStore } from '../context/StoreContext.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { Loader, ErrorBox, Reveal, Empty, SectionHead } from '../components/ui/index.jsx';
import {
  IconArrowRight, IconPlus, IconShield, IconGem, IconLock, IconTruck, IconHeadset,
  IconAward, IconHandshake, IconChat, IconWallet, IconRefresh, IconBox, categoryIcon,
} from '../components/ui/Icons.jsx';
import { imageOf, toBn } from '../utils/format.js';

const TRUST = [
  { Icon: IconShield, title: '১০০% অরিজিনাল', text: 'প্রতিটি পণ্য যাচাই করে পাঠানো হয়' },
  { Icon: IconGem, title: 'প্রিমিয়াম কোয়ালিটি', text: 'হাতে বাছাই করা সেরা ম্যাটেরিয়াল' },
  { Icon: IconLock, title: 'নিরাপদ পেমেন্ট', text: 'ক্যাশ অন ডেলিভারি ও মোবাইল ব্যাংকিং' },
  { Icon: IconTruck, title: 'দ্রুত ডেলিভারি', text: 'ঢাকায় ২৪ ঘণ্টা, বাইরে ২-৪ দিন' },
  { Icon: IconHeadset, title: 'কাস্টমার সাপোর্ট', text: 'যেকোনো সময় কল বা মেসেজ করুন' },
];

const WHY = [
  { Icon: IconAward, title: 'উচ্চমানের পণ্য', text: 'কোয়ালিটি চেক ছাড়া কোনো পণ্য যায় না' },
  { Icon: IconHandshake, title: 'নির্ভরযোগ্য সেবা', text: 'হাজারো সন্তুষ্ট ক্রেতার আস্থা' },
  { Icon: IconChat, title: '২৪/৭ সাপোর্ট', text: 'অর্ডারের আগে ও পরে পাশে আছি' },
  { Icon: IconWallet, title: 'সাশ্রয়ী দাম', text: 'সরাসরি সোর্সিং, তাই দাম কম' },
  { Icon: IconRefresh, title: '৭ দিনে রিপ্লেসমেন্ট', text: 'সমস্যা থাকলে বদলে দেওয়া হয়' },
];

const HERO_IMAGE = 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?auto=format&fit=crop&w=2000&q=80';
const OFFER_IMAGE = 'https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&w=900&q=80';

/** Splits "আপনার স্টাইল, আমাদের অনন্যতা" into a normal + italic gradient half. */
const splitTitle = (title = '') => {
  const [first, ...rest] = title.split(',');
  return { first: first?.trim() || title, second: rest.join(',').trim() };
};

const Home = () => {
  const { categories, settings } = useStore();
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

  const { first, second } = splitTitle(settings.hero_title);
  const totalProducts = feed.reduce((sum, g) => sum + (g.total_products || 0), 0);

  return (
    <>
      {/* ============================================ COVER */}
      <section className="cover">
        <img className="cover__img" src={HERO_IMAGE} alt="AuraCraft জুয়েলারি কালেকশন" fetchpriority="high" />
        <span className="cover__veil" />

        <div className="container cover__inner">
          <div className="cover__copy">
            <Reveal>
              <span className="eyebrow">Premium Collection ’২৬</span>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="display t-hero cover__title">
                {first},<br />
                <em>{second}</em>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="cover__sub">{settings.hero_subtitle}</p>
            </Reveal>
            <Reveal delay={240} className="cover__cta">
              <Link to="/products" className="btn btn--primary btn--lg">
                এখনই কিনুন <IconArrowRight width={16} height={16} />
              </Link>
              <Link to="/track" className="btn btn--outline btn--lg">
                অর্ডার ট্র্যাক
              </Link>
            </Reveal>
          </div>
        </div>

        <div className="cover__bar">
          <div className="container cover__stats">
            <div>
              <b>{toBn(totalProducts || 29)}+</b>
              <span>প্রোডাক্ট</span>
            </div>
            <div>
              <b>{toBn(categories.length || 5)}</b>
              <span>ক্যাটাগরি</span>
            </div>
            <div>
              <b>৪.৮</b>
              <span>গড় রেটিং</span>
            </div>
            <div>
              <b>২৪ ঘণ্টা</b>
              <span>ঢাকায় ডেলিভারি</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ TRUST */}
      <section className="container section--tight">
        <div className="features">
          {TRUST.map((f, i) => (
            <Reveal key={f.title} className="card feature" delay={i * 70}>
              <div className="feature__ico">
                <f.Icon width={21} height={21} />
              </div>
              <h4>{f.title}</h4>
              <p>{f.text}</p>
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
              সকল প্রোডাক্ট <span className="grad-text">কালেকশন</span>
            </>
          }
          text="আমাদের সকল ক্যাটাগরির সেরা প্রোডাক্টগুলো এখন এক আঙিনায় — যেকোনোটি বেছে নিন"
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
                  <h3 className="bento__title display">{cat.name_bn || cat.name}</h3>
                  <p>{cat.description}</p>
                  <div className="bento__foot">
                    <span className="badge badge--solid">{toBn(group?.total_products ?? 0)} টি প্রোডাক্ট</span>
                    <span className="link-arrow">
                      সব দেখুন <IconArrowRight width={14} height={14} />
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
              <h3 className="bento__title display">ভবিষ্যতে যুক্ত হবে</h3>
              <p>Watches · Necklace · Sunglasses</p>
              <span className="link-arrow" style={{ marginTop: 6 }}>
                দেখুন <IconArrowRight width={14} height={14} />
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
            title="ফিচার্ড প্রোডাক্ট"
            text="সবচেয়ে জনপ্রিয় ও দ্রুত বিক্রি হওয়া কালেকশন"
            action={
              <Link to="/products?sort=featured" className="btn btn--outline btn--sm">
                সব দেখুন <IconArrowRight width={14} height={14} />
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
        <SectionHead
          center
          eyebrow="Why AuraCraft"
          title="কেন আমাদের বেছে নেবেন?"
          text="আমরা শুধু প্রোডাক্ট বিক্রি করি না — একটি নির্ভরযোগ্য অভিজ্ঞতা দিই"
        />
        <div className="features features--row">
          {WHY.map((f, i) => (
            <Reveal key={f.title} className="card feature" delay={i * 70}>
              <div className="feature__ico">
                <f.Icon width={19} height={19} />
              </div>
              <div>
                <h4>{f.title}</h4>
                <p>{f.text}</p>
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
            <h3 className="display offer__title gold-text">{settings.offer_title || 'Special Offer'}</h3>
            <p className="muted" style={{ margin: 0, maxWidth: '46ch' }}>
              {settings.offer_text || 'নির্বাচিত কিছু প্রোডাক্টে পাচ্ছেন বিশেষ ছাড়!'}
            </p>
          </div>
          <Link to="/products?sort=price_asc" className="btn btn--gold btn--lg">
            এখনই দেখুন <IconArrowRight width={16} height={16} />
          </Link>
        </Reveal>
      </section>

      {/* ============================================ ALL PRODUCTS BY CATEGORY */}
      {loading && <Loader label="প্রোডাক্ট লোড হচ্ছে…" />}
      {error && !loading && (
        <div className="container">
          <ErrorBox message={error} onRetry={load} />
        </div>
      )}
      {!loading && !error && feed.length === 0 && (
        <div className="container">
          <Empty icon={IconBox} title="এখনো কোনো প্রোডাক্ট যোগ করা হয়নি" />
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
                    {group.name_bn || group.name}
                  </span>
                }
                text={`${group.description} · মোট ${toBn(group.total_products)} টি প্রোডাক্ট`}
                action={
                  <Link to={`/category/${group.slug}`} className="btn btn--outline btn--sm">
                    সব দেখুন <IconArrowRight width={14} height={14} />
                  </Link>
                }
              />

              {group.products.length === 0 ? (
                <p className="mute-2">এই ক্যাটাগরিতে এখনো প্রোডাক্ট নেই।</p>
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
