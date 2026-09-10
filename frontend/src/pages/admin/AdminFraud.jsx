import { useEffect, useState } from 'react';
import { fraudApi, settingApi } from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Loader, ErrorBox, Field, Empty, ConfirmDialog, Pagination } from '../../components/ui/index.jsx';
import { IconShield, IconTrash, IconPlus, IconSearch, IconRefresh } from '../../components/ui/Icons.jsx';
import { enMoney, enNum, formatDateTime } from '../../utils/format.js';

const TABS = [
  { key: 'settings', label: 'Settings' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'blocked', label: 'Blocked Orders' },
  { key: 'lists', label: 'Block / Allow Lists' },
  { key: 'log', label: 'Activity Log' },
];

const LAYERS = [
  ['fraud_layer_honeypot', 'Honeypot / bot trap', 'চেকআউটে অদৃশ্য একটি ঘর — বট সেটি পূরণ করলেই ব্লক।'],
  ['fraud_layer_ip_limit', 'IP rate limit', 'এক IP থেকে নির্দিষ্ট সময়ে বেশি অর্ডার এলে ঝুঁকি বাড়ে।'],
  ['fraud_layer_device', 'Device fingerprint', 'আগে ব্লক হওয়া ডিভাইস থেকে অর্ডার এলে ধরা পড়ে।'],
  ['fraud_layer_cooldown', 'Processing cooldown', 'একই নম্বর থেকে খুব দ্রুত পরপর অর্ডার।'],
  ['fraud_layer_phone_limit', 'Order limit per phone', 'দিনে এক নম্বরে সর্বোচ্চ কয়টি অর্ডার।'],
  ['fraud_layer_courier', 'Courier history check', 'কুরিয়ারে ডেলিভারি সাকসেস রেট কম হলে (bdcourier)।'],
  ['fraud_layer_vpn', 'VPN / Proxy detection', 'VPN, প্রক্সি বা ডেটাসেন্টার IP শনাক্ত (ip-api.com)।'],
];

const WEIGHTS = [
  ['fraud_weight_ip', 'IP limit'],
  ['fraud_weight_device', 'Device'],
  ['fraud_weight_cooldown', 'Cooldown'],
  ['fraud_weight_phone', 'Phone limit'],
  ['fraud_weight_courier', 'Courier'],
  ['fraud_weight_vpn', 'VPN'],
];

const LIMITS = [
  ['fraud_max_per_ip_hour', 'এক IP থেকে ঘণ্টায় সর্বোচ্চ অর্ডার'],
  ['fraud_min_minutes_between', 'দুই অর্ডারের মধ্যে সর্বনিম্ন বিরতি (মিনিট)'],
  ['fraud_max_per_phone_day', 'একই নম্বরে দৈনিক সর্বোচ্চ অর্ডার'],
  ['fraud_duplicate_window_minutes', 'একই অঙ্কের ডুপ্লিকেট অর্ডার ব্লক (মিনিট)'],
  ['fraud_max_order_total', 'সর্বোচ্চ অর্ডার মূল্য (৳, ০ = সীমা নেই)'],
  ['fraud_min_success_ratio', 'সর্বনিম্ন কুরিয়ার সাকসেস রেট (%, ০ = ব্লক করবে না)'],
];

const ACTION_BADGE = {
  blocked: { label: 'Blocked', badge: 'badge--danger' },
  test_blocked: { label: 'Test block', badge: 'badge--warn' },
  flagged: { label: 'Flagged', badge: 'badge--info' },
  allowed: { label: 'Allowed', badge: 'badge--ok' },
};

const Toggle = ({ label, hint, checked, onChange }) => (
  <div className="fraud-row">
    <div>
      <b>{label}</b>
      {hint && <span className="mute-2">{hint}</span>}
    </div>
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked ? '1' : '0')} />
      <i />
    </label>
  </div>
);

