import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n/index.jsx';
import { IconClose, IconEye } from '../ui/Icons.jsx';
import { toBn } from '../../utils/format.js';
import {
  PROFILE_FIELDS, PROFILE_SECTIONS, PROFILE_LINKS, SHOW_VIEW_COUNT, avatarFor, hasValue,
} from '../../data/team.config.js';

/**
 * Full team member profile. Closes on the close button, a backdrop click or ESC;
 * focus moves into the dialog on open and back to the card on close.
 */
const TeamProfileModal = ({ member, onClose }) => {
  const { t, lang } = useI18n();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!member) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
    // Re-run only when a different member opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.id]);

  if (!member) return null;

  const label = (l) => l?.[lang] || l?.en || '';
  const fields = PROFILE_FIELDS.filter((f) => hasValue(member[f.key]));
  const sections = PROFILE_SECTIONS.filter((s) => hasValue(member[s.key]));
  const links = PROFILE_LINKS.filter((l) => hasValue(member[l.key]));
  const views = Number(member.profile_view_count) || 0;

  return createPortal(
    <div className="tp-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="tp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tp-name"
        tabIndex={-1}
        ref={dialogRef}
      >
        <button type="button" className="nav__btn tp__close" onClick={onClose} aria-label={t('team.close')}>
          <IconClose />
        </button>

        <aside className="tp__side">
          <div className="tp__photo">
            <img src={member.photo_url || avatarFor(member.name)} alt={member.name} />
          </div>
          <h2 id="tp-name" className="tp__name">{member.name}</h2>
          {hasValue(member.role) && <div className="tp__role">{member.role}</div>}
          {hasValue(member.tag) && <span className="tp__tag">{member.tag}</span>}
          {SHOW_VIEW_COUNT && views > 0 && (
            <span className="tp__views">
              <IconEye width={13} height={13} /> {t('team.views', { n: toBn(views) })}
            </span>
          )}
        </aside>

        <div className="tp__main">
          <span className="eyebrow">{t('team.profile')}</span>

          {fields.length > 0 && (
            <dl className="tp__facts">
              {fields.map((f) => (
                <div key={f.key}>
                  <dt>{label(f.label)}</dt>
                  <dd>{f.key === 'joined_year' ? toBn(member[f.key]) : member[f.key]}</dd>
                </div>
              ))}
            </dl>
          )}

          {sections.map((s) => (
            <section key={s.key} className="tp__section">
              <h3>{label(s.title)}</h3>
              {s.list ? (
                <ul className="tp__list">
                  {String(member[s.key])
                    .split(/\r?\n/)
                    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
                    .filter(Boolean)
                    .map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              ) : (
                <p>{member[s.key]}</p>
              )}
            </section>
          ))}

          {links.length > 0 && (
            <section className="tp__section">
              <h3>{t('team.contact')}</h3>
              <div className="tp__links">
                {links.map(({ key, label: linkLabel, Icon, short, href }) => {
                  const value = String(member[key]).trim();
                  const external = !href;
                  return (
                    <a
                      key={key}
                      href={href ? href(value) : value}
                      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className="tp__link"
                    >
                      <span className="tp__link-ico">{Icon ? <Icon width={15} height={15} /> : <b>{short}</b>}</span>
                      <span>{href ? value : linkLabel}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TeamProfileModal;
