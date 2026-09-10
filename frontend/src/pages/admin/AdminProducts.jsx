import { useEffect, useMemo, useState } from 'react';
import { productApi, categoryApi, uploadApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader, ErrorBox, Modal, ConfirmDialog, Field, Pagination, Empty } from '../../components/ui/index.jsx';
import { IconEdit, IconTrash, IconPlus, IconSearch, IconGem } from '../../components/ui/Icons.jsx';
import { enMoney, enNum, imageOf } from '../../utils/format.js';

const emptyForm = {
  category_id: '',
  name: '',
  sku: '',
  short_description: '',
  description: '',
  price: '',
  compare_price: '',
  stock: 0,
  material: '',
  color: '',
  size_options: '',
  warranty: '',
  is_featured: 0,
  is_active: 1,
  images: [],
};

const AdminProducts = () => {
  const toast = useToast();
  const { canDelete } = useAuth();

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ items: [], meta: { page: 1, totalPages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageInput, setImageInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [stockBusy, setStockBusy] = useState(null);
  const [stockEdit, setStockEdit] = useState(null);

  const query = useMemo(
    () => ({ page, limit: 12, sort: 'newest', ...(search ? { search } : {}), ...(categoryFilter ? { categoryId: categoryFilter } : {}) }),
    [page, search, categoryFilter]
  );

  const load = () => {
    setLoading(true);
    setError(null);
    productApi
      .listAll(query)
      .then((res) => setData({ items: res.data || [], meta: res.meta }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [query]);

  useEffect(() => {
    categoryApi.listAll().then((res) => setCategories(res.data || [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, category_id: categories[0]?.id || '' });
    setModalOpen(true);
  };

  /** Stock is patched on its own endpoint so nothing else on the product moves. */
  const applyStock = async (id, body, label) => {
    setStockBusy(id);
    try {
      const res = await productApi.setStock(id, body);
      setData((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, stock: res.data.stock } : it)) }));
      toast.success(label || `স্টক আপডেট হয়েছে — ${enNum(res.data.stock)}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setStockBusy(null);
    }
  };

  const adjustStock = (product, delta) => applyStock(product.id, { delta }, null);

  const openEdit = async (product) => {
    try {
      const res = await productApi.get(product.id);
      const p = res.data;
      setEditing(p);
      setForm({
        category_id: p.category_id,
        name: p.name,
        sku: p.sku || '',
        short_description: p.short_description || '',
        description: p.description || '',
        price: p.price,
        compare_price: p.compare_price || '',
        stock: p.stock,
        material: p.material || '',
        color: p.color || '',
        size_options: p.size_options || '',
        warranty: p.warranty || '',
        is_featured: p.is_featured,
        is_active: p.is_active,
        images: (p.images || []).map((i) => i.url),
      });
      setModalOpen(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? Number(e.target.checked) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const addImage = () => {
    const url = imageInput.trim();
    if (!url) return;
    setForm((f) => ({ ...f, images: [...f.images, url] }));
    setImageInput('');
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.image(file);
      setForm((f) => ({ ...f, images: [...f.images, res.data.url] }));
      toast.success('ছবি আপলোড হয়েছে');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        price: Number(form.price),
        compare_price: form.compare_price === '' ? null : Number(form.compare_price),
        stock: Number(form.stock),
        sku: form.sku || null,
      };
      if (editing) await productApi.update(editing.id, payload);
      else await productApi.create(payload);
      toast.success(editing ? 'প্রোডাক্ট আপডেট হয়েছে' : 'নতুন প্রোডাক্ট যোগ হয়েছে');
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
      await productApi.remove(confirm.id);
      toast.success('প্রোডাক্ট ডিলিট হয়েছে');
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
          <h1 className="display t-h2">Products</h1>
          <p className="mute-2" style={{ margin: 0 }}>মোট {enNum(data.meta?.total || 0)} টি প্রোডাক্ট</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
          <IconPlus width={15} height={15} /> নতুন প্রোডাক্ট
        </button>
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
          <input className="input" placeholder="নাম বা SKU দিয়ে খুঁজুন…" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} />
        </form>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={categoryFilter}
          onChange={(e) => {
            setPage(1);
            setCategoryFilter(e.target.value);
          }}
        >
          <option value="">সব ক্যাটাগরি</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name_bn || c.name}</option>
          ))}
        </select>
      </div>

      {loading && <Loader />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && data.items.length === 0 && <Empty icon={IconGem} title="কোনো প্রোডাক্ট নেই" />}

      {!loading && !error && data.items.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td><img className="table-thumb" src={imageOf(p)} alt={p.name} /></td>
                    <td>
                      {p.name}
                      {p.is_featured === 1 && <span className="badge badge--warn" style={{ marginLeft: 6 }}>Featured</span>}
                      <div className="mute-2">{p.sku}</div>
                    </td>
                    <td className="mute-2">{p.category_name_bn || p.category_name}</td>
                    <td>{enMoney(p.price)}</td>
                    <td>
                      <div className="stock-cell">
                        <button
                          type="button"
                          className="btn btn--xs"
                          onClick={() => adjustStock(p, -1)}
                          disabled={stockBusy === p.id || p.stock <= 0}
                          aria-label="স্টক কমান"
                        >
                          −
                        </button>
                        <span className={`badge ${p.stock > 5 ? 'badge--ok' : p.stock > 0 ? 'badge--warn' : 'badge--danger'}`}>
                          {enNum(p.stock)}
                        </span>
                        <button
                          type="button"
                          className="btn btn--xs"
                          onClick={() => adjustStock(p, 1)}
                          disabled={stockBusy === p.id}
                          aria-label="স্টক বাড়ান"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="btn btn--xs btn--ghost"
                          onClick={() => setStockEdit({ id: p.id, name: p.name, value: String(p.stock) })}
                        >
                          সেট
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${p.is_active ? 'badge--ok' : 'badge--mute'}`}>
                        {p.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button type="button" className="btn btn--xs" onClick={() => openEdit(p)}>
                          <IconEdit width={13} height={13} />
                        </button>
                        {canDelete && (
                          <button type="button" className="btn btn--xs btn--danger" onClick={() => setConfirm(p)}>
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

      <Modal open={modalOpen} wide title={editing ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট'} onClose={() => setModalOpen(false)}>
        <form onSubmit={save}>
          <div className="form-grid">
            <Field label="ক্যাটাগরি" required>
              <select className="select" value={form.category_id} onChange={set('category_id')} required>
                <option value="">নির্বাচন করুন</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_bn || c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="প্রোডাক্ট নাম" required>
              <input className="input" value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="SKU">
              <input className="input" value={form.sku} onChange={set('sku')} />
            </Field>
            <Field label="দাম (৳)" required>
              <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required />
            </Field>
            <Field label="আগের দাম (৳)" hint="ছাড় দেখাতে চাইলে">
              <input className="input" type="number" min="0" step="0.01" value={form.compare_price} onChange={set('compare_price')} />
            </Field>
            <Field label="স্টক" required>
              <input className="input" type="number" min="0" value={form.stock} onChange={set('stock')} required />
            </Field>
            <Field label="উপাদান">
              <input className="input" value={form.material} onChange={set('material')} />
            </Field>
            <Field label="রঙ">
              <input className="input" value={form.color} onChange={set('color')} />
            </Field>
            <Field label="সাইজ অপশন" hint="স্ল্যাশ দিয়ে আলাদা করুন: 6/7/8">
              <input className="input" value={form.size_options} onChange={set('size_options')} />
            </Field>
            <Field label="ওয়ারেন্টি">
              <input className="input" value={form.warranty} onChange={set('warranty')} />
            </Field>
          </div>

          <Field label="সংক্ষিপ্ত বর্ণনা">
            <input className="input" value={form.short_description} onChange={set('short_description')} />
          </Field>
          <Field label="বিস্তারিত বর্ণনা">
            <textarea className="textarea" value={form.description} onChange={set('description')} />
          </Field>

          <Field label="ছবি" hint="URL যোগ করুন অথবা ফাইল আপলোড করুন (প্রথম ছবিটি প্রধান ছবি)">
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="https://…"
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <button type="button" className="btn btn--sm" onClick={addImage}>যোগ করুন</button>
              <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
                {uploading ? 'আপলোড হচ্ছে…' : 'ফাইল আপলোড'}
                <input type="file" accept="image/*" hidden onChange={(e) => uploadFile(e.target.files?.[0])} />
              </label>
            </div>
          </Field>

          {form.images.length > 0 && (
            <div className="row gap-8" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
              {form.images.map((url, i) => (
                <div key={`${url}-${i}`} style={{ position: 'relative' }}>
                  <img className="table-thumb" style={{ width: 58, height: 58 }} src={url} alt="" />
                  <button
                    type="button"
                    className="pcard__fav"
                    style={{ top: -6, right: -6, width: 22, height: 22 }}
                    onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, x) => x !== i) }))}
                    aria-label="সরান"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="row gap-16" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
            <label className="checkbox">
              <input type="checkbox" checked={!!form.is_featured} onChange={set('is_featured')} /> ফিচার্ড প্রোডাক্ট
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={!!form.is_active} onChange={set('is_active')} /> ওয়েবসাইটে দেখান
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

      <Modal open={!!stockEdit} title={`স্টক সেট করুন — ${stockEdit?.name || ''}`} onClose={() => setStockEdit(null)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value = Number(stockEdit.value);
            if (!Number.isFinite(value) || value < 0) return;
            applyStock(stockEdit.id, { stock: value }, `স্টক সেট হয়েছে — ${enNum(value)}`);
            setStockEdit(null);
          }}
        >
          <Field label="নতুন স্টক সংখ্যা" required>
            <input
              className="input"
              type="number"
              min="0"
              autoFocus
              value={stockEdit?.value ?? ''}
              onChange={(e) => setStockEdit((v) => ({ ...v, value: e.target.value }))}
            />
          </Field>
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStockEdit(null)}>বাতিল</button>
            <button type="submit" className="btn btn--primary btn--sm">সেভ করুন</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        text={`"${confirm?.name}" স্থায়ীভাবে ডিলিট হয়ে যাবে।`}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default AdminProducts;
