import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { productApi, categoryApi } from '../api/index.js';
import ProductCard from '../components/product/ProductCard.jsx';
import { Empty, ErrorBox, Pagination, SkeletonGrid, SectionHead } from '../components/ui/index.jsx';
import { IconSearch, IconFilter, categoryIcon } from '../components/ui/Icons.jsx';
import { money, toBn } from '../utils/format.js';

const SORTS = [
  { value: 'newest', label: 'সর্বনতুন' },
  { value: 'price_asc', label: 'দাম: কম → বেশি' },
  { value: 'price_desc', label: 'দাম: বেশি → কম' },
  { value: 'rating', label: 'সর্বোচ্চ রেটিং' },
  { value: 'name_asc', label: 'নাম (A→Z)' },
  { value: 'featured', label: 'ফিচার্ড' },
];

const PRICE_BUCKETS = [
  { label: '৳ ০ – ১,০০০', min: 0, max: 1000 },
  { label: '৳ ১,০০০ – ২,০০০', min: 1000, max: 2000 },
  { label: '৳ ২,০০০ – ৫,০০০', min: 2000, max: 5000 },
  { label: '৳ ৫,০০০+', min: 5000, max: undefined },
];

/** Shared listing page: /products (all) and /category/:slug (single category). */
const CatalogPage = ({ mode = 'all' }) => {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();

  const [category, setCategory] = useState(null);
  const [data, setData] = useState({ items: [], meta: { page: 1, totalPages: 1, total: 0 } });
  const [facets, setFacets] = useState({ materials: [], colors: [], priceRange: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchDraft, setSearchDraft] = useState(params.get('search') || '');

  const query = useMemo(() => {
    const q = {
      page: Number(params.get('page') || 1),
      limit: 12,
      sort: params.get('sort') || 'newest',
    };
    if (params.get('search')) q.search = params.get('search');
    if (params.get('minPrice')) q.minPrice = params.get('minPrice');
    if (params.get('maxPrice')) q.maxPrice = params.get('maxPrice');
    if (params.get('material')) q.material = params.get('material');
    if (params.get('color')) q.color = params.get('color');
    if (params.get('inStock')) q.inStock = 'true';
    if (mode === 'category' && slug) q.category = slug;
    else if (params.get('category')) q.category = params.get('category');
    return q;
  }, [params, slug, mode]);

  useEffect(() => {
    setSearchDraft(params.get('search') || '');
  }, [params]);

  useEffect(() => {
    if (mode !== 'category' || !slug) {
      setCategory(null);
      return;
    }
    categoryApi
      .get(slug)
      .then((res) => setCategory(res.data))
      .catch(() => setCategory(null));
  }, [slug, mode]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([productApi.list(query), productApi.facets(query)])
      .then(([listRes, facetRes]) => {
        if (!alive) return;
        setData({ items: listRes.data || [], meta: listRes.meta });
        setFacets(facetRes.data);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query]);

  const patch = (updates, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') next.delete(key);
      else next.set(key, value);
    });
    if (resetPage) next.delete('page');
    setParams(next);
  };

  const priceActive = (bucket) =>
    String(bucket.min) === (params.get('minPrice') || '') &&
    String(bucket.max ?? '') === (params.get('maxPrice') || '');

  const reset = () => setParams(new URLSearchParams());

  const title = mode === 'category' ? category?.name_bn || category?.name || 'কালেকশন' : 'সব প্রোডাক্ট';
  const banner = category?.banner_url || category?.image_url;

  const filterPanel = (
    <aside className="card card--pad filters">
      <div className="spread" style={{ marginBottom: 14 }}>
        <h4 style={{ margin: 0 }}>ফিল্টার</h4>
        <button type="button" className="btn btn--xs btn--ghost" onClick={reset}>
          রিসেট
        </button>
      </div>

      <div className="filters__group">
        <h4>দাম</h4>
        {PRICE_BUCKETS.map((b) => (
          <label className="checkbox" key={b.label}>
            <input
              type="checkbox"
              checked={priceActive(b)}
              onChange={(e) =>
                patch({
                  minPrice: e.target.checked ? b.min : undefined,
                  maxPrice: e.target.checked ? b.max : undefined,
                })
              }
            />
            {b.label}
          </label>
        ))}
      </div>

      {facets.materials?.length > 0 && (
        <div className="filters__group">
          <h4>ম্যাটেরিয়াল</h4>
          {facets.materials.map((m) => (
            <label className="checkbox" key={m.value}>
              <input
                type="checkbox"
                checked={params.get('material') === m.value}
                onChange={(e) => patch({ material: e.target.checked ? m.value : undefined })}
              />
              {m.value} <span className="mute-2">({toBn(m.count)})</span>
            </label>
          ))}
        </div>
      )}

      {facets.colors?.length > 0 && (
        <div className="filters__group">
          <h4>রঙ</h4>
          {facets.colors.map((c) => (
            <label className="radio" key={c.value}>
              <input
                type="radio"
                name="color"
                checked={params.get('color') === c.value}
                onChange={() => patch({ color: c.value })}
              />
              {c.value} <span className="mute-2">({toBn(c.count)})</span>
            </label>
          ))}
        </div>
      )}

      <div className="filters__group">
        <h4>স্টক</h4>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={params.get('inStock') === 'true'}
            onChange={(e) => patch({ inStock: e.target.checked ? 'true' : undefined })}
          />
          শুধু স্টকে আছে
        </label>
      </div>

      {facets.priceRange?.min_price != null && (
        <p className="mute-2" style={{ margin: 0 }}>
          দামের রেঞ্জ: {money(facets.priceRange.min_price)} – {money(facets.priceRange.max_price)}
        </p>
      )}
    </aside>
  );

  return (
    <div className="container">
      {banner ? (
        <div className="page-banner">
          <img src={banner} alt="" />
          <div className="page-banner__veil" />
          <div className="page-banner__content">
            <span className="eyebrow eyebrow--both">Collection</span>
            <h1 className="display t-h1">
              {title} <span className="grad-text">কালেকশন</span>
            </h1>
            <p className="muted" style={{ margin: 0 }}>{category?.description}</p>
            <span className="badge badge--solid" style={{ marginTop: 6 }}>
              {toBn(data.meta?.total || 0)} টি প্রোডাক্ট
            </span>
          </div>
        </div>
      ) : (
        <div style={{ paddingTop: 40 }}>
          <SectionHead center eyebrow="Catalog" title={title} text="আপনার পছন্দের প্রোডাক্ট খুঁজে নিন" />
        </div>
      )}

      <nav className="crumbs">
        <Link to="/">হোম</Link> <span>›</span>
        {mode === 'category' ? <span>{title}</span> : <span>সব প্রোডাক্ট</span>}
      </nav>

      <div className="cat-layout">
        <div className={`filters-col${showFilters ? ' is-open' : ''}`}>{filterPanel}</div>

        <div>
          <div className="toolbar">
            <form
              className="search-wrap"
              onSubmit={(e) => {
                e.preventDefault();
                patch({ search: searchDraft.trim() || undefined });
              }}
            >
              <IconSearch width={16} height={16} />
              <input
                className="input"
                placeholder="সার্চ করুন…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
              />
            </form>
            <button type="button" className="btn btn--sm mobile-filter-btn" onClick={() => setShowFilters((v) => !v)}>
              <IconFilter width={15} height={15} /> ফিল্টার
            </button>
            <select className="select" style={{ width: 'auto' }} value={query.sort} onChange={(e) => patch({ sort: e.target.value })}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {!loading && !error && (
            <p className="mute-2" style={{ marginBottom: 12 }}>
              মোট {toBn(data.meta?.total || 0)} টি প্রোডাক্ট পাওয়া গেছে
            </p>
          )}

          {loading && <SkeletonGrid count={9} />}
          {error && !loading && <ErrorBox message={error} onRetry={() => patch({})} />}
          {!loading && !error && data.items.length === 0 && (
            <Empty
              title="কোনো প্রোডাক্ট মেলেনি"
              text="ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।"
              action={
                <button type="button" className="btn btn--soft btn--sm" style={{ marginTop: 14 }} onClick={reset}>
                  ফিল্টার রিসেট
                </button>
              }
            />
          )}

          {!loading && !error && data.items.length > 0 && (
            <>
              <div className="grid-products grid-products--wide">
                {data.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination
                page={data.meta?.page || 1}
                totalPages={data.meta?.totalPages || 1}
                onChange={(p) => {
                  patch({ page: p }, false);
                  window.scrollTo({ top: 220, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;
