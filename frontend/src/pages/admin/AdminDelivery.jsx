import { useEffect, useState } from 'react';
import { deliveryApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader, ErrorBox, Modal, ConfirmDialog, Field, Empty } from '../../components/ui/index.jsx';
import ClearAllButton from '../../components/ui/ClearAll.jsx';
import { IconEdit, IconTrash, IconPlus, IconTruck } from '../../components/ui/Icons.jsx';
import { enMoney, enNum } from '../../utils/format.js';

const blank = { name: '', name_bn: '', region: 'inside_dhaka', charge: '0', note: '', sort_order: 0, is_active: 1 };

const REGION = { inside_dhaka: 'ঢাকার ভেতরে', outside_dhaka: 'ঢাকার বাইরে' };

const AdminDelivery = () => {
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
    deliveryApi
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
    setForm({ ...blank, sort_order: items.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (zone) => {
    setEditing(zone);
    setForm({
      name: zone.name,
      name_bn: zone.name_bn || '',
      region: zone.region,
      charge: String(Number(zone.charge)),
      note: zone.note || '',
      sort_order: zone.sort_order,
      is_active: zone.is_active,
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      charge: Number(form.charge || 0),
      sort_order: Number(form.sort_order || 0),
      name_bn: form.name_bn || null,
      note: form.note || null,
    };
    try {
      if (editing) await deliveryApi.update(editing.id, payload);
      else await deliveryApi.create(payload);
      toast.success(editing ? 'এলাকা আপডেট হয়েছে' : 'নতুন এলাকা যোগ হয়েছে');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /** Quick on/off from the table without opening the form. */
  const toggleActive = async (zone) => {
    try {
      await deliveryApi.update(zone.id, { is_active: zone.is_active ? 0 : 1 });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async () => {
    try {
      await deliveryApi.remove(confirm.id);
      toast.success('এলাকা ডিলিট হয়েছে');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const freeCount = items.filter((z) => Number(z.charge) === 0 && z.is_active).length;

  return (
    <>
      <div className="admin__top">
        <div>
          <h1 className="display t-h2">Delivery Zones</h1>
          <p className="mute-2" style={{ margin: 0 }}>
            চেকআউটে কাস্টমার এলাকা বাছাই করলে এখানকার চার্জ স্বয়ংক্রিয়ভাবে বসবে · {enNum(freeCount)} টি ফ্রি ডেলিভারি এলাকা চালু
          </p>
        </div>
        <div className="admin__actions">
          <ClearAllButton
            section="delivery_zones"
            label="Delivery Zones"
            warning="সব এলাকা মুছে গেলে চেকআউট Settings-এর 'ঢাকার ভেতরে/বাইরে' ফ্ল্যাট চার্জে ফিরে যাবে।"
            onCleared={load}
          />
          <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
            <IconPlus width={15} height={15} /> নতুন এলাকা
          </button>
        </div>
      </div>

      {loading && <Loader />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && (
        <Empty
          icon={IconTruck}
          title="কোনো ডেলিভারি এলাকা নেই"
          text="এলাকা না থাকলে চেকআউটে Settings-এর ফ্ল্যাট ডেলিভারি চার্জ ব্যবহার হবে।"
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Area</th>
                <th>Region</th>
                <th>Charge</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((z) => (
                <tr key={z.id}>
                  <td>
                    <b>{z.name_bn || z.name}</b>
                    <div className="mute-2">
                      {z.name}
                      {z.note ? ` · ${z.note}` : ''}
                    </div>
                  </td>
                  <td className="mute-2">{REGION[z.region]}</td>
                  <td className="num">
                    {Number(z.charge) === 0 ? (
                      <span className="badge badge--freeship">Free Delivery</span>
                    ) : (
                      enMoney(z.charge)
                    )}
                  </td>
                  <td className="num">{enNum(z.sort_order)}</td>
                  <td>
                    <label className="switch" title={z.is_active ? 'চালু' : 'বন্ধ'}>
                      <input type="checkbox" checked={!!z.is_active} onChange={() => toggleActive(z)} />
                      <i />
                    </label>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button type="button" className="btn btn--xs" onClick={() => openEdit(z)}>
                        <IconEdit width={13} height={13} />
                      </button>
                      {canDelete && (
                        <button type="button" className="btn btn--xs btn--danger" onClick={() => setConfirm(z)}>
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

      <Modal open={modalOpen} title={editing ? 'এলাকা এডিট' : 'নতুন ডেলিভারি এলাকা'} onClose={() => setModalOpen(false)}>
        <form onSubmit={save}>
          <div className="form-grid">
            <Field label="এলাকার নাম (English)" required>
              <input className="input" value={form.name} onChange={set('name')} required placeholder="Mohammadpur" />
            </Field>
            <Field label="এলাকার নাম (বাংলা)">
              <input className="input" value={form.name_bn} onChange={set('name_bn')} placeholder="মোহাম্মদপুর" />
            </Field>
            <Field label="অঞ্চল" required>
              <select className="select" value={form.region} onChange={set('region')}>
                <option value="inside_dhaka">ঢাকার ভেতরে</option>
                <option value="outside_dhaka">ঢাকার বাইরে</option>
              </select>
            </Field>
            <Field label="ডেলিভারি চার্জ (৳)" required hint="০ দিলে চেকআউটে “Free Delivery” দেখাবে">
              <input className="input" type="number" min="0" step="1" value={form.charge} onChange={set('charge')} required />
            </Field>
            <Field label="নোট" hint="যেমন: যেকোনো এলাকা">
              <input className="input" value={form.note} onChange={set('note')} />
            </Field>
            <Field label="সাজানোর ক্রম">
              <input className="input" type="number" value={form.sort_order} onChange={set('sort_order')} />
            </Field>
          </div>
          <label className="checkbox" style={{ marginBottom: 14 }}>
            <input type="checkbox" checked={!!form.is_active} onChange={set('is_active')} /> চেকআউটে দেখান
          </label>
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
        text={`"${confirm?.name_bn || confirm?.name}" এলাকাটি ডিলিট হয়ে যাবে। আগের অর্ডারে এলাকার নাম থেকে যাবে।`}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default AdminDelivery;
