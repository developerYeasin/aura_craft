import { useEffect, useRef, useState } from 'react';
import { IconClose, IconStar, IconSearch, IconCheck, IconAlert } from './Icons.jsx';
import { toBn } from '../../utils/format.js';

export const Loader = ({ label = 'লোড হচ্ছে…' }) => (
  <div className="loading-box">
    <div className="spinner" />
    <span className="mute-2">{label}</span>
  </div>
);

export const Empty = ({ icon: Icon = IconSearch, title = 'কিছু পাওয়া যায়নি', text, action }) => (
  <div className="empty">
    <div className="empty__icon">
      <Icon width={28} height={28} />
    </div>
    <h3 className="t-h3" style={{ marginBottom: 8 }}>{title}</h3>
    {text && <p className="mute-2" style={{ maxWidth: '46ch', marginInline: 'auto' }}>{text}</p>}
    {action}
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <Empty
    icon={IconAlert}
    title="সমস্যা হয়েছে"
    text={message}
    action={
      onRetry && (
        <button type="button" className="btn btn--soft btn--sm" style={{ marginTop: 16 }} onClick={onRetry}>
          আবার চেষ্টা করুন
        </button>
      )
    }
  />
);

export const SkeletonGrid = ({ count = 6 }) => (
  <div className="grid-products">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton skeleton--card" style={{ animationDelay: `${i * 90}ms` }} />
    ))}
  </div>
);

export const Rating = ({ value = 0, count }) => (
  <span className="rating">
    {Array.from({ length: 5 }).map((_, i) => (
      <IconStar key={i} width={13} height={13} style={{ opacity: i < Math.round(value) ? 1 : 0.22 }} />
    ))}
    <span>
      {toBn(Number(value).toFixed(1))}
      {count ? ` (${toBn(count)})` : ''}
    </span>
  </span>
);

/** Section header with eyebrow, ornamental rule and optional right-side action. */
export const SectionHead = ({ eyebrow, title, text, center = false, action, id }) => {
  if (action) {
    return (
      <div className="sec-bar" id={id}>
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 className="t-h2 sec-head__title">{title}</h2>
          {text && <p className="mute-2" style={{ margin: 0 }}>{text}</p>}
        </div>
        {action}
      </div>
    );
  }
  return (
    <header className={`sec-head${center ? ' sec-head--center' : ''}`} id={id}>
      {eyebrow && <span className={`eyebrow${center ? ' eyebrow--both' : ''}`}>{eyebrow}</span>}
      <h2 className="t-h2 sec-head__title">{title}</h2>
      {text && <p>{text}</p>}
      {center && (
        <div className="sec-head__rule">
          <i />
        </div>
      )}
    </header>
  );
};

/** Infinite ticker. `items` = [{ icon: Component, label }] */
export const Marquee = ({ items }) => (
  <div className="marquee" aria-hidden="true">
    <div className="marquee__track">
      {[...items, ...items].map((item, i) => (
        <span className="marquee__item" key={i}>
          <i>
            <item.icon width={17} height={17} />
          </i>
          {item.label}
        </span>
      ))}
    </div>
  </div>
);

export const Pagination = ({ page, totalPages, onChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [1];
  for (let p = page - 1; p <= page + 1; p += 1) if (p > 1 && p < totalPages) pages.push(p);
  if (totalPages > 1) pages.push(totalPages);
  const unique = [...new Set(pages)].sort((a, b) => a - b);

  return (
    <nav className="pagination" aria-label="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="আগের পাতা">
        ‹
      </button>
      {unique.map((p, i) => (
        <span key={p} style={{ display: 'contents' }}>
          {i > 0 && p - unique[i - 1] > 1 && (
            <button type="button" disabled>
              …
            </button>
          )}
          <button type="button" className={p === page ? 'is-active' : ''} onClick={() => onChange(p)}>
            {toBn(p)}
          </button>
        </span>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="পরের পাতা">
        ›
      </button>
    </nav>
  );
};

export const Modal = ({ open, title, onClose, children, wide = false, footer }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal__head">
          <h3 className="t-h3">{title}</h3>
          <button type="button" className="nav__btn" onClick={onClose} aria-label="বন্ধ করুন">
            <IconClose />
          </button>
        </div>
        {children}
        {footer && <div style={{ marginTop: 20 }}>{footer}</div>}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ open, title = 'নিশ্চিত?', text, onConfirm, onCancel, busy }) => (
  <Modal open={open} title={title} onClose={onCancel}>
    <p className="muted">{text}</p>
    <div className="row gap-8" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
        বাতিল
      </button>
      <button type="button" className="btn btn--danger btn--sm" onClick={onConfirm} disabled={busy}>
        {busy ? 'অপেক্ষা করুন…' : 'হ্যাঁ, নিশ্চিত'}
      </button>
    </div>
  </Modal>
);

export const Field = ({ label, required, error, children, hint }) => (
  <div className="field">
    {label && (
      <label>
        {label} {required && <span className="req">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <span className="mute-2">{hint}</span>}
    {error && <span className="field-error">{error}</span>}
  </div>
);

/** Fades content in on scroll. `delay` staggers siblings (ms). */
export const Reveal = ({ children, className = '', as: Tag = 'div', delay = 0, style, ...rest }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -50px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal${visible ? ' is-visible' : ''} ${className}`.trim()}
      style={{ '--d': `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export const ToastIcon = ({ type }) => (
  <i>{type === 'ok' ? <IconCheck width={15} height={15} /> : <IconAlert width={15} height={15} />}</i>
);
