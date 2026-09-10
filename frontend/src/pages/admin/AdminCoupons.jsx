import { useEffect, useState } from 'react';
import { couponApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader, ErrorBox, Modal, ConfirmDialog, Field, Empty } from '../../components/ui/index.jsx';
import { IconEdit, IconTrash, IconPlus, IconTag } from '../../components/ui/Icons.jsx';
import { enMoney, enNum, formatDate } from '../../utils/format.js';

const blank = {
  code: '',
  description: '',
  type: 'percent',
  value: '',
  min_order: '0',
  max_discount: '',
  usage_limit: '',
  per_phone_limit: '',
  starts_at: '',
  expires_at: '',
  is_active: 1,
};

/** DATETIME from MySQL → the value an <input type="datetime-local"> expects. */
const toLocalInput = (value) => (value ? new Date(value).toISOString().slice(0, 16) : '');

const AdminCoupons = () => {
  const toast = useToast();
  const { canDelete } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    couponApi
      .list()
      .then((res) => setItems(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const openNew = () => {
    setEditing(null);
    setForm(blank);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || '',
      type: c.type,
      value: String(c.value),
      min_order: String(c.min_order),
      max_discount: c.max_discount != null ? String(c.max_discount) : '',
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : '',
      per_phone_limit: c.per_phone_limit != null ? String(c.per_phone_limit) : '',
      starts_at: toLocalInput(c.starts_at),
      expires_at: toLocalInput(c.expires_at),
      is_active: c.is_active,
    });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    // Empty strings mean "no limit" — send null so the column stays NULL.
    const payload = {
      ...form,
      value: Number(form.value),
      min_order: Number(form.min_order || 0),
      max_discount: form.max_discount === '' ? null : Number(form.max_discount),
      usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
      per_phone_limit: form.per_phone_limit === '' ? null : Number(form.per_phone_limit),
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      description: form.description || null,
    };
    try {
      if (editing) await couponApi.update(editing.id, payload);
      else await couponApi.create(payload);
      toast.success(editing ? 'কুপন আপডেট হয়েছে' : 'কুপন তৈরি হয়েছে');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await couponApi.remove(confirm.id);
      toast.success('কুপন ডিলিট হয়েছে');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const statusOf = (c) => {
    if (!c.is_active) return { label: 'বন্ধ', badge: 'badge--mute' };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { label: 'মেয়াদ শেষ', badge: 'badge--danger' };
    if (c.starts_at && new Date(c.starts_at) > new Date()) return { label: 'আসছে', badge: 'badge--info' };
    if (c.usage_limit && Number(c.used_count) >= Number(c.usage_limit)) {
      return { label: 'সীমা শেষ', badge: 'badge--warn' };
    }
    return { label: 'চালু', badge: 'badge--ok' };
  };

  return (
    <>
      <div className="admin__top">
        <div>
          <h1 className="display t-h2">Coupons</h1>
          <p className="mute-2" style={{ margin: 0 }}>ডিসকাউন্ট কোড তৈরি ও নিয়ন্ত্রণ</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={openNew}>
          <IconPlus width={14} height={14} /> নতুন কুপন
        </button>
      </div>

      {loading && <Loader />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}

      {!loading && !error && (
        items.length === 0 ? (
          <Empty icon={IconTag} title="এখনো কোনো কুপন নেই" />
        ) : (
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min Order</th>
                  <th>Used</th>
                  <th>Validity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const s = statusOf(c);
                  return (
                    <tr key={c.id}>
                      <td>
                        <b className="num">{c.code}</b>
                        {c.description && <div className="mute-2">{c.description}</div>}
                      </td>
                      <td className="num">
                        {c.type === 'percent' ? `${enNum(c.value)}%` : enMoney(c.value)}
                        {c.max_discount != null && c.type === 'percent' && (
                          <div className="mute-2">সর্বোচ্চ {enMoney(c.max_discount)}</div>
                        )}
                      </td>
                      <td className="num">{Number(c.min_order) > 0 ? enMoney(c.min_order) : '—'}</td>
                      <td className="num">
                        {enNum(c.used_count)}
                        {c.usage_limit != null && <span className="mute-2"> / {enNum(c.usage_limit)}</span>}
                      </td>
                      <td className="mute-2 num">
                        {c.starts_at || c.expires_at
                          ? `${c.starts_at ? formatDate(c.starts_at) : '—'} → ${c.expires_at ? formatDate(c.expires_at) : '—'}`
                          : 'সীমাহীন'}
                      </td>
                      <td><span className={`badge ${s.badge}`}>{s.label}</span></td>
                      <td>
                        <div className="actions-cell">
                          <button type="button" className="btn btn--xs" onClick={() => openEdit(c)}>
                            <IconEdit width={13} height={13} />
                          </button>
                          {canDelete && (
                            <button type="button" className="btn btn--xs btn--danger" onClick={() => setConfirm(c)}>
                              <IconTrash width={13} height={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal open={modalOpen} wide title={editing ? 'কুপন এডিট' : 'নতুন কুপন'} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="কুপন কোড" required hint="কাস্টমার এটাই লিখবে — বড় হাতের অক্ষরে সেভ হবে">
              <input className="input" value={form.code} onChange={set('code')} required placeholder="EID25" />
            </Field>
            <Field label="ধরন" required>
              <select className="select" value={form.type} onChange={set('type')}>
                <option value="percent">শতাংশ (%)</option>
                <option value="fixed">নির্দিষ্ট টাকা (৳)</option>
              </select>
            </Field>
            <Field label={form.type === 'percent' ? 'কত শতাংশ ছাড়' : 'কত টাকা ছাড়'} required>
              <input className="input" type="number" min="0" step="0.01" value={form.value} onChange={set('value')} required />
            </Field>
            <Field label="সর্বনিম্ন অর্ডার (৳)" hint="০ দিলে যেকোনো অর্ডারে চলবে">
              <input className="input" type="number" min="0" value={form.min_order} onChange={set('min_order')} />
            </Field>
            {form.type === 'percent' && (
              <Field label="সর্বোচ্চ ছাড় (৳)" hint="ফাঁকা রাখলে সীমা নেই">
                <input className="input" type="number" min="0" value={form.max_discount} onChange={set('max_discount')} />
              </Field>
            )}
            <Field label="মোট কতবার ব্যবহার করা যাবে" hint="ফাঁকা = সীমাহীন">
              <input className="input" type="number" min="0" value={form.usage_limit} onChange={set('usage_limit')} />
            </Field>
            <Field label="প্রতি নম্বরে কতবার" hint="ফাঁকা = সীমাহীন">
              <input className="input" type="number" min="0" value={form.per_phone_limit} onChange={set('per_phone_limit')} />
            </Field>
            <Field label="শুরু">
              <input className="input" type="datetime-local" value={form.starts_at} onChange={set('starts_at')} />
            </Field>
            <Field label="শেষ">
              <input className="input" type="datetime-local" value={form.expires_at} onChange={set('expires_at')} />
            </Field>
          </div>

          <Field label="বর্ণনা (ঐচ্ছিক)">
            <input className="input" value={form.description} onChange={set('description')} placeholder="ঈদ অফার" />
          </Field>

          <label className="checkbox">
            <input type="checkbox" checked={!!form.is_active} onChange={set('is_active')} /> কুপনটি চালু থাকবে
          </label>

          <div className="row gap-8" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModalOpen(false)}>বাতিল</button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        text={`"${confirm?.code}" কুপনটি ডিলিট হয়ে যাবে।`}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default AdminCoupons;
