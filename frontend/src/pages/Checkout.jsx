import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { trackEvent } from '../utils/tracking.js';
import { couponApi, deliveryApi, orderApi } from '../api/index.js';
import { getDeviceId } from '../utils/device.js';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useI18n } from '../i18n/index.jsx';
import { Empty, Field } from '../components/ui/index.jsx';
import { money, toBn, PLACEHOLDER_IMAGE } from '../utils/format.js';
import { IconReceipt, IconTruck, IconCheck } from '../components/ui/Icons.jsx';

const PAYMENTS = ['cod', 'bkash', 'nagad'];

const initialForm = {
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  address: '',
  city: '',
  delivery_zone_id: '',
  delivery_area: 'inside_dhaka',
  payment_method: 'cod',
  payment_sender: '',
  payment_trx_id: '',
  note: '',
};

const Checkout = () => {
  const { items, subtotal, clear } = useCart();
  const { settings } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const { t, lang, localName } = useI18n();

  const [form, setForm] = useState({ ...initialForm, website: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [couponDraft, setCouponDraft] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState(null);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    deliveryApi
      .list()
      .then((res) => setZones(res.data || []))
      .catch(() => setZones([]));
  }, []);

  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || items.length === 0) return;
    fired.current = true;
    trackEvent('begin_checkout', {
      value: subtotal,
      items: items.map((i) => ({ item_id: String(i.id), item_name: i.name, price: Number(i.price), quantity: i.quantity })),
    });
  }, [items, subtotal]);

  // With zones configured the area decides the charge. With none (an older API,
  // or every zone removed) checkout falls back to the flat inside/outside rates.
  const useZones = zones.length > 0;
  const zone = zones.find((z) => String(z.id) === String(form.delivery_zone_id)) || null;
  const legacyCharge = Number(
    form.delivery_area === 'outside_dhaka' ? settings.delivery_charge_outside || 120 : settings.delivery_charge_inside || 60
  );
  const delivery = useZones ? (zone ? Number(zone.charge) : null) : legacyCharge;

  const discount = coupon?.discount || 0;
  const productSavings = items.reduce(
    (sum, i) => sum + (i.original_price ? (i.original_price - i.price) * i.quantity : 0),
    0
  );
  const total = subtotal - discount + (delivery || 0);

  // bKash / Nagad are manual Send Money payments: show the store number, collect sender + TrxID.
  const prepaid = form.payment_method !== 'cod';
  const methodName = t(`checkout.${form.payment_method}`);
  const payNumber = prepaid ? settings[`${form.payment_method}_number`] : '';

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(payNumber);
      toast.success(t('checkout.copied'));
    } catch {
      /* clipboard blocked — the number is still visible */
    }
  };

  const groups = [
    { key: 'free', label: t('checkout.groupFree'), zones: zones.filter((z) => Number(z.charge) === 0) },
    { key: 'dhaka', label: t('checkout.groupDhaka'), zones: zones.filter((z) => Number(z.charge) > 0 && z.region === 'inside_dhaka') },
    { key: 'outside', label: t('checkout.groupOutside'), zones: zones.filter((z) => Number(z.charge) > 0 && z.region === 'outside_dhaka') },
  ].filter((g) => g.zones.length);

  const zoneLabel = (z) => {
    const note = lang === 'bn' && z.note ? ` (${z.note})` : '';
    const price = Number(z.charge) === 0 ? t('common.freeDelivery') : money(z.charge);
    return `${localName(z)}${note} — ${price}`;
  };

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
      toast.success(t('checkout.couponApplied', { amount: money(res.data.discount) }));
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
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.customer_name.trim().length < 2) next.customer_name = t('checkout.errName');
    if (!/^[\d+\-\s]{6,}$/.test(form.customer_phone.trim())) next.customer_phone = t('checkout.errPhone');
    if (form.address.trim().length < 5) next.address = t('checkout.errAddress');
    if (form.customer_email && !/^\S+@\S+\.\S+$/.test(form.customer_email)) next.customer_email = t('checkout.errEmail');
    if (useZones && !zone) next.delivery_zone_id = t('checkout.errArea');
    if (prepaid) {
      if (!/^[\d+\-\s]{6,}$/.test(form.payment_sender.trim())) next.payment_sender = t('checkout.errSender');
      if (!/^[A-Za-z0-9]{6,40}$/.test(form.payment_trx_id.trim())) next.payment_trx_id = t('checkout.errTrx');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { delivery_zone_id, payment_sender, payment_trx_id, ...rest } = form;
      const payload = {
        ...rest,
        ...(prepaid ? { payment_sender: payment_sender.trim(), payment_trx_id: payment_trx_id.trim() } : {}),
        ...(zone ? { delivery_zone_id: zone.id, delivery_area: zone.region } : {}),
        customer_email: form.customer_email || undefined,
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity, variant: i.variant })),
        coupon_code: coupon?.code || undefined,
        device_id: getDeviceId(),
        website: form.website || '',
      };
      const res = await orderApi.place(payload);
      clear();
      toast.success(t('checkout.success'));
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
          title={t('checkout.nothing')}
          text={t('checkout.nothingText')}
          action={
            <Link to="/products" className="btn btn--primary btn--sm" style={{ marginTop: 14 }}>
              {t('checkout.viewProducts')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container section--tight">
      <div className="steps">
        <span className="steps__item is-done"><span className="steps__num">{toBn(1)}</span> {t('checkout.stepCart')}</span>
        <span className="steps__bar" />
        <span className="steps__item is-done"><span className="steps__num">{toBn(2)}</span> {t('checkout.stepInfo')}</span>
        <span className="steps__bar" />
        <span className="steps__item"><span className="steps__num">{toBn(3)}</span> {t('checkout.stepDone')}</span>
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
          <h3 style={{ marginBottom: 16 }}>{t('checkout.formTitle')}</h3>

          <div className="form-grid">
            <Field label={t('checkout.name')} required error={errors.customer_name}>
              <input className="input" placeholder={t('checkout.namePh')} autoComplete="name" value={form.customer_name} onChange={set('customer_name')} />
            </Field>
            <Field label={t('checkout.phone')} required error={errors.customer_phone}>
              <input className="input" placeholder="01XXXXXXXXX" inputMode="tel" autoComplete="tel" value={form.customer_phone} onChange={set('customer_phone')} />
            </Field>
          </div>

          <Field label={t('checkout.email')} error={errors.customer_email}>
            <input className="input" placeholder="you@example.com" type="email" autoComplete="email" value={form.customer_email} onChange={set('customer_email')} />
          </Field>

          <Field label={t('checkout.area')} required error={errors.delivery_zone_id}>
            {useZones ? (
              <select className="select" value={form.delivery_zone_id} onChange={set('delivery_zone_id')}>
                <option value="">{t('checkout.areaPh')}</option>
                {groups.map((g) => (
                  <optgroup key={g.key} label={g.label}>
                    {g.zones.map((z) => (
                      <option key={z.id} value={z.id}>{zoneLabel(z)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <select className="select" value={form.delivery_area} onChange={set('delivery_area')}>
                <option value="inside_dhaka">{t('checkout.insideDhaka')} ({money(settings.delivery_charge_inside || 60)})</option>
                <option value="outside_dhaka">{t('checkout.outsideDhaka')} ({money(settings.delivery_charge_outside || 120)})</option>
              </select>
            )}
          </Field>
          {delivery != null && (
            <div className={`delivery-hint ${delivery === 0 ? 'delivery-hint--free' : 'delivery-hint--paid'}`} role="status" key={`${form.delivery_zone_id}-${form.delivery_area}`}>
              {delivery === 0 ? <IconCheck width={16} height={16} /> : <IconTruck width={16} height={16} />}
              <span>{delivery === 0 ? t('checkout.freeHere') : t('checkout.chargeHere', { amount: money(delivery) })}</span>
            </div>
          )}

          <Field label={t('checkout.address')} required error={errors.address}>
            <textarea className="textarea" placeholder={t('checkout.addressPh')} autoComplete="street-address" value={form.address} onChange={set('address')} />
          </Field>

          <div className="form-grid">
            <Field label={t('checkout.city')}>
              <input className="input" placeholder={t('checkout.cityPh')} value={form.city} onChange={set('city')} />
            </Field>
            <Field label={t('checkout.payment')} required>
              <select className="select" value={form.payment_method} onChange={set('payment_method')}>
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>{t(`checkout.${p}`)}</option>
                ))}
              </select>
            </Field>
          </div>

          {prepaid && (
            <div className="pay-box" key={form.payment_method}>
              <b>{t('checkout.payTitle', { method: methodName })}</b>
              {payNumber ? (
                <>
                  <p>{t('checkout.payStep1', { method: methodName, amount: money(total) })}</p>
                  <div className="pay-box__number">
                    <span className="num">{payNumber}</span>
                    <button type="button" className="btn btn--xs" onClick={copyNumber}>{t('checkout.copy')}</button>
                  </div>
                  <p>{t('checkout.payStep2')}</p>
                </>
              ) : (
                <p>{t('checkout.payNoNumber', { method: methodName })}</p>
              )}
              <div className="form-grid">
                <Field label={t('checkout.sender', { method: methodName })} required error={errors.payment_sender}>
                  <input className="input" placeholder="01XXXXXXXXX" inputMode="tel" value={form.payment_sender} onChange={set('payment_sender')} />
                </Field>
                <Field label={t('checkout.trxId')} required error={errors.payment_trx_id}>
                  <input
                    className="input num"
                    placeholder={t('checkout.trxPh')}
                    autoCapitalize="characters"
                    autoComplete="off"
                    value={form.payment_trx_id}
                    onChange={set('payment_trx_id')}
                  />
                </Field>
              </div>
            </div>
          )}

          <Field label={t('checkout.note')}>
            <textarea className="textarea" placeholder={t('checkout.notePh')} value={form.note} onChange={set('note')} />
          </Field>
        </div>

        <div className="card card--pad summary">
          <h3 style={{ marginBottom: 12 }}>{t('checkout.yourOrder')}</h3>
          {items.map((item) => (
            <div className="cart-line" key={`${item.id}-${item.variant || ''}`} style={{ gridTemplateColumns: '48px 1fr auto' }}>
              <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name} style={{ width: 48, height: 48 }} />
              <div>
                <div className="cart-line__name" style={{ fontSize: 13 }}>{item.name}</div>
                <span className="mute-2">
                  {toBn(item.quantity)} × {item.original_price ? <s style={{ marginRight: 4 }}>{money(item.original_price)}</s> : null}
                  {money(item.price)}
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
                  {t('common.remove')}
                </button>
              </div>
            ) : (
              <div className="row gap-8">
                <input
                  className="input"
                  placeholder={t('checkout.couponPh')}
                  value={couponDraft}
                  onChange={(e) => setCouponDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyCoupon(e)}
                />
                <button type="button" className="btn btn--sm" onClick={applyCoupon} disabled={couponBusy || !couponDraft.trim()}>
                  {couponBusy ? '…' : t('checkout.apply')}
                </button>
              </div>
            )}
            {couponError && <p className="field-error" style={{ margin: '6px 0 0' }}>{couponError}</p>}
          </div>

          <div className="summary__row" style={{ marginTop: 10 }}>
            <span>{t('common.subtotal')}</span>
            <span>{money(subtotal)}</span>
          </div>
          {productSavings > 0 && (
            <div className="summary__row summary__row--save">
              <span>{t('checkout.productSavings')}</span>
              <span>{t('product.youSave', { amount: money(productSavings) })}</span>
            </div>
          )}
          <div className={`summary__row${delivery === 0 ? ' summary__row--free' : ''}`}>
            <span>{t('common.deliveryCharge')}{zone ? ` · ${localName(zone)}` : ''}</span>
            <span>
              {delivery == null ? <span className="mute-2">{t('checkout.selectArea')}</span> : delivery === 0 ? t('common.freeDelivery') : money(delivery)}
            </span>
          </div>
          {discount > 0 && (
            <div className="summary__row summary__row--save">
              <span>{t('checkout.couponDiscount', { code: coupon.code })}</span>
              <span>− {money(discount)}</span>
            </div>
          )}
          <div className="summary__row summary__row--total">
            <span>{t('common.total')}</span>
            <span>{money(total)}</span>
          </div>

          <button type="submit" className="btn btn--primary btn--block" style={{ marginTop: 14 }} disabled={submitting}>
            {submitting ? t('checkout.sending') : t('checkout.confirm')}
          </button>
          <p className="mute-2" style={{ marginTop: 10, marginBottom: 0 }}>
            {t('checkout.confirmNote')}
          </p>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
