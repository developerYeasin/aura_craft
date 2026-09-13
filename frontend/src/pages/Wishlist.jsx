import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/index.js';
import { useWishlist } from '../hooks/useWishlist.js';
import { useI18n } from '../i18n/index.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { IconHeart } from '../components/ui/Icons.jsx';
import { Empty, SkeletonGrid, SectionHead } from '../components/ui/index.jsx';

const Wishlist = () => {
  const { ids } = useWishlist();
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(ids.map((id) => productApi.get(id).then((r) => r.data).catch(() => null)))
      .then((list) => setProducts(list.filter(Boolean)))
      .finally(() => setLoading(false));
  }, [ids]);

  return (
    <div className="container section--tight">
      <SectionHead center eyebrow="Saved" title={t('wishlist.title')} text={t('wishlist.text')} />

      {loading && <SkeletonGrid count={4} />}
      {!loading && products.length === 0 && (
        <Empty
          icon={IconHeart}
          title={t('wishlist.empty')}
          text={t('wishlist.emptyText')}
          action={
            <Link to="/products" className="btn btn--primary btn--sm" style={{ marginTop: 14 }}>
              {t('wishlist.browse')}
            </Link>
          }
        />
      )}
      {!loading && products.length > 0 && (
        <div className="grid-products grid-products--wide">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
