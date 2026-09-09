import { useEffect, useState } from 'react';
import { settingApi, authApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { Loader, ErrorBox, Field } from '../../components/ui/index.jsx';

const GROUPS = [
  {
    title: 'সাইট পরিচিতি',
    fields: [
      ['site_name', 'সাইটের নাম'],
      ['site_tagline', 'ট্যাগলাইন'],
      ['hero_title', 'হিরো টাইটেল'],
      ['hero_subtitle', 'হিরো সাবটাইটেল', 'textarea'],
      ['offer_title', 'অফার টাইটেল'],
      ['offer_text', 'অফার টেক্সট', 'textarea'],
    ],
  },
  {
    title: 'যোগাযোগ',
    fields: [
      ['contact_phone', 'ফোন'],
      ['contact_email', 'ইমেইল'],
      ['contact_address', 'ঠিকানা'],
    ],
  },
  {
    title: 'সোশ্যাল লিংক',
    fields: [
      ['facebook_url', 'Facebook'],
      ['instagram_url', 'Instagram'],
      ['youtube_url', 'YouTube'],
      ['twitter_url', 'X / Twitter'],
    ],
  },
  {
    title: 'ডেলিভারি চার্জ',
    fields: [
      ['delivery_charge_inside', 'ঢাকার ভেতরে (৳)', 'number'],
      ['delivery_charge_outside', 'ঢাকার বাইরে (৳)', 'number'],
    ],
  },
];

const AdminSettings = () => {
  const toast = useToast();
  const store = useStore();

  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    settingApi
      .get()
      .then((res) => setValues(res.data || {}))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingApi.save(values);
      toast.success('সেটিংস সেভ হয়েছে');
      store.refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    try {
      await authApi.changePassword(pw);
      toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে');
      setPw({ current_password: '', new_password: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <>
      <div className="admin__top">
        <div>
          <h1 className="display t-h2">Settings</h1>
          <p className="mute-2" style={{ margin: 0 }}>সাইটের তথ্য ও কনফিগারেশন</p>
        </div>
      </div>

      <form onSubmit={save}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          {GROUPS.map((group) => (
            <div className="card card--pad" key={group.title}>
              <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>{group.title}</h3>
              {group.fields.map(([key, label, type]) => (
                <Field label={label} key={key}>
                  {type === 'textarea' ? (
                    <textarea className="textarea" value={values[key] || ''} onChange={set(key)} />
                  ) : (
                    <input className="input" type={type || 'text'} value={values[key] || ''} onChange={set(key)} />
                  )}
                </Field>
              ))}
            </div>
          ))}
        </div>

        <button type="submit" className="btn btn--primary btn--sm" style={{ marginTop: 16 }} disabled={saving}>
          {saving ? 'সেভ হচ্ছে…' : 'সেটিংস সেভ করুন'}
        </button>
      </form>

      <div className="card card--pad" style={{ marginTop: 22, maxWidth: 460 }}>
        <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>পাসওয়ার্ড পরিবর্তন</h3>
        <form onSubmit={changePassword}>
          <Field label="বর্তমান পাসওয়ার্ড" required>
            <input
              className="input"
              type="password"
              value={pw.current_password}
              onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
              required
            />
          </Field>
          <Field label="নতুন পাসওয়ার্ড" required hint="কমপক্ষে ৬ অক্ষর">
            <input
              className="input"
              type="password"
              value={pw.new_password}
              onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
              minLength={6}
              required
            />
          </Field>
          <button type="submit" className="btn btn--sm" disabled={pwSaving}>
            {pwSaving ? 'আপডেট হচ্ছে…' : 'পাসওয়ার্ড আপডেট'}
          </button>
        </form>
      </div>
    </>
  );
};

export default AdminSettings;
