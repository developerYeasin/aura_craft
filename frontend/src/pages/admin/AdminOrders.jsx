import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orderApi, courierApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader, ErrorBox, Modal, ConfirmDialog, Pagination, Empty } from '../../components/ui/index.jsx';
import OrderSummaryCard from '../../components/product/OrderSummaryCard.jsx';
import { IconEye, IconTrash, IconSearch, IconReceipt, IconTruck, IconShield } from '../../components/ui/Icons.jsx';
import { enMoney, enNum, enPercent, formatDateTime, ORDER_STATUS } from '../../utils/format.js';

const STATUSES = Object.keys(ORDER_STATUS);

/** Same normalisation the API uses, so the response map keys line up. */
const normalisePhone = (raw = '') => {
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.startsWith('880')) return `0${digits.slice(3)}`;
  if (digits.length === 10 && digits.startsWith('1')) return `0${digits}`;
  return digits;
};

/**
 * Delivery success rate from the courier network. A customer with no parcel
 * history is not a bad customer — that reads as "—", never as 0%.
 */
const SuccessRatio = ({ entry, loading }) => {
  if (entry === undefined) return <span className="faint">{loading ? '…' : '—'}</span>;
  if (!entry || !entry.total_parcel) return <span className="faint" title="কোনো কুরিয়ার রেকর্ড নেই">—</span>;
  const ratio = Number(entry.success_ratio);
  const tone = ratio >= 90 ? 'badge--ok' : ratio >= 60 ? 'badge--warn' : 'badge--danger';
  return (
    <span
      className={`badge ${tone} num`}
      title={`${enNum(entry.success_parcel)} / ${enNum(entry.total_parcel)} সফল · ${enNum(entry.cancelled_parcel)} বাতিল বা ফেরত`}
    >
      {enPercent(ratio)}
    </span>
  );
};

