import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/index.js';
import { useWishlist } from '../hooks/useWishlist.js';
import ProductCard from '../components/product/ProductCard.jsx';
import { IconHeart } from '../components/ui/Icons.jsx';
import { Empty, SkeletonGrid, SectionHead } from '../components/ui/index.jsx';

const Wishlist = () => {
  const { ids } = useWishlist();
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
      <SectionHead center eyebrow="Saved" title="পছন্দের তালিকা" text="আপনার সংরক্ষিত প্রোডাক্টগুলো" />

      {loading && <SkeletonGrid count={4} />}
      {!loading && products.length === 0 && (
        <Empty
          icon={IconHeart}
          title="তালিকা খালি"
          text="প্রোডাক্ট কার্ডের হার্ট আইকনে ক্লিক করে পছন্দের প্রোডাক্ট সংরক্ষণ করুন।"
          action={
            <Link to="/products" className="btn btn--primary btn--sm" style={{ marginTop: 14 }}>
              প্রোডাক্ট দেখুন
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
