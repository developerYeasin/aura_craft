import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/index.js';
import { Loader, ErrorBox } from '../../components/ui/index.jsx';
import {
  IconGem, IconReceipt, IconUsers, IconWallet, IconClock, IconAlert,
  IconRefresh, IconArrowRight, IconTrendUp, IconTruck, IconBox, IconStore,
} from '../../components/ui/Icons.jsx';
import { enMoney, enNum, formatDate, ORDER_STATUS } from '../../utils/format.js';

const RANGES = [
  { days: 7, label: '7 দিন' },
  { days: 14, label: '14 দিন' },
  { days: 30, label: '30 দিন' },
  { days: 90, label: '90 দিন' },
];

const PAYMENT_LABEL = { cod: 'ক্যাশ অন ডেলিভারি', bkash: 'বিকাশ', nagad: 'নগদ' };
const AREA_LABEL = { inside_dhaka: 'ঢাকার ভেতরে', outside_dhaka: 'ঢাকার বাইরে' };

/** Percentage change against the previous window; null when there is no baseline. */
const delta = (now, before) => {
  const a = Number(now) || 0;
  const b = Number(before) || 0;
  if (b === 0) return a > 0 ? { pct: 100, up: true, fresh: true } : null;
  const pct = ((a - b) / b) * 100;
  return { pct: Math.abs(Math.round(pct)), up: pct >= 0, fresh: false };
};

const DeltaChip = ({ change, suffix = 'আগের সময়ের তুলনায়' }) => {
  if (!change) return null;
  return (
    <span className={`delta${change.up ? ' delta--up' : ' delta--down'}`}>
      {change.up ? '▲' : '▼'} {enNum(change.pct)}%
      <em>{change.fresh ? 'নতুন' : suffix}</em>
    </span>
  );
};

