import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { productApi, categoryApi } from '../api/index.js';
import { useI18n } from '../i18n/index.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { Empty, ErrorBox, Pagination, SkeletonGrid, SectionHead } from '../components/ui/index.jsx';
import { IconSearch, IconFilter } from '../components/ui/Icons.jsx';
import { money, toBn } from '../utils/format.js';

const SORTS = [
  ['newest', 'catalog.sortNewest'],
  ['price_asc', 'catalog.sortPriceAsc'],
  ['price_desc', 'catalog.sortPriceDesc'],
  ['rating', 'catalog.sortRating'],
  ['name_asc', 'catalog.sortName'],
  ['featured', 'catalog.sortFeatured'],
];

const PRICE_BUCKETS = [
  { min: 0, max: 1000 },
  { min: 1000, max: 2000 },
  { min: 2000, max: 5000 },
  { min: 5000, max: undefined },
];

/** Shared listing page: /products (all) and /category/:slug (single category). */
const CatalogPage = ({ mode = 'all' }) => {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { t, localName } = useI18n();

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

  const bucketLabel = (b) => (b.max ? `${money(b.min)} – ${money(b.max)}` : `${money(b.min)}+`);

  const reset = () => setParams(new URLSearchParams());

  const title = mode === 'category' ? (category ? localName(category) : t('catalog.collection')) : t('catalog.allProducts');
  const banner = category?.banner_url || category?.image_url;

  const filterPanel = (
    <aside className="card card--pad filters">
      <div className="spread" style={{ marginBottom: 14 }}>
        <h4 style={{ margin: 0 }}>{t('catalog.filters')}</h4>
        <button type="button" className="btn btn--xs btn--ghost" onClick={reset}>
          {t('catalog.reset')}
        </button>
      </div>

      <div className="filters__group">
        <h4>{t('catalog.price')}</h4>
        {PRICE_BUCKETS.map((b) => (
          <label className="checkbox" key={b.min}>
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
            {bucketLabel(b)}
          </label>
        ))}
      </div>

      {facets.materials?.length > 0 && (
        <div className="filters__group">
          <h4>{t('catalog.material')}</h4>
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
          <h4>{t('catalog.color')}</h4>
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
        <h4>{t('catalog.stock')}</h4>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={params.get('inStock') === 'true'}
            onChange={(e) => patch({ inStock: e.target.checked ? 'true' : undefined })}
          />
          {t('catalog.inStockOnly')}
        </label>
      </div>

      {facets.priceRange?.min_price != null && (
        <p className="mute-2" style={{ margin: 0 }}>
          {t('catalog.priceRange', { min: money(facets.priceRange.min_price), max: money(facets.priceRange.max_price) })}
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
              {title} <span className="grad-text">{t('catalog.collection')}</span>
            </h1>
            <p className="muted" style={{ margin: 0 }}>{category?.description}</p>
            <span className="badge badge--solid" style={{ marginTop: 6 }}>
              {t('home.nProducts', { n: toBn(data.meta?.total || 0) })}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ paddingTop: 40 }}>
          <SectionHead center eyebrow="Catalog" title={title} text={t('catalog.subtitle')} />
        </div>
      )}

      <nav className="crumbs">
        <Link to="/">{t('common.home')}</Link> <span>›</span>
        <span>{title}</span>
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
                placeholder={t('catalog.searchPh')}
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
              />
            </form>
            <button type="button" className="btn btn--sm mobile-filter-btn" onClick={() => setShowFilters((v) => !v)}>
              <IconFilter width={15} height={15} /> {t('catalog.filters')}
            </button>
            <select className="select" style={{ width: 'auto' }} value={query.sort} onChange={(e) => patch({ sort: e.target.value })}>
              {SORTS.map(([value, key]) => (
                <option key={value} value={value}>
                  {t(key)}
                </option>
              ))}
            </select>
          </div>

          {!loading && !error && (
            <p className="mute-2" style={{ marginBottom: 12 }}>
              {t('catalog.found', { n: toBn(data.meta?.total || 0) })}
            </p>
          )}

          {loading && <SkeletonGrid count={9} />}
          {error && !loading && <ErrorBox message={error} onRetry={() => patch({})} />}
          {!loading && !error && data.items.length === 0 && (
            <Empty
              title={t('catalog.noMatch')}
              text={t('catalog.noMatchText')}
              action={
                <button type="button" className="btn btn--soft btn--sm" style={{ marginTop: 14 }} onClick={reset}>
                  {t('catalog.resetFilters')}
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
