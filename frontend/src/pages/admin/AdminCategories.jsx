import { useEffect, useState } from 'react';
import { categoryApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { Loader, ErrorBox, Modal, ConfirmDialog, Field, Empty } from '../../components/ui/index.jsx';
import { IconEdit, IconTrash, IconPlus, IconFolder, categoryIcon } from '../../components/ui/Icons.jsx';
import { toBn } from '../../utils/format.js';

const emptyForm = {
  name: '',
  name_bn: '',
  slug: '',
  description: '',
  icon: '',
  image_url: '',
  banner_url: '',
  sort_order: 0,
  is_active: 1,
  show_in_nav: 1,
};

const AdminCategories = () => {
  const toast = useToast();
  const { canDelete } = useAuth();
  const store = useStore();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    categoryApi
      .listAll()
      .then((res) => setItems(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? Number(e.target.checked) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: items.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setForm({ ...emptyForm, ...category });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) };
      delete payload.id;
      delete payload.product_count;
      delete payload.created_at;
      delete payload.updated_at;
      if (!payload.slug) delete payload.slug;
      if (editing) await categoryApi.update(editing.id, payload);
      else await categoryApi.create(payload);
      toast.success(editing ? 'ক্যাটাগরি আপডেট হয়েছে' : 'নতুন ক্যাটাগরি যোগ হয়েছে');
      setModalOpen(false);
      load();
      store.refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await categoryApi.remove(confirm.id);
      toast.success('ক্যাটাগরি ডিলিট হয়েছে');
      setConfirm(null);
      load();
      store.refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="admin__top">
        <div>
          <h1 className="display t-h2">Categories</h1>
          <p className="mute-2" style={{ margin: 0 }}>নতুন ক্যাটাগরি যোগ করলেই নেভবার ও হোম পেজে যুক্ত হবে</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
          <IconPlus width={15} height={15} /> নতুন ক্যাটাগরি
        </button>
      </div>

      {loading && <Loader />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <Empty icon={IconFolder} title="কোনো ক্যাটাগরি নেই" />}

      {!loading && !error && items.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Products</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="bento__ico" style={{ width: 34, height: 34, position: 'static' }}>
                      {(() => { const I = categoryIcon(c.slug); return <I width={16} height={16} />; })()}
                    </span>
                  </td>
                  <td>
                    {c.name_bn || c.name}
                    <div className="mute-2">{c.name}</div>
                  </td>
                  <td className="mute-2">{c.slug}</td>
                  <td>{toBn(c.product_count)}</td>
                  <td>{toBn(c.sort_order)}</td>
                  <td>
                    <span className={`badge ${c.is_active ? 'badge--ok' : 'badge--mute'}`}>
                      {c.is_active ? 'Active' : 'Hidden'}
                    </span>
                    {c.show_in_nav === 1 && <span className="badge badge--info" style={{ marginLeft: 6 }}>Nav</span>}
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'ক্যাটাগরি এডিট' : 'নতুন ক্যাটাগরি'} onClose={() => setModalOpen(false)}>
        <form onSubmit={save}>
          <div className="form-grid">
            <Field label="নাম (English)" required>
              <input className="input" value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="নাম (বাংলা)">
              <input className="input" value={form.name_bn || ''} onChange={set('name_bn')} />
            </Field>
            <Field label="Slug" hint="খালি রাখলে নাম থেকে তৈরি হবে">
              <input className="input" value={form.slug || ''} onChange={set('slug')} />
            </Field>
            <Field label="আইকন (ইমোজি)">
              <input className="input" value={form.icon || ''} onChange={set('icon')} placeholder="💍" />
            </Field>
            <Field label="সাজানোর ক্রম">
              <input className="input" type="number" value={form.sort_order} onChange={set('sort_order')} />
            </Field>
          </div>

          <Field label="বর্ণনা">
            <textarea className="textarea" value={form.description || ''} onChange={set('description')} />
          </Field>
          <Field label="থাম্বনেইল ছবি URL">
            <input className="input" value={form.image_url || ''} onChange={set('image_url')} />
          </Field>
          <Field label="ব্যানার ছবি URL">
            <input className="input" value={form.banner_url || ''} onChange={set('banner_url')} />
          </Field>

          <div className="row gap-16" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
            <label className="checkbox">
              <input type="checkbox" checked={!!form.is_active} onChange={set('is_active')} /> সক্রিয়
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={!!form.show_in_nav} onChange={set('show_in_nav')} /> নেভবারে দেখান
            </label>
          </div>

          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModalOpen(false)}>বাতিল</button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        text={`"${confirm?.name}" এবং এর সব প্রোডাক্ট ডিলিট হয়ে যাবে।`}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default AdminCategories;