/** Tiny inline area sparkline from a numeric series. */
const Sparkline = ({ values, color = 'var(--accent)' }) => {
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

/** Horizontal share bar used by the payment / delivery breakdowns. */
const SplitRow = ({ label, count, value, total }) => (
  <div className="split">
    <div className="spread" style={{ fontSize: 13 }}>
      <span>{label}</span>
      <span className="mute-2 num">{enNum(count)} টি · {enMoney(value)}</span>
    </div>
    <div className="meter">
      <i style={{ width: `${total ? (Number(count) / total) * 100 : 0}%` }} />
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [range, setRange] = useState(14);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    (days = range, { quiet = false } = {}) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError(null);
      dashboardApi
        .stats({ days })
        .then((res) => setStats(res.data))
        .catch((err) => setError(err.message))
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [range]
  );

  useEffect(() => {
    load(range, { quiet: Boolean(stats) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  if (loading) return <Loader />;
  if (error && !stats) return <ErrorBox message={error} onRetry={() => load()} />;

  // Fall back gracefully if the API is still an older build without the new
  // blocks — the frontend and backend are deployed separately.
  const t = stats.totals || {};
  const trend = stats.salesTrend || [];
  const ordersByStatus = stats.ordersByStatus || [];
  const categoryBreakdown = stats.categoryBreakdown || [];
  const recentOrders = stats.recentOrders || [];
  const topProducts = stats.topProducts || [];
  const lowStockList = stats.lowStockList || [];
  const topCustomers = stats.topCustomers || [];
  const paymentSplit = stats.paymentSplit || [];
  const deliverySplit = stats.deliverySplit || [];
  const revenueSeries = trend.map((d) => Number(d.revenue));
  const orderSeries = trend.map((d) => Number(d.orders));
  const rangeRevenue = revenueSeries.reduce((a, b) => a + b, 0);

  const revenueDelta = delta(stats.period?.revenue, stats.period?.prev_revenue);
  const ordersDelta = delta(stats.period?.orders, stats.period?.prev_orders);

  const cards = [
    {
      Icon: IconStore,
      label: 'আজকের বিক্রি',
      value: enMoney(t.today_revenue),
      foot: `${enNum(t.today_orders)} টি অর্ডার আজ`,
    },
    {
      Icon: IconWallet,
      label: `${RANGES.find((r) => r.days === range)?.label} এর বিক্রি`,
      value: enMoney(stats.period?.revenue || 0),
      change: revenueDelta,
      spark: revenueSeries,
    },
    {
      Icon: IconReceipt,
      label: 'অর্ডার (এই সময়ে)',
      value: enNum(stats.period?.orders || 0),
      change: ordersDelta,
      spark: orderSeries,
    },
    {
      Icon: IconTrendUp,
      label: 'গড় অর্ডার ভ্যালু',
      value: enMoney(t.avg_order_value),
      foot: `সর্বমোট ${enMoney(t.total_revenue)}`,
    },
    {
      Icon: IconClock,
      label: 'চলমান অর্ডার',
      value: enNum(t.pending_orders),
      foot: `${enMoney(t.open_value)} আটকে আছে`,
      to: '/admin/orders?status=pending',
      tone: Number(t.pending_orders) > 0 ? 'warn' : null,
    },
    {
      Icon: IconAlert,
      label: 'স্টক অ্যালার্ট',
      value: enNum(t.low_stock),
      foot: Number(t.out_of_stock) > 0 ? `${enNum(t.out_of_stock)} টি স্টক শেষ` : 'সব স্টকে আছে',
      to: '/admin/products',
      tone: Number(t.out_of_stock) > 0 ? 'danger' : Number(t.low_stock) > 0 ? 'warn' : null,
    },
  ];

  const maxRevenue = Math.max(1, ...revenueSeries);
  const maxCatRevenue = Math.max(1, ...categoryBreakdown.map((c) => Number(c.revenue)));
  const pipelineTotal = ordersByStatus.reduce((sum, s) => sum + Number(s.count), 0);
  const paymentTotal = paymentSplit.reduce((sum, p) => sum + Number(p.count), 0);
  const deliveryTotal = deliverySplit.reduce((sum, d) => sum + Number(d.count), 0);

  return (
    <>
      <div className="admin__top">
        <div>
          <span className="eyebrow">Overview</span>
          <h1 className="display t-h2" style={{ marginTop: 6 }}>Admin Dashboard</h1>
          <p className="mute-2" style={{ margin: 0 }}>
            স্টোরের সর্বশেষ পরিসংখ্যান
            {stats.generated_at && (
              <> · আপডেট {new Date(stats.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </p>
        </div>
        <div className="row gap-8 wrap">
          <div className="seg" role="group" aria-label="সময়সীমা">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                className={`seg__btn${range === r.days ? ' is-on' : ''}`}
                onClick={() => setRange(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => load(range, { quiet: true })} disabled={refreshing}>
            <IconRefresh width={14} height={14} /> {refreshing ? 'লোড হচ্ছে…' : 'রিফ্রেশ'}
          </button>
        </div>
      </div>

      {error && (
        <p className="field-error" style={{ marginBottom: 14 }}>রিফ্রেশ করা যায়নি: {error}</p>
      )}

      <div className="stat-grid">
        {cards.map((c) => {
          const Wrap = c.to ? Link : 'div';
          return (
            <Wrap
              key={c.label}
              {...(c.to ? { to: c.to } : {})}
              className={`card stat${c.tone ? ` stat--${c.tone}` : ''}${c.to ? ' stat--link' : ''}`}
            >
              <div className="stat__ico">
                <c.Icon width={19} height={19} />
              </div>
              <div className="stat__value">{c.value}</div>
              <div className="stat__label">{c.label}</div>
              {c.change && <DeltaChip change={c.change} />}
              {c.foot && !c.change && <div className="stat__foot">{c.foot}</div>}
              {c.spark?.length > 1 && <Sparkline values={c.spark} />}
            </Wrap>
          );
        })}
      </div>

      {/* ---------------------------------------------------- order pipeline */}
      <div className="card card--pad" style={{ marginBottom: 20 }}>
        <div className="spread" style={{ marginBottom: 14 }}>
          <h3 className="t-h3" style={{ fontSize: 17 }}>অর্ডার পাইপলাইন</h3>
          <Link to="/admin/orders" className="link-arrow">
            সব অর্ডার <IconArrowRight width={13} height={13} />
          </Link>
        </div>
        <div className="pipeline">
          {ordersByStatus.map((s) => {
            const meta = ORDER_STATUS[s.status] || { bn: s.status, badge: '' };
            const share = pipelineTotal ? (Number(s.count) / pipelineTotal) * 100 : 0;
            return (
              <Link key={s.status} to={`/admin/orders?status=${s.status}`} className="pipeline__step">
                <span className={`badge ${meta.badge}`}>{meta.bn}</span>
                <b className="num">{enNum(s.count)}</b>
                <span className="mute-2 num">{enMoney(s.value)}</span>
                <div className="meter"><i style={{ width: `${share}%` }} /></div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------- charts */}
      <div className="dash-grid" style={{ marginBottom: 20 }}>
        <div className="card card--pad">
          <div className="spread" style={{ marginBottom: 4 }}>
            <h3 className="t-h3" style={{ fontSize: 17 }}>গত {RANGES.find((r) => r.days === range)?.label}ের বিক্রি</h3>
            <span className="badge badge--gold">{enMoney(rangeRevenue)}</span>
          </div>
          <span className="mute-2">দৈনিক রেভিনিউ</span>
          {trend.length === 0 ? (
            <p className="mute-2" style={{ marginTop: 18 }}>এই সময়ে কোনো অর্ডার নেই।</p>
          ) : (
            <div className="chart-bars">
              {trend.map((d) => (
                <div
                  className="chart-bars__col"
                  key={d.day}
                  title={`${formatDate(d.day)} — ${enMoney(d.revenue)} · ${enNum(d.orders)} টি অর্ডার`}
                >
                  <div className="chart-bars__bar" style={{ height: `${(Number(d.revenue) / maxRevenue) * 100}%` }} />
                  <span className="chart-bars__label">{new Date(d.day).getDate()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card--pad">
          <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 16 }}>ক্যাটাগরি অনুযায়ী বিক্রি</h3>
          {categoryBreakdown.map((c) => (
            <div key={c.name} style={{ marginBottom: 13 }}>
              <div className="spread" style={{ fontSize: 13 }}>
                <span>{c.name_bn || c.name}</span>
                <span className="mute-2 num">{enMoney(c.revenue)}</span>
              </div>
              <div className="meter">
                <i style={{ width: `${(Number(c.revenue) / maxCatRevenue) * 100}%` }} />
              </div>
              <span className="faint" style={{ fontSize: 11 }}>{enNum(c.product_count)} টি প্রোডাক্ট</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------- stock + customers */}
      <div className="dash-grid" style={{ marginBottom: 20 }}>
        <div className="card card--pad">
          <div className="spread" style={{ marginBottom: 14 }}>
            <h3 className="t-h3" style={{ fontSize: 17 }}>স্টক শেষের পথে</h3>
            <Link to="/admin/products" className="link-arrow">
              প্রোডাক্ট <IconArrowRight width={13} height={13} />
            </Link>
          </div>
          {lowStockList.length === 0 ? (
            <p className="mute-2" style={{ margin: 0 }}>সব প্রোডাক্টের স্টক ঠিক আছে।</p>
          ) : (
            <ul className="rank">
              {lowStockList.map((p) => (
                <li key={p.id}>
                  <div>
                    <b>{p.name}</b>
                    <span className="mute-2">{p.category_bn || p.category || '—'}</span>
                  </div>
                  <span className={`badge ${Number(p.stock) <= 0 ? 'badge--danger' : 'badge--warn'}`}>
                    {Number(p.stock) <= 0 ? 'স্টক নেই' : `${enNum(p.stock)} টি বাকি`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card card--pad">
          <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>সেরা কাস্টমার</h3>
          {topCustomers.length === 0 ? (
            <p className="mute-2" style={{ margin: 0 }}>এখনো কোনো কাস্টমার নেই।</p>
          ) : (
            <ul className="rank">
              {topCustomers.map((c) => (
                <li key={c.customer_phone}>
                  <div>
                    <b>{c.customer_name}</b>
                    <span className="mute-2 num">{c.customer_phone} · {enNum(c.orders)} টি অর্ডার</span>
                  </div>
                  <span className="num">{enMoney(c.spent)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- splits */}
      <div className="dash-grid" style={{ marginBottom: 20 }}>
        <div className="card card--pad">
          <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>
            <IconWallet width={15} height={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--accent)' }} />
            পেমেন্ট মাধ্যম
          </h3>
          {paymentSplit.length === 0 ? (
            <p className="mute-2" style={{ margin: 0 }}>ডেটা নেই।</p>
          ) : (
            paymentSplit.map((p) => (
              <SplitRow key={p.method} label={PAYMENT_LABEL[p.method] || p.method} count={p.count} value={p.value} total={paymentTotal} />
            ))
          )}
        </div>

        <div className="card card--pad">
          <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>
            <IconTruck width={15} height={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--accent)' }} />
            ডেলিভারি এলাকা
          </h3>
          {deliverySplit.length === 0 ? (
            <p className="mute-2" style={{ margin: 0 }}>ডেটা নেই।</p>
          ) : (
            deliverySplit.map((d) => (
              <SplitRow key={d.area} label={AREA_LABEL[d.area] || d.area} count={d.count} value={d.value} total={deliveryTotal} />
            ))
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- tables */}
      <div className="dash-grid">
        <div>
          <div className="spread" style={{ marginBottom: 14 }}>
            <h3 className="t-h3" style={{ fontSize: 17 }}>সাম্প্রতিক অর্ডার</h3>
            <Link to="/admin/orders" className="link-arrow">
              সব দেখুন <IconArrowRight width={13} height={13} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 && (
                  <tr><td colSpan={5} className="mute-2">কোনো অর্ডার নেই</td></tr>
                )}
                {recentOrders.map((o) => {
                  const s = ORDER_STATUS[o.status];
                  return (
                    <tr key={o.id}>
                      <td>
                        <span className="num">{o.order_code}</span>
                        <div className="mute-2">
                          {o.first_product || '—'}
                          {Number(o.item_count) > 1 && ` +${enNum(Number(o.item_count) - 1)}`}
                        </div>
                      </td>
                      <td>
                        {o.customer_name}
                        <div className="mute-2 num">{o.customer_phone}</div>
                      </td>
                      <td className="num">{enMoney(o.total)}</td>
                      <td><span className={`badge ${s.badge}`}>{s.bn}</span></td>
                      <td className="mute-2 num">{formatDate(o.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="spread" style={{ marginBottom: 14 }}>
            <h3 className="t-h3" style={{ fontSize: 17 }}>সেরা প্রোডাক্ট</h3>
            <Link to="/admin/products" className="link-arrow">
              সব দেখুন <IconArrowRight width={13} height={13} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 360 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 && (
                  <tr><td colSpan={3} className="mute-2">এখনো কোনো বিক্রি হয়নি</td></tr>
                )}
                {topProducts.map((p) => (
                  <tr key={p.product_name}>
                    <td>
                      <div className="row gap-8">
                        {p.product_image
                          ? <img className="table-thumb" src={p.product_image} alt="" loading="lazy" />
                          : (
                            <span className="table-thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--text-faint)' }}>
                              <IconBox width={16} height={16} />
                            </span>
                          )}
                        <span>{p.product_name}</span>
                      </div>
                    </td>
                    <td className="num">{enNum(p.sold)}</td>
                    <td className="num">{enMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <Link to="/admin/products" className="btn btn--sm"><IconGem width={14} height={14} /> নতুন প্রোডাক্ট</Link>
        <Link to="/admin/categories" className="btn btn--sm"><IconBox width={14} height={14} /> ক্যাটাগরি</Link>
        <Link to="/admin/orders?status=pending" className="btn btn--sm"><IconClock width={14} height={14} /> পেন্ডিং অর্ডার</Link>
        <Link to="/admin/team" className="btn btn--sm"><IconUsers width={14} height={14} /> টিম</Link>
      </div>
    </>
  );
};

export default Dashboard;
