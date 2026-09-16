import { useEffect, useMemo, useState } from 'react';
import { productApi, categoryApi, uploadApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader, ErrorBox, Modal, ConfirmDialog, Field, Pagination, Empty } from '../../components/ui/index.jsx';
import ClearAllButton from '../../components/ui/ClearAll.jsx';
import { IconEdit, IconTrash, IconPlus, IconSearch, IconGem } from '../../components/ui/Icons.jsx';
import { enMoney, enNum, imageOf, priceInfo } from '../../utils/format.js';

const emptyForm = {
  category_id: '',
  name: '',
  sku: '',
  short_description: '',
  description: '',
  price: '',
  discount_type: 'none',
  discount_value: '',
  stock: 0,
  material: '',
  color: '',
  size_options: '',
  warranty: '',
  is_featured: 0,
  is_active: 1,
  images: [],
  video_url: '',
};

const DISCOUNT_TYPES = [
  ['none', 'ছাড় নেই'],
  ['percent', 'শতাংশ (%)'],
  ['fixed', 'নির্দিষ্ট টাকা (৳)'],
];

/** Same rules the API enforces, checked here so the admin sees them before saving. */
const discountProblem = (form) => {
  if (form.discount_type === 'none') return null;
  const value = Number(form.discount_value);
  if (!(value > 0)) return 'ছাড়ের মান ০-এর বেশি দিন';
  if (form.discount_type === 'percent' && value > 100) return 'শতাংশ ১০০-এর বেশি হতে পারে না';
  if (form.discount_type === 'fixed' && value > Number(form.price || 0)) return 'ছাড়ের টাকা দামের চেয়ে বেশি হতে পারে না';
  return null;
};