const AdminOrders = () => {
  const toast = useToast();
  const { canDelete } = useAuth();

  const [data, setData] = useState({ items: [], meta: { page: 1, totalPages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  // The dashboard links straight to a filtered list, e.g. /admin/orders?status=pending
  const [params, setParams] = useSearchParams();
  const status = STATUSES.includes(params.get('status')) ? params.get('status') : '';
  const setStatus = (next) => {
    setPage(1);
    setParams(next ? { status: next } : {}, { replace: true });
  };
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [courierBusy, setCourierBusy] = useState(null);
  const [fraudInfo, setFraudInfo] = useState(null);
  const [ratios, setRatios] = useState({});
  const [ratiosLoading, setRatiosLoading] = useState(false);

  const query = useMemo(
    () => ({ page, limit: 15, ...(status ? { status } : {}), ...(search ? { search } : {}) }),
    [page, status, search]
  );

  const load = () => {
    setLoading(true);
    setError(null);
    orderApi
      .list(query)
      .then((res) => setData({ items: res.data || [], meta: res.meta }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [query]);

  // One batched, server-cached lookup per page of orders — never one per row.
  useEffect(() => {
    const phones = [...new Set(data.items.map((o) => o.customer_phone).filter(Boolean))];
    if (!phones.length) return;
    let cancelled = false;
    setRatiosLoading(true);
    courierApi
      .fraudCheckBulk(phones)
      .then((res) => {
        if (!cancelled) setRatios((prev) => ({ ...prev, ...(res.data || {}) }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRatiosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data.items]);

  const sendToCourier = async (order) => {
    setCourierBusy(order.id);
    try {
      const res = await courierApi.send(order.id);
      toast.success(`কুরিয়ারে পাঠানো হয়েছে — কনসাইনমেন্ট ${res.data.consignment_id}`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCourierBusy(null);
    }
  };

  const refreshCourier = async (order) => {
    setCourierBusy(order.id);
    try {
      const res = await courierApi.status(order.id);
      toast.success(`কুরিয়ার স্ট্যাটাস: ${res.data.status}`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCourierBusy(null);
    }
  };

  /** COD history for this customer, so staff can call before shipping. */
  const checkFraud = async (order) => {
    setCourierBusy(order.id);
    setFraudInfo({ order, loading: true });
    try {
      const res = await courierApi.fraudCheck(order.customer_phone);
      setFraudInfo({ order, data: res.data });
    } catch (err) {
      setFraudInfo(null);
      toast.error(err.message);
    } finally {
      setCourierBusy(null);
    }
  };

  const changeStatus = async (order, next) => {
    try {
      await orderApi.setStatus(order.id, next);
      toast.success('স্ট্যাটাস আপডেট হয়েছে');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const view = async (order) => {
    try {
      const res = await orderApi.get(order.id);
      setDetail(res.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async () => {
    try {
      await orderApi.remove(confirm.id);
      toast.success('অর্ডার ডিলিট হয়েছে');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="admin__top">
        <div>
          <h1 className="display t-h2">Orders</h1>
          <p className="mute-2" style={{ margin: 0 }}>মোট {enNum(data.meta?.total || 0)} টি অর্ডার</p>
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
          <IconSearch width={16} height={16} />
          <input
            className="input"
            placeholder="অর্ডার কোড, নাম বা ফোন…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </form>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">সব স্ট্যাটাস</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS[s].label}</option>
          ))}
        </select>
      </div>

      {loading && <Loader />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && data.items.length === 0 && <Empty icon={IconReceipt} title="কোনো অর্ডার নেই" />}

      {!loading && !error && data.items.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Success Ratio</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.order_code}
                      <div className="mute-2">{o.first_product}</div>
                      {o.courier_consignment_id && (
                        <div className="faint" style={{ fontSize: 11 }}>
                          {o.courier_provider} · {o.courier_consignment_id}
                          {o.courier_status ? ` · ${o.courier_status}` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      {o.risk_flags && (
                        <span
                          className="badge badge--danger"
                          title={`ঝুঁকির চিহ্ন: ${o.risk_flags}`}
                          style={{ marginRight: 6 }}
                        >
                          ঝুঁকি
                        </span>
                      )}
                      {o.customer_name}
                      <div className="mute-2">{o.customer_phone}</div>
                    </td>
                    <td>{enNum(o.item_count)}</td>
                    <td className="num">{enMoney(o.total)}</td>
                    <td>
                      <SuccessRatio entry={ratios[normalisePhone(o.customer_phone)]} loading={ratiosLoading} />
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{ padding: '5px 26px 5px 10px', fontSize: 12.5, width: 'auto' }}
                        value={o.status}
                        onChange={(e) => changeStatus(o, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{ORDER_STATUS[s].label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="mute-2">{formatDateTime(o.created_at)}</td>
                    <td>
                      <div className="actions-cell">
                        <button type="button" className="btn btn--xs" onClick={() => view(o)} title="বিস্তারিত">
                          <IconEye width={13} height={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn--xs"
                          onClick={() => checkFraud(o)}
                          disabled={courierBusy === o.id}
                          title="কাস্টমারের COD হিস্ট্রি দেখুন"
                        >
                          <IconShield width={13} height={13} />
                        </button>
                        {o.courier_consignment_id ? (
                          <button
                            type="button"
                            className="btn btn--xs btn--ok"
                            onClick={() => refreshCourier(o)}
                            disabled={courierBusy === o.id}
                            title={`কনসাইনমেন্ট ${o.courier_consignment_id} — স্ট্যাটাস রিফ্রেশ`}
                          >
                            <IconTruck width={13} height={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--xs"
                            onClick={() => sendToCourier(o)}
                            disabled={courierBusy === o.id || o.status === 'cancelled'}
                            title="কুরিয়ারে পাঠান"
                          >
                            <IconTruck width={13} height={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button type="button" className="btn btn--xs btn--danger" onClick={() => setConfirm(o)}>
                            <IconTrash width={13} height={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.meta?.page || 1} totalPages={data.meta?.totalPages || 1} onChange={setPage} />
        </>
      )}

      <Modal open={!!detail} wide title="অর্ডার বিস্তারিত" onClose={() => setDetail(null)}>
        {detail && <OrderSummaryCard order={detail} />}
      </Modal>

      <Modal open={!!fraudInfo} title="COD ঝুঁকি রিপোর্ট" onClose={() => setFraudInfo(null)}>
        {fraudInfo?.loading && <Loader label="কুরিয়ার হিস্ট্রি আনা হচ্ছে…" />}
        {fraudInfo?.data && (
          <>
            <p className="mute-2" style={{ marginTop: 0 }}>
              {fraudInfo.order.customer_name} · <span className="num">{fraudInfo.data.phone}</span>
            </p>
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 14 }}>
              <div className="card stat">
                <div className="stat__value">{enPercent(fraudInfo.data.success_ratio)}</div>
                <div className="stat__label">ডেলিভারি সাকসেস রেট</div>
              </div>
              <div className="card stat">
                <div className="stat__value">{enNum(fraudInfo.data.total_parcel)}</div>
                <div className="stat__label">মোট পার্সেল</div>
              </div>
              <div className="card stat">
                <div className="stat__value">{enNum(fraudInfo.data.success_parcel)}</div>
                <div className="stat__label">সফল ডেলিভারি</div>
              </div>
              <div className="card stat stat--danger">
                <div className="stat__value">{enNum(fraudInfo.data.cancelled_parcel)}</div>
                <div className="stat__label">বাতিল / ফেরত</div>
              </div>
            </div>
            <p
              className={
                fraudInfo.data.total_parcel === 0 || fraudInfo.data.success_ratio >= 80 ? 'mute-2' : 'field-error'
              }
              style={{ margin: 0 }}
            >
              {fraudInfo.data.total_parcel === 0
                ? 'এই নম্বরে আগের কোনো কুরিয়ার রেকর্ড নেই — নতুন কাস্টমার।'
                : fraudInfo.data.success_ratio >= 80
                  ? 'ভালো রেকর্ড — নিশ্চিন্তে পাঠাতে পারেন।'
                  : 'ঝুঁকিপূর্ণ রেকর্ড — পাঠানোর আগে কল করে কনফার্ম করুন।'}
            </p>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        text={`অর্ডার ${confirm?.order_code} স্থায়ীভাবে ডিলিট হয়ে যাবে।`}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default AdminOrders;
