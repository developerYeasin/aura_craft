import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '../utils/tracking.js';
import { couponApi } from '../api/index.js';
import { getDeviceId } from '../utils/device.js';
import { Link, useNavigate } from 'react-router-dom';
import { orderApi } from '../api/index.js';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Empty, Field, SectionHead } from '../components/ui/index.jsx';
import { money, toBn, PLACEHOLDER_IMAGE } from '../utils/format.js';
import { IconReceipt } from '../components/ui/Icons.jsx';

const PAYMENTS = [
  { value: 'cod', label: 'ক্যাশ অন ডেলিভারি' },
  { value: 'bkash', label: 'বিকাশ' },
  { value: 'nagad', label: 'নগদ' },
];

const initialForm = {
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  address: '',
  city: '',
  delivery_area: 'inside_dhaka',
  payment_method: 'cod',
  note: '',
};

const Checkout = () => {
  const { items, subtotal, clear } = useCart();
  const { settings } = useStore();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ ...initialForm, website: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [couponDraft, setCouponDraft] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState(null);

  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || items.length === 0) return;
    fired.current = true;
    trackEvent('begin_checkout', {
      value: subtotal,
      items: items.map((i) => ({ item_id: String(i.id), item_name: i.name, price: Number(i.price), quantity: i.quantity })),
    });
  }, [items, subtotal]);

  const insideCharge = Number(settings.delivery_charge_inside || 60);
  const outsideCharge = Number(settings.delivery_charge_outside || 120);
  const delivery = form.delivery_area === 'outside_dhaka' ? outsideCharge : insideCharge;
  const discount = coupon?.discount || 0;
  const total = subtotal - discount + delivery;

  /** Preview only — the server re-checks the code and decides the real price. */
  const applyCoupon = async (e) => {
    e.preventDefault();
    const code = couponDraft.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await couponApi.validate({ code, subtotal, phone: form.customer_phone || undefined });
      setCoupon(res.data);
      toast.success(`কুপন প্রয়োগ হয়েছে — ${money(res.data.discount)} ছাড়`);
    } catch (err) {
      setCoupon(null);
      setCouponError(err.message);
    } finally {
      setCouponBusy(false);
    }
  };

  const clearCoupon = () => {
    setCoupon(null);
    setCouponDraft('');
    setCouponError(null);
  };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.customer_name.trim().length < 2) next.customer_name = 'নাম লিখুন';
    if (!/^[\d+\-\s]{6,}$/.test(form.customer_phone.trim())) next.customer_phone = 'সঠিক মোবাইল নম্বর দিন';
    if (form.address.trim().length < 5) next.address = 'সম্পূর্ণ ঠিকানা লিখুন';
    if (form.customer_email && !/^\S+@\S+\.\S+$/.test(form.customer_email)) next.customer_email = 'সঠিক ইমেইল দিন';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        customer_email: form.customer_email || undefined,
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity, variant: i.variant })),
        coupon_code: coupon?.code || undefined,
        device_id: getDeviceId(),
        website: form.website || '',
      };
      const res = await orderApi.place(payload);
      clear();
      toast.success('অর্ডার সফলভাবে সম্পন্ন হয়েছে!');
      navigate(`/order-success/${res.data.order_code}`, { state: { order: res.data } });
    } catch (err) {
      toast.error(err.message);
      if (err.errors) {
        setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container section">
        <Empty
          icon={IconReceipt}
          title="চেকআউট করার মতো কিছু নেই"
          text="আগে কার্টে প্রোডাক্ট যোগ করুন।"
          action={
            <Link to="/products" className="btn btn--primary btn--sm" style={{ marginTop: 14 }}>
              প্রোডাক্ট দেখুন
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container section--tight">
      <div className="steps">
        <span className="steps__item is-done"><span className="steps__num">১</span> কার্ট</span>
        <span className="steps__bar" />
        <span className="steps__item is-done"><span className="steps__num">২</span> তথ্য দিন</span>
        <span className="steps__bar" />
        <span className="steps__item"><span className="steps__num">৩</span> সম্পন্ন</span>
      </div>

      <form className="checkout-grid" onSubmit={submit} noValidate>
        {/* Honeypot: hidden from people and from screen readers, filled by bots. */}
        <input
          type="text"
          name="website"
          className="hp-field"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={form.website}
          onChange={set('website')}
        />
        <div className="card card--pad">
          <h3 style={{ marginBottom: 16 }}>অর্ডার ফর্ম</h3>

          <div className="form-grid">
            <Field label="নাম" required error={errors.customer_name}>
              <input className="input" placeholder="আপনার নাম" value={form.customer_name} onChange={set('customer_name')} />
            </Field>
            <Field label="মোবাইল নম্বর" required error={errors.customer_phone}>
              <input className="input" placeholder="01XXXXXXXXX" value={form.customer_phone} onChange={set('customer_phone')} />
            </Field>
          </div>

          <Field label="ইমেইল (ঐচ্ছিক)" error={errors.customer_email}>
            <input className="input" placeholder="you@example.com" value={form.customer_email} onChange={set('customer_email')} />
          </Field>

          <Field label="ঠিকানা" required error={errors.address}>
            <textarea className="textarea" placeholder="বাসা/রোড/এলাকা সহ সম্পূর্ণ ঠিকানা" value={form.address} onChange={set('address')} />
          </Field>

          <div className="form-grid">
            <Field label="শহর / জেলা">
              <input className="input" placeholder="ঢাকা" value={form.city} onChange={set('city')} />
            </Field>
            <Field label="ডেলিভারি এলাকা" required>
              <select className="select" value={form.delivery_area} onChange={set('delivery_area')}>
                <option value="inside_dhaka">ঢাকার ভেতরে ({money(insideCharge)})</option>
                <option value="outside_dhaka">ঢাকার বাইরে ({money(outsideCharge)})</option>
              </select>
            </Field>
          </div>

          <Field label="পেমেন্ট মেথড" required>
            <select className="select" value={form.payment_method} onChange={set('payment_method')}>
              {PAYMENTS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>

          <Field label="অতিরিক্ত নোট (ঐচ্ছিক)">
            <textarea className="textarea" placeholder="বিশেষ কোনো নির্দেশনা থাকলে লিখুন" value={form.note} onChange={set('note')} />
          </Field>
        </div>

        <div className="card card--pad summary">
          <h3 style={{ marginBottom: 12 }}>আপনার অর্ডার</h3>
          {items.map((item) => (
            <div className="cart-line" key={`${item.id}-${item.variant || ''}`} style={{ gridTemplateColumns: '48px 1fr auto' }}>
              <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name} style={{ width: 48, height: 48 }} />
              <div>
                <div className="cart-line__name" style={{ fontSize: 13 }}>{item.name}</div>
                <span className="mute-2">
                  {toBn(item.quantity)} × {money(item.price)}
                  {item.variant ? ` · ${item.variant}` : ''}
                </span>
              </div>
              <b style={{ fontFamily: 'var(--font-ui)', fontSize: 13 }}>{money(item.price * item.quantity)}</b>
            </div>
          ))}

          <div className="coupon-box">
            {coupon ? (
              <div className="spread">
                <span className="badge badge--ok num">{coupon.code}</span>
                <button type="button" className="btn btn--xs btn--ghost" onClick={clearCoupon}>
                  সরান
                </button>
              </div>
            ) : (
              <div className="row gap-8">
                <input
                  className="input"
                  placeholder="কুপন কোড"
                  value={couponDraft}
                  onChange={(e) => setCouponDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyCoupon(e)}
                />
                <button type="button" className="btn btn--sm" onClick={applyCoupon} disabled={couponBusy || !couponDraft.trim()}>
                  {couponBusy ? '…' : 'প্রয়োগ'}
                </button>
              </div>
            )}
            {couponError && <p className="field-error" style={{ margin: '6px 0 0' }}>{couponError}</p>}
          </div>

          <div className="summary__row" style={{ marginTop: 10 }}>
            <span>সাবটোটাল</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="summary__row">
            <span>ডেলিভারি চার্জ</span>
            <span>{money(delivery)}</span>
          </div>
          {discount > 0 && (
            <div className="summary__row">
              <span>ছাড় ({coupon.code})</span>
              <span>− {money(discount)}</span>
            </div>
          )}
          <div className="summary__row summary__row--total">
            <span>সর্বমোট</span>
            <span>{money(total)}</span>
          </div>

          <button type="submit" className="btn btn--primary btn--block" style={{ marginTop: 14 }} disabled={submitting}>
            {submitting ? 'পাঠানো হচ্ছে…' : 'অর্ডার নিশ্চিত করুন'}
          </button>
          <p className="mute-2" style={{ marginTop: 10, marginBottom: 0 }}>
            অর্ডার নিশ্চিত করলে আমাদের টিম কল করে কনফার্ম করবে।
          </p>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
