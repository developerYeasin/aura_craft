import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { orderApi } from '../api/index.js';
import { Loader, ErrorBox } from '../components/ui/index.jsx';
import { IconBadgeCheck, IconArrowRight } from '../components/ui/Icons.jsx';
import OrderSummaryCard from '../components/product/OrderSummaryCard.jsx';

const OrderSuccess = () => {
  const { code } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (order) return;
    orderApi
      .track(code)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [code, order]);

  if (loading) return <div className="container"><Loader /></div>;
  if (error) return <div className="container"><ErrorBox message={error} /></div>;

  return (
    <div className="container section--tight">
      <div className="card card--pad text-center" style={{ maxWidth: 620, margin: '0 auto 22px' }}>
        <div className="feature__ico" style={{ margin: '0 auto 18px', width: 58, height: 58, color: 'var(--ok)', background: 'rgba(61,220,151,.14)', borderColor: 'rgba(61,220,151,.3)' }}>
          <IconBadgeCheck width={26} height={26} />
        </div>
        <span className="eyebrow eyebrow--both">Order Confirmed</span>
        <h1 className="display t-h2" style={{ margin: '10px 0 10px' }}>ধন্যবাদ! অর্ডার সম্পন্ন হয়েছে</h1>
        <p className="muted">
          আপনার অর্ডার কোড <b className="gold-text num">{order.order_code}</b> — এটি সংরক্ষণ করে রাখুন।
          আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।
        </p>
        <div className="row gap-8" style={{ justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          <Link to="/products" className="btn btn--primary btn--sm">
            আরও কেনাকাটা <IconArrowRight width={14} height={14} />
          </Link>
          <Link to={`/track?code=${order.order_code}`} className="btn btn--sm">অর্ডার ট্র্যাক</Link>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <OrderSummaryCard order={order} />
      </div>
    </div>
  );
};

export default OrderSuccess;