const availability = (stock) => {
  const n = Number(stock);
  if (n <= 0) return { label: 'Out of stock', badge: 'badge--danger' };
  if (n <= 5) return { label: 'Low stock', badge: 'badge--warn' };
  return { label: 'In stock', badge: 'badge--ok' };
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
  const [converted, setConverted] = useState(false);
  const [imageInput, setImageInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(null);
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
    setConverted(false);
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
      // Products priced the old way (price + higher compare_price) open as an
      // equivalent fixed discount, so the customer-facing price does not change.
      const legacy = (p.discount_type || 'none') === 'none' && Number(p.compare_price) > Number(p.price);
      setEditing(p);
      setConverted(legacy);
      setForm({
        category_id: p.category_id,
        name: p.name,
        sku: p.sku || '',
        short_description: p.short_description || '',
        description: p.description || '',
        price: legacy ? Number(p.compare_price) : Number(p.price),
        discount_type: legacy ? 'fixed' : p.discount_type || 'none',
        discount_value: legacy
          ? String(Math.round((Number(p.compare_price) - Number(p.price)) * 100) / 100)
          : p.discount_type && p.discount_type !== 'none'
            ? String(Number(p.discount_value))
            : '',
        stock: p.stock,
        material: p.material || '',
        color: p.color || '',
        size_options: p.size_options || '',
        warranty: p.warranty || '',
        is_featured: p.is_featured,
        is_active: p.is_active,
        images: (p.images || []).map((i) => i.url),
        video_url: p.video_url || '',
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

  const makePrimary = (index) =>
    setForm((f) => ({ ...f, images: [f.images[index], ...f.images.filter((_, i) => i !== index)] }));

  const uploadFile = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploading(true);
    try {
      for (const file of list) {
        const res = await uploadApi.image(file);
        setForm((f) => ({ ...f, images: [...f.images, res.data.url] }));
      }
      toast.success(list.length > 1 ? `${list.length} টি ছবি আপলোড হয়েছে` : 'ছবি আপলোড হয়েছে');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadVideo = async (file) => {
    if (!file) return;
    setVideoProgress(0);
    try {
      const res = await uploadApi.video(file, setVideoProgress);
      setForm((f) => ({ ...f, video_url: res.data.url }));
      toast.success('ভিডিও আপলোড হয়েছে');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVideoProgress(null);
    }
  };

  const problem = discountProblem(form);
  const preview = priceInfo({ price: form.price, discount_type: form.discount_type, discount_value: form.discount_value });

  const save = async (e) => {
    e.preventDefault();
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        price: Number(form.price),
        // compare_price is superseded by discount_type/value; clearing it means
        // "no discount" really shows only the original price.
        compare_price: null,
        discount_value: form.discount_type === 'none' ? 0 : Number(form.discount_value),
        stock: Number(form.stock),
        sku: form.sku || null,
        video_url: form.video_url.trim() || null,
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
        <div className="admin__actions">
          <ClearAllButton
            section="products"
            label="Products"
            sensitive
            warning="সব ছবির লিংকও মুছে যাবে। আগের অর্ডারে প্রোডাক্টের নাম ও দাম থেকে যাবে।"
            onCleared={() => (page === 1 ? load() : setPage(1))}
          />
          <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
            <IconPlus width={15} height={15} /> নতুন প্রোডাক্ট
          </button>
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
            <table className="data" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const pi = priceInfo(p);
                  return (
                    <tr key={p.id}>
                      <td><img className="table-thumb" src={imageOf(p)} alt={p.name} /></td>
                      <td>
                        {p.name}
                        {p.is_featured === 1 && <span className="badge badge--warn" style={{ marginLeft: 6 }}>Featured</span>}
                        {p.video_url && <span className="badge badge--info" style={{ marginLeft: 6 }}>Video</span>}
                        <div className="mute-2">{p.sku}</div>
                      </td>
                      <td className="mute-2">{p.category_name_bn || p.category_name}</td>
                      <td className="num">
                        <b>{enMoney(pi.final)}</b>
                        {pi.hasDiscount && (
                          <div className="mute-2" style={{ whiteSpace: 'nowrap' }}>
                            <s>{enMoney(pi.original)}</s>{' '}
                            <span className="badge badge--sale">
                              {pi.type === 'fixed' && pi.value ? `−${enMoney(pi.value)}` : `−${pi.percent}%`}
                            </span>
                          </div>
                        )}
                      </td>
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
                          <span className={`badge ${availability(p.stock).badge}`}>{enNum(p.stock)}</span>
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
                      <td className="num" title="মোট ভিউ">{enNum(p.view_count || 0)}</td>
                      <td>
                        <span className={`badge ${p.is_active ? 'badge--ok' : 'badge--mute'}`}>
                          {p.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button type="button" className="btn btn--xs" onClick={() => openEdit(p)} title="এডিট">
                            <IconEdit width={13} height={13} />
                          </button>
                          {canDelete && (
                            <button type="button" className="btn btn--xs btn--danger" onClick={() => setConfirm(p)} title="ডিলিট">
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
          <Pagination page={data.meta?.page || 1} totalPages={data.meta?.totalPages || 1} onChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} wide title={editing ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট'} onClose={() => setModalOpen(false)}>
        <form onSubmit={save}>
          {/* ------------------------------------------------ basics */}
          <div className="form-grid">
            <Field label="প্রোডাক্ট নাম" required>
              <input className="input" value={form.name} onChange={set('name')} required maxLength={180} />
            </Field>
            <Field label="ক্যাটাগরি" required>
              <select className="select" value={form.category_id} onChange={set('category_id')} required>
                <option value="">নির্বাচন করুন</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_bn || c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="SKU" hint="ঐচ্ছিক, ইউনিক কোড">
              <input className="input" value={form.sku} onChange={set('sku')} maxLength={60} />
            </Field>
          </div>

          <Field label="সংক্ষিপ্ত বর্ণনা" hint="প্রোডাক্ট কার্ড ও বিস্তারিত পেজের উপরে দেখাবে">
            <input className="input" value={form.short_description} onChange={set('short_description')} maxLength={300} />
          </Field>
          <Field label="বিস্তারিত বর্ণনা">
            <textarea className="textarea" value={form.description} onChange={set('description')} />
          </Field>

          {/* ------------------------------------------------ pricing */}
          <div className="form-section-title">দাম ও ডিসকাউন্ট</div>
          <div className="form-grid">
            <Field label="আসল দাম (৳)" required>
              <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required />
            </Field>
            <Field label="ডিসকাউন্ট">
              <div className="seg" role="radiogroup" aria-label="ডিসকাউন্টের ধরন">
                {DISCOUNT_TYPES.map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    role="radio"
                    aria-checked={form.discount_type === value}
                    className={`seg__btn${form.discount_type === value ? ' is-on' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, discount_type: value }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {form.discount_type !== 'none' && (
            <div className="discount-box">
              {converted && (
                <p className="mute-2" style={{ marginTop: 0 }}>
                  এই প্রোডাক্টে আগের "আগের দাম" পদ্ধতির ছাড় ছিল — একই দামে নির্দিষ্ট টাকার ছাড়ে রূপান্তর করা হয়েছে।
                </p>
              )}
              <div className="form-grid">
                <Field
                  label={form.discount_type === 'percent' ? 'কত শতাংশ ছাড় (%)' : 'কত টাকা ছাড় (৳)'}
                  required
                  error={form.discount_value !== '' ? problem : null}
                >
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max={form.discount_type === 'percent' ? 100 : form.price || undefined}
                    step="0.01"
                    value={form.discount_value}
                    onChange={set('discount_value')}
                    placeholder={form.discount_type === 'percent' ? '20' : '200'}
                    required
                  />
                </Field>
                <div className="field">
                  <label>কাস্টমার যা দেখবে</label>
                  <div className="discount-box__preview">
                    <b>{enMoney(preview.final)}</b>
                    {preview.hasDiscount && <s>{enMoney(preview.original)}</s>}
                    {preview.hasDiscount && (
                      <span className="badge badge--sale">
                        {form.discount_type === 'fixed' ? `−${enMoney(preview.saved)}` : `−${preview.percent}%`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--xs btn--ghost"
                onClick={() => setForm((f) => ({ ...f, discount_type: 'none', discount_value: '' }))}
              >
                ডিসকাউন্ট সরিয়ে দিন
              </button>
            </div>
          )}

          {/* ------------------------------------------------ inventory + status */}
          <div className="form-section-title">স্টক ও স্ট্যাটাস</div>
          <div className="form-grid">
            <Field label="স্টক পরিমাণ" required>
              <input className="input" type="number" min="0" value={form.stock} onChange={set('stock')} required />
            </Field>
            <Field label="Availability">
              <div style={{ paddingTop: 10 }}>
                <span className={`badge ${availability(form.stock).badge}`}>{availability(form.stock).label}</span>
              </div>
            </Field>
            <Field label="প্রোডাক্ট স্ট্যাটাস">
              <select className="select" value={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: Number(e.target.value) }))}>
                <option value={1}>Active — ওয়েবসাইটে দেখাবে</option>
                <option value={0}>Hidden — লুকানো / ড্রাফট</option>
              </select>
            </Field>
          </div>
          <label className="checkbox" style={{ marginBottom: 12 }}>
            <input type="checkbox" checked={!!form.is_featured} onChange={set('is_featured')} /> ফিচার্ড প্রোডাক্ট হিসেবে দেখান
          </label>

          {/* ------------------------------------------------ media */}
          <div className="form-section-title">ছবি ও ভিডিও</div>
          <Field label="ছবি" hint="URL যোগ করুন অথবা ফাইল আপলোড করুন — প্রথম ছবিটি প্রধান ছবি">
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
                <input type="file" accept="image/*" multiple hidden onChange={(e) => uploadFile(e.target.files)} />
              </label>
            </div>
          </Field>

          {form.images.length > 0 && (
            <div className="row gap-12" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
              {form.images.map((url, i) => (
                <div key={`${url}-${i}`} style={{ position: 'relative', display: 'grid', gap: 4, justifyItems: 'center' }}>
                  <img className="table-thumb" style={{ width: 64, height: 64 }} src={url} alt="" />
                  <button
                    type="button"
                    className="pcard__fav"
                    style={{ top: -6, right: -6, width: 22, height: 22 }}
                    onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, x) => x !== i) }))}
                    aria-label="সরান"
                  >
                    ✕
                  </button>
                  {i === 0 ? (
                    <span className="badge badge--gold" style={{ fontSize: 10 }}>প্রধান</span>
                  ) : (
                    <button type="button" className="btn btn--xs btn--ghost" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => makePrimary(i)}>
                      প্রধান করুন
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <Field label="প্রোডাক্ট ভিডিও (ঐচ্ছিক)" hint="YouTube নয় — সরাসরি MP4/WebM লিংক দিন অথবা আপলোড করুন (সর্বোচ্চ 60MB)">
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="https://…/video.mp4"
                value={form.video_url}
                onChange={set('video_url')}
              />
              <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
                {videoProgress != null ? `আপলোড ${videoProgress}%` : 'ভিডিও আপলোড'}
                <input type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" hidden onChange={(e) => uploadVideo(e.target.files?.[0])} />
              </label>
              {form.video_url && (
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => setForm((f) => ({ ...f, video_url: '' }))}>
                  সরান
                </button>
              )}
            </div>
          </Field>
          {form.video_url && (
            <video src={form.video_url} controls muted playsInline style={{ width: 240, borderRadius: 12, marginBottom: 14, background: '#000' }} />
          )}

          {/* ------------------------------------------------ attributes */}
          <div className="form-section-title">অন্যান্য তথ্য</div>
          <div className="form-grid">
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

          <div className="row gap-8" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModalOpen(false)}>বাতিল</button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving || uploading || videoProgress != null}>
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
