import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  IconBell, IconBellOff, IconVolume, IconVolumeOff, IconCheck,
  IconTrash, IconReceipt, IconAlert, IconSparkle,
} from '../ui/Icons.jsx';
import { toBn } from '../../utils/format.js';

const TYPE_ICON = { order: IconReceipt, low_stock: IconAlert, system: IconSparkle };

/** "৫ মিনিট আগে" style relative time. */
const timeAgo = (value) => {
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diff < 60) return 'এইমাত্র';
  if (diff < 3600) return `${toBn(Math.floor(diff / 60))} মিনিট আগে`;
  if (diff < 86400) return `${toBn(Math.floor(diff / 3600))} ঘণ্টা আগে`;
  return `${toBn(Math.floor(diff / 86400))} দিন আগে`;
};

const NotificationBell = () => {
  const {
    items, unread, connected, permission, soundOn, pushReady,
    markRead, markAllRead, clearAll, enablePush, toggleSound, test,
  } = useNotifications();
  const toast = useToast();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = (n) => {
    if (!n.is_read) markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const askPermission = async () => {
    setEnabling(true);
    try {
      const res = await enablePush();
      if (!res.ok) toast.error(res.message);
      else if (res.partial) toast.toast(res.message, 'error');
      else toast.success(res.message);
    } finally {
      setEnabling(false);
    }
  };

  return (
    <div className="notif" ref={wrapRef}>
      <button
        type="button"
        className={`nav__btn${unread ? ' has-unread' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={`নোটিফিকেশন${unread ? ` (${unread} টি নতুন)` : ''}`}
        aria-expanded={open}
      >
        <IconBell />
        {unread > 0 && <span className="nav__count">{unread > 99 ? '99+' : toBn(unread)}</span>}
        <span className={`notif__dot${connected ? ' is-live' : ''}`} title={connected ? 'লাইভ' : 'সংযোগ নেই'} />
      </button>

      {open && (
        <div className="notif__panel">
          <header className="notif__head">
            <div>
              <b>নোটিফিকেশন</b>
              <span className="mute-2" style={{ display: 'block' }}>
                {connected ? 'লাইভ সংযুক্ত' : 'সংযোগের চেষ্টা চলছে…'}
                {unread > 0 && ` · ${toBn(unread)} টি নতুন`}
              </span>
            </div>
            <div className="row gap-8">
              <button
                type="button"
                className="nav__btn"
                style={{ width: 32, height: 32 }}
                onClick={toggleSound}
                aria-label={soundOn ? 'সাউন্ড বন্ধ করুন' : 'সাউন্ড চালু করুন'}
                title={soundOn ? 'সাউন্ড চালু' : 'সাউন্ড বন্ধ'}
              >
                {soundOn ? <IconVolume width={15} height={15} /> : <IconVolumeOff width={15} height={15} />}
              </button>
            </div>
          </header>

          {(permission !== 'granted' || !pushReady) && (
            <div className="notif__prompt">
              <IconBellOff width={16} height={16} />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13 }}>
                  {permission === 'granted' ? 'ব্রাউজার পুশ রেজিস্টার হয়নি' : 'ব্রাউজার নোটিফিকেশন বন্ধ'}
                </b>
                <span className="mute-2" style={{ display: 'block' }}>
                  ট্যাব বন্ধ থাকলেও নতুন অর্ডারের খবর পেতে চালু করুন।
                </span>
              </div>
              <button type="button" className="btn btn--primary btn--xs" onClick={askPermission} disabled={enabling}>
                {enabling ? 'চেষ্টা চলছে…' : 'চালু করুন'}
              </button>
            </div>
          )}

          <div className="notif__list">
            {items.length === 0 && (
              <div className="notif__empty">
                <IconBell width={22} height={22} />
                <span className="mute-2">এখনো কোনো নোটিফিকেশন নেই</span>
              </div>
            )}
            {items.map((n) => {
              const Icon = TYPE_ICON[n.type] || IconSparkle;
              return (
                <button
                  type="button"
                  key={n.id}
                  className={`notif__item${n.is_read ? '' : ' is-unread'}`}
                  onClick={() => openItem(n)}
                >
                  <span className={`notif__ico notif__ico--${n.type}`}>
                    <Icon width={15} height={15} />
                  </span>
                  <span className="notif__body">
                    <b>{n.title}</b>
                    {n.body && <span>{n.body}</span>}
                    <em>{timeAgo(n.created_at)}</em>
                  </span>
                </button>
              );
            })}
          </div>

          <footer className="notif__foot">
            <button type="button" className="btn btn--ghost btn--xs" onClick={markAllRead} disabled={!unread}>
              <IconCheck width={13} height={13} /> সব পড়া হয়েছে
            </button>
            <button type="button" className="btn btn--ghost btn--xs" onClick={() => test()}>
              টেস্ট
            </button>
            <button type="button" className="btn btn--ghost btn--xs" onClick={clearAll} disabled={!items.length}>
              <IconTrash width={13} height={13} /> মুছুন
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