const AdminFraud = () => {
  const toast = useToast();
  const [tab, setTab] = useState('settings');

  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState({ items: [], meta: {} });
  const [eventPage, setEventPage] = useState(1);
  const [eventSearch, setEventSearch] = useState('');
  const [lists, setLists] = useState([]);
  const [listForm, setListForm] = useState({ list_type: 'block', value_type: 'phone', value: '', note: '' });
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }));
  const setField = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const isOn = (key) => values[key] === '1';

  const loadSettings = () => {
    setLoading(true);
    setError(null);
    Promise.all([settingApi.getAdmin(), fraudApi.defaults()])
      .then(([saved, defaults]) => setValues({ ...defaults.data, ...(saved.data || {}) }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadSettings, []);

  const loadStats = () => fraudApi.stats({ days: 30 }).then((res) => setStats(res.data)).catch(() => {});
  const loadLists = () => fraudApi.lists().then((res) => setLists(res.data || [])).catch(() => {});
  const loadEvents = (action) =>
    fraudApi
      .events({ page: eventPage, limit: 25, ...(action ? { action } : {}), ...(eventSearch ? { search: eventSearch } : {}) })
      .then((res) => setEvents({ items: res.data || [], meta: res.meta }))
      .catch(() => {});

  // Each tab fetches only what it shows.
  useEffect(() => {
    if (tab === 'dashboard') loadStats();
    if (tab === 'lists') loadLists();
    if (tab === 'blocked') loadEvents('blocked');
    if (tab === 'log') loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, eventPage, eventSearch]);

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await settingApi.save(values);
      toast.success('ফ্রড সেটিংস সেভ হয়েছে');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addListEntry = async (e) => {
    e.preventDefault();
    if (!listForm.value.trim()) return;
    setBusy(true);
    try {
      await fraudApi.addListEntry(listForm);
      toast.success('তালিকায় যোগ হয়েছে');
      setListForm({ ...listForm, value: '', note: '' });
      loadLists();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const blockFromEvent = async (event, valueType) => {
    try {
      const res = await fraudApi.blockFromEvent(event.id, { value_type: valueType });
      toast.success(res.data.already ? 'আগেই ব্লক করা আছে' : `ব্লক করা হয়েছে — ${res.data.blocked}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBox message={error} onRetry={loadSettings} />;

  const master = isOn('fraud_enabled');

  return (
    <>
      <div className="admin__top">
        <div>
          <div className="row gap-12">
            <h1 className="display t-h2">Fraud Prevention</h1>
            <span className={`badge ${master ? 'badge--ok' : 'badge--mute'}`}>{master ? 'On' : 'Off'}</span>
            {isOn('fraud_test_mode') && <span className="badge badge--warn">Test mode</span>}
          </div>
          <p className="mute-2" style={{ margin: 0 }}>ভুয়া ও অপব্যবহারমূলক অর্ডার ঠেকানোর নিয়ন্ত্রণ</p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? 'is-active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------ settings */}
      {tab === 'settings' && (
        <form onSubmit={save}>
          <div className="card card--pad" style={{ marginBottom: 16 }}>
            <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 6 }}>General</h3>
            <Toggle
              label="Enable fraud prevention"
              hint="সব চেকের মাস্টার সুইচ।"
              checked={master}
              onChange={set('fraud_enabled')}
            />
            <Toggle
              label="Test mode"
              hint="ব্লক করবে না — শুধু রেকর্ড করবে কোনটি ব্লক হতো। প্রথম কয়েক দিন এটি রাখুন।"
              checked={isOn('fraud_test_mode')}
              onChange={set('fraud_test_mode')}
            />
            <Toggle
              label="Trust proxy headers"
              hint="Cloudflare/Nginx-এর পেছনে থাকলে চালু রাখুন, নইলে আসল IP পাওয়া যাবে না।"
              checked={isOn('fraud_trust_proxy')}
              onChange={set('fraud_trust_proxy')}
            />
            <div className="fraud-row">
              <div>
                <b>Auto-unblock after (days)</b>
                <span className="mute-2">০ = ম্যানুয়াল ব্লক কখনো নিজে থেকে খুলবে না।</span>
              </div>
              <input
                className="input"
                style={{ width: 110 }}
                type="number"
                min="0"
                value={values.fraud_auto_unblock_days || '0'}
                onChange={setField('fraud_auto_unblock_days')}
              />
            </div>
            <div className="fraud-row">
              <div>
                <b>Risk threshold</b>
                <span className="mute-2">স্কোর এই সীমা ছাড়ালে অর্ডার ব্লক হবে।</span>
              </div>
              <input
                className="input"
                style={{ width: 110 }}
                type="number"
                min="1"
                value={values.fraud_risk_threshold || '50'}
                onChange={setField('fraud_risk_threshold')}
              />
            </div>
          </div>

          <div className="card card--pad" style={{ marginBottom: 16 }}>
            <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 6 }}>Check Layers</h3>
            {LAYERS.map(([key, label, hint]) => (
              <Toggle key={key} label={label} hint={hint} checked={isOn(key)} onChange={set(key)} />
            ))}
            <Toggle
              label="Validate Bangladeshi phone"
              hint="01XXXXXXXXX ছাড়া অন্য নম্বর সরাসরি বাতিল।"
              checked={isOn('fraud_validate_phone')}
              onChange={set('fraud_validate_phone')}
            />
          </div>

          <div className="dash-grid" style={{ marginBottom: 16 }}>
            <div className="card card--pad">
              <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>Limits</h3>
              {LIMITS.map(([key, label]) => (
                <Field label={label} key={key}>
                  <input className="input" type="number" min="0" value={values[key] ?? ''} onChange={setField(key)} />
                </Field>
              ))}
            </div>

            <div className="card card--pad">
              <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 6 }}>Risk Score Weights</h3>
              <p className="mute-2">প্রতিটি লেয়ার ধরা পড়লে কত পয়েন্ট যোগ হবে।</p>
              {WEIGHTS.map(([key, label]) => (
                <div className="weight-row" key={key}>
                  <div className="spread">
                    <span>{label}</span>
                    <b className="num">{enNum(values[key] ?? 0)}</b>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Number(values[key] ?? 0)}
                    onChange={setField(key)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="card card--pad" style={{ marginBottom: 16 }}>
            <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>Block Screen Content</h3>
            <p className="mute-2" style={{ marginTop: -8 }}>অর্ডার ব্লক হলে কাস্টমার এই বার্তা দেখবে।</p>
            <div className="form-grid">
              <Field label="Title (বাংলা)">
                <input className="input" value={values.fraud_block_title_bn || ''} onChange={setField('fraud_block_title_bn')} />
              </Field>
              <Field label="Title (English)">
                <input className="input" value={values.fraud_block_title_en || ''} onChange={setField('fraud_block_title_en')} />
              </Field>
              <Field label="Description (বাংলা)">
                <textarea className="textarea" value={values.fraud_block_desc_bn || ''} onChange={setField('fraud_block_desc_bn')} />
              </Field>
              <Field label="Description (English)">
                <textarea className="textarea" value={values.fraud_block_desc_en || ''} onChange={setField('fraud_block_desc_en')} />
              </Field>
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? 'সেভ হচ্ছে…' : 'Save Settings'}
          </button>
        </form>
      )}

      {/* ----------------------------------------------------------- dashboard */}
      {tab === 'dashboard' && (
        !stats ? <Loader /> : (
          <>
            <div className="stat-grid">
              <div className="card stat stat--danger">
                <div className="stat__value">{enNum(stats.totals.blocked)}</div>
                <div className="stat__label">Blocked (৩০ দিনে)</div>
              </div>
              <div className="card stat stat--warn">
                <div className="stat__value">{enNum(stats.totals.test_blocked)}</div>
                <div className="stat__label">Test mode-এ ব্লক হতো</div>
              </div>
              <div className="card stat">
                <div className="stat__value">{enNum(stats.totals.flagged)}</div>
                <div className="stat__label">Flagged (পাস করেছে)</div>
              </div>
              <div className="card stat">
                <div className="stat__value">{enMoney(stats.totals.blocked_value)}</div>
                <div className="stat__label">আটকানো অর্ডারের মূল্য</div>
              </div>
              <div className="card stat">
                <div className="stat__value">{enNum(stats.listCounts.blocklist)}</div>
                <div className="stat__label">Blocklist এন্ট্রি</div>
              </div>
              <div className="card stat">
                <div className="stat__value">{enNum(stats.listCounts.allowlist)}</div>
                <div className="stat__label">Allowlist এন্ট্রি</div>
              </div>
            </div>

            <div className="dash-grid">
              <div className="card card--pad">
                <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>সবচেয়ে বেশি যে কারণে ব্লক</h3>
                {stats.topReasons.length === 0 ? (
                  <p className="mute-2" style={{ margin: 0 }}>এখনো কিছু ব্লক হয়নি।</p>
                ) : (
                  <ul className="rank">
                    {stats.topReasons.map((r) => (
                      <li key={r.reason}>
                        <span className="num">{r.reason}</span>
                        <span className="badge badge--danger num">{enNum(r.count)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card card--pad">
                <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>বারবার চেষ্টা করা নম্বর</h3>
                {stats.repeatOffenders.length === 0 ? (
                  <p className="mute-2" style={{ margin: 0 }}>কেউ বারবার চেষ্টা করেনি।</p>
                ) : (
                  <ul className="rank">
                    {stats.repeatOffenders.map((r) => (
                      <li key={r.phone}>
                        <div>
                          <b className="num">{r.phone}</b>
                          <span className="mute-2">{formatDateTime(r.last_attempt)}</span>
                        </div>
                        <span className="badge badge--warn num">{enNum(r.attempts)} বার</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )
      )}

      {/* ------------------------------------------------- blocked + activity log */}
      {(tab === 'blocked' || tab === 'log') && (
        <>
          <div className="toolbar">
            <form
              className="search-wrap"
              onSubmit={(e) => {
                e.preventDefault();
                setEventPage(1);
                setEventSearch(e.target.elements.q.value.trim());
              }}
            >
              <IconSearch width={17} height={17} />
              <input className="input" name="q" placeholder="ফোন, IP বা কারণ দিয়ে খুঁজুন…" defaultValue={eventSearch} />
            </form>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => loadEvents(tab === 'blocked' ? 'blocked' : undefined)}>
              <IconRefresh width={14} height={14} /> রিফ্রেশ
            </button>
          </div>

          {events.items.length === 0 ? (
            <Empty icon={IconShield} title={tab === 'blocked' ? 'কোনো ব্লক হওয়া অর্ডার নেই' : 'কোনো রেকর্ড নেই'} />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Customer</th>
                      <th>IP / Device</th>
                      <th>Score</th>
                      <th>Reasons</th>
                      <th>Action</th>
                      <th>Block</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.items.map((ev) => {
                      const a = ACTION_BADGE[ev.action] || { label: ev.action, badge: '' };
                      return (
                        <tr key={ev.id}>
                          <td className="mute-2 num">{formatDateTime(ev.created_at)}</td>
                          <td>
                            {ev.customer_name || '—'}
                            <div className="mute-2 num">{ev.phone || '—'}</div>
                            {ev.order_total != null && <div className="faint num">{enMoney(ev.order_total)}</div>}
                          </td>
                          <td className="mute-2 num">
                            {ev.ip_address || '—'}
                            <div className="faint num">{ev.device_id || '—'}</div>
                          </td>
                          <td className="num">
                            <span className={`badge ${ev.score >= 50 ? 'badge--danger' : ev.score > 0 ? 'badge--warn' : 'badge--mute'}`}>
                              {enNum(ev.score)}
                            </span>
                          </td>
                          <td className="mute-2">{ev.reasons || '—'}</td>
                          <td><span className={`badge ${a.badge}`}>{a.label}</span></td>
                          <td>
                            <div className="actions-cell">
                              {ev.phone && (
                                <button type="button" className="btn btn--xs" onClick={() => blockFromEvent(ev, 'phone')}>
                                  ফোন
                                </button>
                              )}
                              {ev.ip_address && (
                                <button type="button" className="btn btn--xs" onClick={() => blockFromEvent(ev, 'ip')}>
                                  IP
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
              <Pagination
                page={events.meta?.page || 1}
                totalPages={events.meta?.totalPages || 1}
                onChange={setEventPage}
              />
            </>
          )}
        </>
      )}

      {/* --------------------------------------------------------------- lists */}
      {tab === 'lists' && (
        <>
          <form className="card card--pad" style={{ marginBottom: 16 }} onSubmit={addListEntry}>
            <h3 className="t-h3" style={{ fontSize: 17, marginBottom: 14 }}>নতুন এন্ট্রি</h3>
            <div className="form-grid">
              <Field label="তালিকা">
                <select className="select" value={listForm.list_type} onChange={(e) => setListForm({ ...listForm, list_type: e.target.value })}>
                  <option value="block">Block (ব্লক করুন)</option>
                  <option value="allow">Allow (সবসময় অনুমতি)</option>
                </select>
              </Field>
              <Field label="ধরন">
                <select className="select" value={listForm.value_type} onChange={(e) => setListForm({ ...listForm, value_type: e.target.value })}>
                  <option value="phone">ফোন নম্বর</option>
                  <option value="ip">IP অ্যাড্রেস</option>
                  <option value="device">ডিভাইস আইডি</option>
                </select>
              </Field>
              <Field label="মান" required>
                <input className="input" value={listForm.value} onChange={(e) => setListForm({ ...listForm, value: e.target.value })} placeholder="01712345678" />
              </Field>
              <Field label="নোট">
                <input className="input" value={listForm.note} onChange={(e) => setListForm({ ...listForm, note: e.target.value })} />
              </Field>
            </div>
            <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
              <IconPlus width={14} height={14} /> যোগ করুন
            </button>
          </form>

          {lists.length === 0 ? (
            <Empty icon={IconShield} title="তালিকা খালি" />
          ) : (
            <div className="table-wrap">
              <table className="data" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th>List</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Note</th>
                    <th>Added</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lists.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <span className={`badge ${l.list_type === 'block' ? 'badge--danger' : 'badge--ok'}`}>
                          {l.list_type === 'block' ? 'Block' : 'Allow'}
                        </span>
                      </td>
                      <td className="mute-2">{l.value_type}</td>
                      <td className="num">{l.value}</td>
                      <td className="mute-2">{l.note || '—'}</td>
                      <td className="mute-2 num">{formatDateTime(l.created_at)}</td>
                      <td>
                        <button type="button" className="btn btn--xs btn--danger" onClick={() => setConfirm(l)}>
                          <IconTrash width={13} height={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirm}
        text={`"${confirm?.value}" তালিকা থেকে সরে যাবে।`}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await fraudApi.removeListEntry(confirm.id);
          setConfirm(null);
          loadLists();
          toast.success('সরানো হয়েছে');
        }}
      />
    </>
  );
};

export default AdminFraud;
