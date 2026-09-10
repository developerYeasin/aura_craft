import { useEffect, useState } from 'react';
import { settingApi } from '../../api/index.js';
import { API_URL } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Loader, ErrorBox, Field } from '../../components/ui/index.jsx';
import { IconCheck, IconSearch, IconTag, IconTrendUp, IconStore } from '../../components/ui/Icons.jsx';

/** Feed URLs are served by the API, not the storefront, so they are built from API_URL. */
const feedUrl = (file) => `${API_URL.replace(/\/$/, '')}/${file}`;

const CopyField = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure origin / permissions) — the field is still selectable.
      setCopied(false);
    }
  };
  return (
    <div className="row gap-8">
      <input className="input num" readOnly value={value} onFocus={(e) => e.target.select()} />
      <button type="button" className="btn btn--sm" onClick={copy} title="কপি করুন">
        {copied ? <IconCheck width={14} height={14} /> : 'কপি'}
      </button>
    </div>
  );
};

const Section = ({ icon: Icon, title, text, children }) => (
  <div className="card card--pad" style={{ marginBottom: 16 }}>
    <div className="row gap-12" style={{ marginBottom: text ? 6 : 14 }}>
      {Icon && <Icon width={17} height={17} style={{ color: 'var(--accent)' }} />}
      <h3 className="t-h3" style={{ fontSize: 17 }}>{title}</h3>
    </div>
    {text && <p className="mute-2" style={{ marginBottom: 14 }}>{text}</p>}
    {children}
  </div>
);

