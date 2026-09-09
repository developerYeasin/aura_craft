import { useEffect, useMemo, useState } from 'react';
import { orderApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader, ErrorBox, Modal, ConfirmDialog, Pagination, Empty } from '../../components/ui/index.jsx';
import OrderSummaryCard from '../../components/product/OrderSummaryCard.jsx';
import { IconEye, IconTrash, IconSearch, IconReceipt } from '../../components/ui/Icons.jsx';
import { money, toBn, formatDateTime, ORDER_STATUS } from '../../utils/format.js';

const STATUSES = Object.keys(ORDER_STATUS);

const AdminOrders = () => {
  const toast = useToast();
  const { canDelete } = useAuth();

  const [data, setData] = useState({ items: [], meta: { page: 1, totalPages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);

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
          <p className="mute-2" style={{ margin: 0 }}>মোট {toBn(data.meta?.total || 0)} টি অর্ডার</p>
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
                    </td>
                    <td>
                      {o.customer_name}
                      <div className="mute-2">{o.customer_phone}</div>
                    </td>
                    <td>{toBn(o.item_count)}</td>
                    <td>{money(o.total)}</td>
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
                        <button type="button" className="btn btn--xs" onClick={() => view(o)}>
                          <IconEye width={13} height={13} />
                        </button>
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
