import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/index.js';
import { Loader, ErrorBox } from '../../components/ui/index.jsx';
import {
  IconGem, IconReceipt, IconUsers, IconWallet, IconClock, IconAlert,
  IconRefresh, IconArrowRight, IconTrendUp,
} from '../../components/ui/Icons.jsx';
import { money, toBn, formatDate, ORDER_STATUS } from '../../utils/format.js';

/** Tiny inline area sparkline from a numeric series. */
const Sparkline = ({ values, color = 'var(--pink)' }) => {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = 100 / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${34 - (v / max) * 30}`);
  const id = `sp-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg className="stat__spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.42" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,34 ${pts.join(' ')} 100,34`} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    dashboardApi
      .stats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <Loader />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  const t = stats.totals;
  const trend = stats.salesTrend || [];
  const revenueSeries = trend.map((d) => Number(d.revenue));
  const orderSeries = trend.map((d) => Number(d.orders));

  const cards = [
    { Icon: IconGem, label: 'Total Products', value: toBn(t.total_products) },
    { Icon: IconReceipt, label: 'Total Orders', value: toBn(t.total_orders), spark: orderSeries },
    { Icon: IconUsers, label: 'Total Customers', value: toBn(t.total_customers) },
    { Icon: IconWallet, label: 'Total Revenue', value: money(t.total_revenue), spark: revenueSeries },
    { Icon: IconClock, label: 'Pending Orders', value: toBn(t.pending_orders) },
    { Icon: IconAlert, label: 'Low Stock', value: toBn(t.low_stock) },
  ];

  const maxRevenue = Math.max(1, ...revenueSeries);
  const maxCat = Math.max(1, ...stats.categoryBreakdown.map((x) => x.product_count));
  const weekRevenue = revenueSeries.slice(-7).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="admin__top">
        <div>
          <span className="eyebrow">Overview</span>
          <h1 className="display t-h2" style={{ marginTop: 6 }}>Admin Dashboard</h1>
          <p className="mute-2" style={{ margin: 0 }}>স্টোরের সর্বশেষ পরিসংখ্যান</p>
        </div>
        <div className="row gap-8 wrap">
          <span className="chip">
            <IconTrendUp width={14} height={14} />
            গত ৭ দিনে {money(weekRevenue)}
          </span>
          <button type="button" className="btn btn--outline btn--sm" onClick={load}>
            <IconRefresh width={14} height={14} /> রিফ্রেশ
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div className="card stat" key={c.label}>
            <div className="stat__ico">
              <c.Icon width={20} height={20} />
            </div>
            <div className="stat__value">{c.value}</div>
            <div className="stat__label">{c.label}</div>
            {c.spark?.length > 1 && <Sparkline values={c.spark} />}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card card--pad">
          <div className="spread" style={{ marginBottom: 4 }}>
            <h3 className="t-h3" style={{ fontSize: 17 }}>গত ১৪ দিনের বিক্রি</h3>
            <span className="badge badge--gold">{money(revenueSeries.reduce((a, b) => a + b, 0))}</span>
          </div>
          <span className="mute-2">দৈনিক রেভিনিউ</span>
          {trend.length === 0 ? (
            <p className="mute-2" style={{ marginTop: 18 }}>এখনো কোনো অর্ডার নেই।</p>
          ) : (
            <div className="chart-bars">
              {trend.map((d) => (
                <div className="chart-bars__col" key={d.day} title={`${d.day} — ${money(d.revenue)}`}>
                  <div className="chart-bars__bar" style={{ height: `${(Number(d.revenue) / maxRevenue) * 100}%` }} />
                  <span className="chart-bars__label">{new Date(d.day).getDate()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card--pad">
          <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 16 }}>ক্যাটাগরি অনুযায়ী প্রোডাক্ট</h3>
          {stats.categoryBreakdown.map((c) => (
            <div key={c.name} style={{ marginBottom: 13 }}>
              <div className="spread" style={{ fontSize: 13 }}>
                <span>{c.name_bn || c.name}</span>
                <span className="mute-2 num">{toBn(c.product_count)}</span>
              </div>
              <div className="meter">
                <i style={{ width: `${(c.product_count / maxCat) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16 }}>
        <div>
          <div className="spread" style={{ marginBottom: 14 }}>
            <h3 className="t-h3" style={{ fontSize: 17 }}>Recent Orders</h3>
            <Link to="/admin/orders" className="link-arrow">
              সব দেখুন <IconArrowRight width={13} height={13} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 460 }}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.length === 0 && (
                  <tr><td colSpan={4} className="mute-2">কোনো অর্ডার নেই</td></tr>
                )}
                {stats.recentOrders.map((o) => {
                  const s = ORDER_STATUS[o.status];
                  return (
                    <tr key={o.id}>
                      <td>
                        <span className="num">{o.order_code}</span>
                        <div className="mute-2">{o.first_product || '—'}</div>
                      </td>
                      <td>{o.customer_name}</td>
                      <td><span className={`badge ${s.badge}`}>{s.label}</span></td>
                      <td className="mute-2 num">{formatDate(o.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>Top Products</h3>
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 340 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProducts.length === 0 && (
                  <tr><td colSpan={3} className="mute-2">এখনো কোনো বিক্রি হয়নি</td></tr>
                )}
                {stats.topProducts.map((p) => (
                  <tr key={p.product_name}>
                    <td>{p.product_name}</td>
                    <td className="num">{toBn(p.sold)}</td>
                    <td className="num">{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
