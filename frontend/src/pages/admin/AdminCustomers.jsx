import { useEffect, useMemo, useState } from 'react';
import { customerApi } from '../../api/index.js';
import { Loader, ErrorBox, Modal, Pagination, Empty } from '../../components/ui/index.jsx';
import { IconEye, IconSearch, IconUsers } from '../../components/ui/Icons.jsx';
import { enMoney, enNum, enPercent, formatDate, formatDateTime, ORDER_STATUS } from '../../utils/format.js';

const SORTS = [
  { key: 'spent', label: 'সবচেয়ে বেশি খরচ' },
  { key: 'orders', label: 'সবচেয়ে বেশি অর্ডার' },
  { key: 'recent', label: 'সাম্প্রতিক' },
  { key: 'name', label: 'নাম (A→Z)' },
];

/** Ratio comes from the courier cache; a customer with no parcel history shows "—". */
const Ratio = ({ value, parcels }) => {
  if (!parcels || !Number(parcels)) return <span className="faint">—</span>;
  const ratio = Number(value);
  const tone = ratio >= 90 ? 'badge--ok' : ratio >= 60 ? 'badge--warn' : 'badge--danger';
  return <span className={`badge ${tone} num`}>{enPercent(ratio)}</span>;
};

const AdminCustomers = () => {
  const [data, setData] = useState({ items: [], meta: { page: 1, totalPages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('spent');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [detail, setDetail] = useState(null);

  const query = useMemo(
    () => ({ page, limit: 20, sort, ...(search ? { search } : {}) }),
    [page, sort, search]
  );

  const load = () => {
    setLoading(true);
    setError(null);
    customerApi
      .list(query)
      .then((res) => setData({ items: res.data || [], meta: res.meta }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [query]);

  const openDetail = async (customer) => {
    setDetail({ loading: true, phone: customer.customer_phone });
    try {
      const res = await customerApi.get(customer.customer_phone);
      setDetail({ data: res.data });
    } catch (err) {
      setDetail(null);
      setError(err.message);
    }
  };

  return (
    <>
      <div className="admin__top">
        <div>
          <h1 className="display t-h2">Customers</h1>
          <p className="mute-2" style={{ margin: 0 }}>
            মোট {enNum(data.meta?.total || 0)} জন কাস্টমার · ফোন নম্বর অনুযায়ী গোনা
          </p>
        </div>
      </div>

      <div className="toolbar">
        <form
          className="search-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchDraft.trim());
          }}
        >
          <IconSearch width={17} height={17} />
          <input
            className="input"
            placeholder="নাম, ফোন বা ইমেইল দিয়ে খুঁজুন…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </form>
        <select
          className="select"
          style={{ width: 200 }}
          value={sort}
          onChange={(e) => {
            setPage(1);
            setSort(e.target.value);
          }}
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <Loader />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}

      {!loading && !error && (
        data.items.length === 0 ? (
          <Empty icon={IconUsers} title="কোনো কাস্টমার পাওয়া যায়নি" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data" style={{ minWidth: 820 }}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Orders</th>
                    <th>Spent</th>
                    <th>Cancelled</th>
                    <th>Success Ratio</th>
                    <th>Last Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.customer_phone}>
                      <td>
                        <b>{c.customer_name}</b>
                        <div className="mute-2 num">{c.customer_phone}</div>
                      </td>
                      <td className="num">{enNum(c.orders_count)}</td>
                      <td className="num">{enMoney(c.spent)}</td>
                      <td className="num">
                        {Number(c.cancelled_count) > 0 ? (
                          <span className="badge badge--danger">{enNum(c.cancelled_count)}</span>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td>
                        <Ratio value={c.success_ratio} parcels={c.total_parcel} />
                      </td>
                      <td className="mute-2 num">{formatDate(c.last_order)}</td>
                      <td>
                        <div className="actions-cell">
                          <button type="button" className="btn btn--xs" onClick={() => openDetail(c)} title="বিস্তারিত">
                            <IconEye width={13} height={13} />
                          </button>
                          <a className="btn btn--xs" href={`tel:${c.customer_phone}`} title="কল করুন">
                            কল
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.meta?.page || 1}
              totalPages={data.meta?.totalPages || 1}
              onChange={setPage}
            />
          </>
        )
      )}

      <Modal open={!!detail} wide title="কাস্টমার প্রোফাইল" onClose={() => setDetail(null)}>
        {detail?.loading && <Loader />}
        {detail?.data && (
          <>
            <div className="spread" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="t-h3" style={{ fontSize: 19 }}>{detail.data.customer_name}</h3>
                <p className="mute-2 num" style={{ margin: 0 }}>
                  {detail.data.customer_phone}
                  {detail.data.customer_email ? ` · ${detail.data.customer_email}` : ''}
                </p>
              </div>
              <a className="btn btn--sm" href={`tel:${detail.data.customer_phone}`}>কল করুন</a>
            </div>

            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 18 }}>
              <div className="card stat">
                <div className="stat__value">{enNum(detail.data.orders_count)}</div>
                <div className="stat__label">মোট অর্ডার</div>
              </div>
              <div className="card stat">
                <div className="stat__value">{enMoney(detail.data.spent)}</div>
                <div className="stat__label">মোট খরচ</div>
              </div>
              <div className={`card stat${Number(detail.data.cancelled_count) > 0 ? ' stat--danger' : ''}`}>
                <div className="stat__value">{enNum(detail.data.cancelled_count)}</div>
                <div className="stat__label">বাতিল করেছে</div>
              </div>
            </div>

            <p className="mute-2">
              ঠিকানা: {detail.data.address || '—'}
              {detail.data.city ? `, ${detail.data.city}` : ''}
              <br />
              প্রথম অর্ডার {formatDate(detail.data.first_order)} · শেষ অর্ডার {formatDate(detail.data.last_order)}
            </p>

            <div className="table-wrap">
              <table className="data" style={{ minWidth: 420 }}>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data.orders.map((o) => {
                    const s = ORDER_STATUS[o.status];
                    return (
                      <tr key={o.id}>
                        <td className="num">{o.order_code}</td>
                        <td className="num">{enNum(o.item_count)}</td>
                        <td className="num">{enMoney(o.total)}</td>
                        <td><span className={`badge ${s.badge}`}>{s.bn}</span></td>
                        <td className="mute-2 num">{formatDateTime(o.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default AdminCustomers;
