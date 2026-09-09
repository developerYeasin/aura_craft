import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orderApi } from '../api/index.js';
import OrderSummaryCard from '../components/product/OrderSummaryCard.jsx';
import { Empty, Field, SectionHead } from '../components/ui/index.jsx';
import { ORDER_STATUS } from '../utils/format.js';
import { IconSearch } from '../components/ui/Icons.jsx';

const FLOW = ['pending', 'processing', 'shipped', 'delivered'];

const TrackOrder = () => {
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = async (value) => {
    const trimmed = (value ?? code).trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await orderApi.track(trimmed);
      setOrder(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = params.get('code');
    if (initial) search(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageIndex = order ? FLOW.indexOf(order.status) : -1;

  return (
    <div className="container section--tight">
      <SectionHead center eyebrow="Track" title="অর্ডার ট্র্যাকিং" text="অর্ডার কোড দিয়ে আপনার অর্ডারের সর্বশেষ অবস্থা দেখুন" />

      <div className="card card--pad" style={{ maxWidth: 560, margin: '0 auto 24px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParams(code ? { code } : {});
            search();
          }}
        >
          <Field label="অর্ডার কোড" required>
            <input className="input" placeholder="AC-XXXXXXXX" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? 'খোঁজা হচ্ছে…' : 'ট্র্যাক করুন'}
          </button>
        </form>
      </div>

      {error && <Empty icon={IconSearch} title="অর্ডার পাওয়া যায়নি" text={error} />}

      {order && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {order.status !== 'cancelled' && (
            <div className="steps" style={{ marginBottom: 20 }}>
              {FLOW.map((s, i) => (
                <span key={s} style={{ display: 'contents' }}>
                  {i > 0 && <span className="steps__bar" />}
                  <span className={`steps__item${i <= stageIndex ? ' is-done' : ''}`}>
                    <span className="steps__num">{i <= stageIndex ? '✓' : i + 1}</span>
                    {ORDER_STATUS[s].bn}
                  </span>
                </span>
              ))}
            </div>
          )}
          <OrderSummaryCard order={order} />
        </div>
      )}
    </div>
  );
};

export default TrackOrder;
