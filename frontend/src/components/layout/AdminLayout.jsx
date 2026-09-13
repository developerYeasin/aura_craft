import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader } from '../ui/index.jsx';
import NotificationBell from './NotificationBell.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import { useI18n } from '../../i18n/index.jsx';
import BackToTop from '../ui/BackToTop.jsx';
import BrandLogo from '../ui/BrandLogo.jsx';
import {
  IconLogout, IconMenu, IconClose, IconSun, IconMoon, IconDashboard, IconGem, IconFolder, IconTag,
  IconReceipt, IconUsers, IconSettings, IconInfinity, IconStore, IconShield, IconTrendUp, IconBox, IconTruck,
} from '../ui/Icons.jsx';

// `key` and `group` are admin.* translation keys.
const LINKS = [
  { to: '/admin', key: 'dashboard', Icon: IconDashboard, end: true, group: 'overview' },
  { to: '/admin/products', key: 'products', Icon: IconGem, group: 'catalog' },
  { to: '/admin/categories', key: 'categories', Icon: IconFolder },
  { to: '/admin/media', key: 'media', Icon: IconBox },
  { to: '/admin/orders', key: 'orders', Icon: IconReceipt, group: 'sales' },
  { to: '/admin/customers', key: 'customers', Icon: IconUsers },
  { to: '/admin/coupons', key: 'coupons', Icon: IconTag },
  { to: '/admin/delivery', key: 'delivery', Icon: IconTruck },
  { to: '/admin/fraud', key: 'fraud', Icon: IconShield, group: 'protection' },
  { to: '/admin/marketing', key: 'marketing', Icon: IconTrendUp, group: 'growth' },
  { to: '/admin/team', key: 'team', Icon: IconUsers, group: 'site' },
  { to: '/admin/settings', key: 'settings', Icon: IconSettings },
  { to: '/admin/users', key: 'users', Icon: IconInfinity, immortalOnly: true, group: 'immortal' },
];

const AdminLayout = () => {
  const { user, loading, logout, isImmortal } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const { t } = useI18n();

  if (loading) return <Loader label="যাচাই করা হচ্ছে…" />;
  if (!user) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;

  const links = LINKS.filter((l) => !l.immortalOnly || isImmortal);
  const themeLabel = theme === 'dark' ? t('common.lightMode') : t('common.darkMode');

  return (
    <div className="admin">
      <aside className={`admin__side${open ? ' is-open' : ''}`}>
        <Link to="/" className="brand" style={{ padding: '4px 10px 18px' }}>
          <BrandLogo sub="Admin" size={34} />
        </Link>

        {links.map((link) => (
          <div key={link.to} style={{ display: 'contents' }}>
            {link.group && <span className="admin__label">{t(`admin.${link.group}`)}</span>}
            <NavLink
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `admin__link${isActive ? ' is-active' : ''}`}
            >
              <link.Icon width={17} height={17} />
              <span>{t(`admin.${link.key}`)}</span>
            </NavLink>
          </div>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <div className="admin__user">
            <span className="admin__avatar">{user.name.charAt(0).toUpperCase()}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{user.name}</div>
              <span className="mute-2">{user.role}</span>
            </div>
          </div>
          <Link to="/" className="admin__link">
            <IconStore width={17} height={17} />
            <span>{t('admin.viewSite')}</span>
          </Link>
          <button type="button" className="admin__link" style={{ width: '100%' }} onClick={logout}>
            <IconLogout width={16} height={16} />
            <span>{t('admin.logout')}</span>
          </button>
        </div>
      </aside>

      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      <div className="admin__main">
        <div className="admin__bar">
          <button
            type="button"
            className="nav__btn nav__burger"
            onClick={() => setOpen((v) => !v)}
            aria-label={t('admin.menu')}
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
          <LanguageSwitcher />
          <button
            type="button"
            className="nav__btn"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <NotificationBell />
        </div>
        <Outlet />
        <BackToTop threshold={400} />
      </div>
    </div>
  );
};

/**
 * Route guard for pages that need a specific role. Without it, a plain `admin`
 * reaching /admin/users (e.g. by typing the URL) would render the page and then
 * show a raw 403 error card instead of being sent somewhere useful.
 */
export const RequireRole = ({ roles, children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader label="যাচাই করা হচ্ছে…" />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/admin" replace />;
  return children;
};

export default AdminLayout;
