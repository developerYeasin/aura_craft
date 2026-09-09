import { useEffect, useState } from 'react';
import { teamApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader, ErrorBox, Modal, ConfirmDialog, Field, Empty } from '../../components/ui/index.jsx';
import { IconEdit, IconTrash, IconPlus, IconUsers } from '../../components/ui/Icons.jsx';

const emptyForm = {
  name: '',
  role: '',
  bio: '',
  photo_url: '',
  facebook_url: '',
  instagram_url: '',
  twitter_url: '',
  youtube_url: '',
  sort_order: 0,
  is_active: 1,
};

const AdminTeam = () => {
  const toast = useToast();
  const { canDelete } = useAuth();

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
    teamApi
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
    setForm({ ...emptyForm, sort_order: items.length });
    setModalOpen(true);
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({ ...emptyForm, ...member });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) };
      ['id', 'created_at', 'updated_at'].forEach((k) => delete payload[k]);
      if (editing) await teamApi.update(editing.id, payload);
      else await teamApi.create(payload);
      toast.success(editing ? 'মেম্বার আপডেট হয়েছে' : 'নতুন মেম্বার যোগ হয়েছে');
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
      await teamApi.remove(confirm.id);
      toast.success('মেম্বার ডিলিট হয়েছে');
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
          <h1 className="display t-h2">Team</h1>
          <p className="mute-2" style={{ margin: 0 }}>টিম পেজে যাঁদের দেখানো হবে</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
          <IconPlus width={15} height={15} /> নতুন মেম্বার
        </button>
      </div>

      {loading && <Loader />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <Empty icon={IconUsers} title="কোনো মেম্বার নেই" />}

      {!loading && !error && items.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td>
                    <img
                      className="table-thumb"
                      style={{ borderRadius: '50%' }}
                      src={m.photo_url || `https://ui-avatars.com/api/?background=2b1b45&color=fff&name=${encodeURIComponent(m.name)}`}
                      alt={m.name}
                    />
                  </td>
                  <td>{m.name}</td>
                  <td className="mute-2">{m.role}</td>
                  <td>
                    <span className={`badge ${m.is_active ? 'badge--ok' : 'badge--mute'}`}>
                      {m.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button type="button" className="btn btn--xs" onClick={() => openEdit(m)}>
                        <IconEdit width={13} height={13} />
                      </button>
                      {canDelete && (
                        <button type="button" className="btn btn--xs btn--danger" onClick={() => setConfirm(m)}>
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

      <Modal open={modalOpen} title={editing ? 'মেম্বার এডিট' : 'নতুন মেম্বার'} onClose={() => setModalOpen(false)}>
        <form onSubmit={save}>
          <div className="form-grid">
            <Field label="নাম" required>
              <input className="input" value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="পদবি" required>
              <input className="input" value={form.role} onChange={set('role')} required />
            </Field>
            <Field label="সাজানোর ক্রম">
              <input className="input" type="number" value={form.sort_order} onChange={set('sort_order')} />
            </Field>
          </div>
          <Field label="ছবি URL">
            <input className="input" value={form.photo_url || ''} onChange={set('photo_url')} />
          </Field>
          <Field label="সংক্ষিপ্ত পরিচিতি">
            <textarea className="textarea" value={form.bio || ''} onChange={set('bio')} />
          </Field>
          <div className="form-grid">
            <Field label="Facebook"><input className="input" value={form.facebook_url || ''} onChange={set('facebook_url')} /></Field>
            <Field label="Instagram"><input className="input" value={form.instagram_url || ''} onChange={set('instagram_url')} /></Field>
            <Field label="X / Twitter"><input className="input" value={form.twitter_url || ''} onChange={set('twitter_url')} /></Field>
            <Field label="YouTube"><input className="input" value={form.youtube_url || ''} onChange={set('youtube_url')} /></Field>
          </div>
          <label className="checkbox" style={{ marginBottom: 14 }}>
            <input type="checkbox" checked={!!form.is_active} onChange={set('is_active')} /> টিম পেজে দেখান
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
        text={`"${confirm?.name}" ডিলিট হয়ে যাবে।`}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default AdminTeam;
