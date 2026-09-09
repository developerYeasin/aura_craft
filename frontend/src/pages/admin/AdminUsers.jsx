import { useEffect, useState } from 'react';
import { authApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader, ErrorBox, Modal, ConfirmDialog, Field } from '../../components/ui/index.jsx';
import { IconPlus, IconTrash } from '../../components/ui/Icons.jsx';
import { formatDateTime } from '../../utils/format.js';

const ROLE_BADGE = { immortal: 'badge--pink', admin: 'badge--info', manager: 'badge--mute' };

const AdminUsers = () => {
  const toast = useToast();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    authApi
      .users()
      .then((res) => setUsers(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.createUser(form);
      toast.success('নতুন ইউজার তৈরি হয়েছে');
      setModalOpen(false);
      setForm({ name: '', email: '', password: '', role: 'admin' });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (target) => {
    try {
      await authApi.toggleUser(target.id);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async () => {
    try {
      await authApi.removeUser(confirm.id);
      toast.success('ইউজার ডিলিট হয়েছে');
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
          <h1 className="display t-h2">Immortal — Users</h1>
          <p className="mute-2" style={{ margin: 0 }}>শুধুমাত্র Immortal রোল এই পেজে প্রবেশ করতে পারে</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setModalOpen(true)}>
          <IconPlus width={15} height={15} /> নতুন ইউজার
        </button>
      </div>

      {loading && <Loader />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}{u.id === user.id && <span className="badge badge--mute" style={{ marginLeft: 6 }}>আপনি</span>}</td>
                  <td className="mute-2">{u.email}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge--ok' : 'badge--danger'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="mute-2">{u.last_login_at ? formatDateTime(u.last_login_at) : '—'}</td>
                  <td>
                    <div className="actions-cell">
                      <button type="button" className="btn btn--xs" disabled={u.id === user.id} onClick={() => toggle(u)}>
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button type="button" className="btn btn--xs btn--danger" disabled={u.id === user.id} onClick={() => setConfirm(u)}>
                        <IconTrash width={13} height={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title="নতুন ইউজার" onClose={() => setModalOpen(false)}>
        <form onSubmit={save}>
          <Field label="নাম" required>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="ইমেইল" required>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="পাসওয়ার্ড" required hint="কমপক্ষে ৬ অক্ষর">
            <input
              className="input"
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </Field>
          <Field label="রোল" required>
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Admin — সবকিছু ম্যানেজ করতে পারবে</option>
              <option value="manager">Manager — শুধু ক্যাটালগ ও অর্ডার</option>
              <option value="immortal">Immortal — সর্বোচ্চ অ্যাক্সেস</option>
            </select>
          </Field>
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModalOpen(false)}>বাতিল</button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? 'তৈরি হচ্ছে…' : 'তৈরি করুন'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        text={`"${confirm?.name}" ইউজারটি ডিলিট হয়ে যাবে।`}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default AdminUsers;
