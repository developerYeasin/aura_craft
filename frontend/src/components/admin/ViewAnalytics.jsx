import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { viewApi } from '../../api/index.js';
import { IconEye, IconGem, IconUsers, IconArrowRight, IconBox } from '../ui/Icons.jsx';
import { enNum, formatDate } from '../../utils/format.js';

const avatar = (name) =>
  `https://ui-avatars.com/api/?background=2b1b45&color=fff&name=${encodeURIComponent(name || '?')}`;

/** Product + team profile view analytics for the admin dashboard. */
const ViewAnalytics = ({ range = 14, refreshKey = 0 }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    viewApi
      .summary({ days: range })
      .then((res) => {
        if (!alive) return;
        setData(res.data);
        setError(null);
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [range, refreshKey]);

  if (error && !data) {
    return <p className="field-error" style={{ margin: '0 0 20px' }}>ভিউ অ্যানালিটিক্স লোড হয়নি: {error}</p>;
  }
  if (!data) return null;

  const { totals = {}, topProducts = [], topTeam = [], daily = [] } = data;
  const maxDaily = Math.max(1, ...daily.map((d) => d.product_views + d.team_views));
  const maxProduct = Math.max(1, ...topProducts.map((p) => Number(p.view_count)));
  const maxTeam = Math.max(1, ...topTeam.map((m) => Number(m.profile_view_count)));

  const cards = [
    { Icon: IconGem, label: 'মোট প্রোডাক্ট ভিউ', value: totals.product_views },
    { Icon: IconUsers, label: 'মোট টিম প্রোফাইল ভিউ', value: totals.team_views },
    { Icon: IconEye, label: `ইউনিক ভিজিটর (${enNum(data.range)} দিন)`, value: totals.unique_visitors },
  ];

  return (
    <section className="views-analytics" aria-label="ভিউ অ্যানালিটিক্স">
      <div style={{ margin: '4px 0 14px' }}>
        <span className="eyebrow">Analytics</span>
        <h3 className="t-h3" style={{ fontSize: 19, marginTop: 4 }}>ভিউ অ্যানালিটিক্স</h3>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="card stat">
            <div className="stat__ico"><c.Icon width={19} height={19} /></div>
            <div className="stat__value">{enNum(c.value || 0)}</div>
            <div className="stat__label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="card card--pad" style={{ marginBottom: 20 }}>
        <div className="spread wrap" style={{ marginBottom: 4, gap: 8 }}>
          <h3 className="t-h3" style={{ fontSize: 17 }}>সময় অনুযায়ী ভিউ</h3>
          <span className="views-legend">
            <i className="is-product" /> প্রোডাক্ট <i className="is-team" /> টিম
          </span>
        </div>
        {daily.length === 0 ? (
          <p className="mute-2" style={{ marginTop: 14 }}>এই সময়ে কোনো ভিউ নেই।</p>
        ) : (
          <div className="chart-bars">
            {daily.map((d) => (
              <div
                className="chart-bars__col"
                key={d.day}
                title={`${formatDate(d.day)} — প্রোডাক্ট ${enNum(d.product_views)} · টিম ${enNum(d.team_views)}`}
              >
                <div className="views-stack" style={{ height: `${((d.product_views + d.team_views) / maxDaily) * 100}%` }}>
                  {d.team_views > 0 && <span className="is-team" style={{ flexGrow: d.team_views }} />}
                  {d.product_views > 0 && <span className="is-product" style={{ flexGrow: d.product_views }} />}
                </div>
                <span className="chart-bars__label">{new Date(d.day).getDate()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-grid" style={{ marginBottom: 20 }}>
        <div className="card card--pad">
          <div className="spread" style={{ marginBottom: 14 }}>
            <h3 className="t-h3" style={{ fontSize: 17 }}>সবচেয়ে বেশি দেখা প্রোডাক্ট</h3>
            <Link to="/admin/products" className="link-arrow">
              প্রোডাক্ট <IconArrowRight width={13} height={13} />
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <p className="mute-2" style={{ margin: 0 }}>এখনো কোনো প্রোডাক্ট ভিউ নেই।</p>
          ) : (
            <ul className="rank">
              {topProducts.map((p) => (
                <li key={p.id}>
                  <div className="views-row">
                    {p.image
                      ? <img className="table-thumb" src={p.image} alt="" loading="lazy" />
                      : <span className="table-thumb views-thumb"><IconBox width={16} height={16} /></span>}
                    <div className="views-row__text">
                      <b>{p.name}</b>
                      <span className="mute-2">{p.is_active ? 'Active' : 'Hidden'} · স্টক {enNum(p.stock)}</span>
                      <div className="meter"><i style={{ width: `${(Number(p.view_count) / maxProduct) * 100}%` }} /></div>
                    </div>
                  </div>
                  <span className="badge badge--gold num"><IconEye width={12} height={12} /> {enNum(p.view_count)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card card--pad">
          <div className="spread" style={{ marginBottom: 14 }}>
            <h3 className="t-h3" style={{ fontSize: 17 }}>সবচেয়ে বেশি দেখা টিম প্রোফাইল</h3>
            <Link to="/admin/team" className="link-arrow">
              টিম <IconArrowRight width={13} height={13} />
            </Link>
          </div>
          {topTeam.length === 0 ? (
            <p className="mute-2" style={{ margin: 0 }}>এখনো কোনো প্রোফাইল ভিউ নেই।</p>
          ) : (
            <ul className="rank">
              {topTeam.map((m) => (
                <li key={m.id}>
                  <div className="views-row">
                    <img className="table-thumb" style={{ borderRadius: '50%' }} src={m.photo_url || avatar(m.name)} alt="" loading="lazy" />
                    <div className="views-row__text">
                      <b>{m.name}</b>
                      <span className="mute-2">{[m.role, m.tag].filter(Boolean).join(' · ')}</span>
                      <div className="meter"><i style={{ width: `${(Number(m.profile_view_count) / maxTeam) * 100}%` }} /></div>
                    </div>
                  </div>
                  <span className="badge badge--gold num"><IconEye width={12} height={12} /> {enNum(m.profile_view_count)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default ViewAnalytics;