const AdminMarketing = () => {
  const toast = useToast();
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    settingApi
      .getAdmin()
      .then((res) => setValues(res.data || {}))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const toggle = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.checked ? '1' : '0' }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingApi.save(values);
      toast.success('মার্কেটিং সেটিংস সেভ হয়েছে');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <>
      <div className="admin__top">
        <div>
          <h1 className="display t-h2">SEO &amp; Marketing</h1>
          <p className="mute-2" style={{ margin: 0 }}>সার্চ ইঞ্জিন, ক্যাটালগ ফিড ও অ্যাড ট্র্যাকিং</p>
        </div>
      </div>

      <form onSubmit={save}>
        <Section
          icon={IconSearch}
          title="Sitemap ও robots.txt"
          text="Google Search Console-এ এই সাইটম্যাপ যোগ করলে সব প্রোডাক্ট ও ক্যাটাগরি ইনডেক্স হবে। ফিডগুলো লাইভ ক্যাটালগ থেকে তৈরি হয়, তাই দাম বা স্টক বদলালে নিজে থেকেই আপডেট হয়।"
        >
          <Field label="Sitemap URL">
            <CopyField value={feedUrl('sitemap.xml')} />
          </Field>
          <Field label="robots.txt">
            <CopyField value={feedUrl('robots.txt')} />
          </Field>
        </Section>

        <Section icon={IconTag} title="ক্যাটালগ ফিড" text="Facebook Commerce Manager ও TikTok Catalog-এ এই URL বসিয়ে দিন — শিডিউল করা ফেচে প্রোডাক্ট নিজে থেকেই আপডেট হবে।">
          <Field label="Facebook Data Feed">
            <CopyField value={feedUrl('facebook-feed.xml')} />
          </Field>
          <Field label="TikTok Data Feed">
            <CopyField value={feedUrl('tiktok-feed.xml')} />
          </Field>
        </Section>

        <Section icon={IconTrendUp} title="Google Tag Manager ও Analytics">
          <div className="form-grid">
            <Field label="GTM ID" hint="GTM-XXXXXXX">
              <input className="input" value={values.gtm_id || ''} onChange={set('gtm_id')} placeholder="GTM-XXXXXXX" />
            </Field>
            <Field label="Google Analytics 4 ID" hint="G-XXXXXXXXXX">
              <input className="input" value={values.ga4_id || ''} onChange={set('ga4_id')} placeholder="G-XXXXXXXXXX" />
            </Field>
          </div>
        </Section>

        <Section icon={IconStore} title="Auto Tracking">
          <div className="fraud-row">
            <div>
              <b>স্টোরফ্রন্ট নিজে থেকে Pixel / TikTok ইভেন্ট পাঠাবে</b>
              <span className="mute-2">
                GTM দিয়ে ট্র্যাকিং সেট করে থাকলে এটি <b>বন্ধ</b> রাখুন — নইলে একই ইভেন্ট দুবার যাবে এবং পারচেজ ডাবল
                গোনা হয়ে অ্যাডের পারফরম্যান্স নষ্ট করবে। GTM ব্যবহার না করলেই কেবল চালু করুন।
              </span>
            </div>
            <label className="switch">
              <input type="checkbox" checked={values.auto_tracking === '1'} onChange={toggle('auto_tracking')} />
              <i />
            </label>
          </div>
        </Section>

        <Section icon={IconTag} title="Facebook Pixel ও Conversion API">
          <div className="form-grid">
            <Field label="Pixel ID">
              <input className="input" value={values.meta_pixel_id || ''} onChange={set('meta_pixel_id')} />
            </Field>
            <Field label="Pixel Access Token" hint="সার্ভার-সাইড ইভেন্টের জন্য (Conversion API)">
              <input className="input" type="password" value={values.meta_capi_token || ''} onChange={set('meta_capi_token')} />
            </Field>
            <Field label="Test Event Code" hint="শুধু টেস্টের সময় — শেষে মুছে ফেলুন">
              <input className="input" value={values.meta_test_event_code || ''} onChange={set('meta_test_event_code')} />
            </Field>
          </div>
        </Section>

        <Section icon={IconTag} title="TikTok Pixel ও Events API">
          <div className="form-grid">
            <Field label="TikTok Pixel ID">
              <input className="input" value={values.tiktok_pixel_id || ''} onChange={set('tiktok_pixel_id')} />
            </Field>
            <Field label="TikTok Access Token">
              <input className="input" type="password" value={values.tiktok_api_token || ''} onChange={set('tiktok_api_token')} />
            </Field>
            <Field label="Test Event Code">
              <input className="input" value={values.tiktok_test_event_code || ''} onChange={set('tiktok_test_event_code')} />
            </Field>
          </div>
        </Section>

        <Section icon={IconTrendUp} title="Microsoft Clarity" text="ফ্রি হিটম্যাপ ও সেশন রেকর্ডিং। Clarity → Settings → Overview থেকে প্রোজেক্ট আইডি নিন।">
          <Field label="Clarity Project ID">
            <input className="input" value={values.clarity_id || ''} onChange={set('clarity_id')} placeholder="abcd1234ef" />
          </Field>
        </Section>

        <Section icon={IconSearch} title="SEO মেটা">
          <div className="form-grid">
            <Field label="স্টোর URL" hint="সাইটম্যাপ ও ফিডে এই ঠিকানা ব্যবহার হবে">
              <input className="input" value={values.store_url || ''} onChange={set('store_url')} placeholder="https://auracraft.bizscal.com" />
            </Field>
            <Field label="Meta title">
              <input className="input" value={values.seo_title || ''} onChange={set('seo_title')} />
            </Field>
          </div>
          <Field label="Meta description" hint="সার্চ রেজাল্টে দেখানো বর্ণনা — ১৬০ অক্ষরের মধ্যে রাখুন">
            <textarea className="textarea" value={values.seo_description || ''} onChange={set('seo_description')} />
          </Field>
          <Field label="Google site verification">
            <input className="input" value={values.google_verification || ''} onChange={set('google_verification')} />
          </Field>
        </Section>

        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? 'সেভ হচ্ছে…' : 'Update'}
        </button>
      </form>
    </>
  );
};

export default AdminMarketing;
