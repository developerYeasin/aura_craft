import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loader } from '../ui/index.jsx';
import NotificationBell from './NotificationBell.jsx';
import {
  IconSparkle, IconLogout, IconMenu, IconClose, IconDashboard, IconGem, IconFolder,
  IconReceipt, IconUsers, IconSettings, IconInfinity, IconStore,
} from '../ui/Icons.jsx';

const LINKS = [
  { to: '/admin', label: 'Dashboard', Icon: IconDashboard, end: true, group: 'Overview' },
  { to: '/admin/products', label: 'Products', Icon: IconGem, group: 'Catalog' },
  { to: '/admin/categories', label: 'Categories', Icon: IconFolder },
  { to: '/admin/orders', label: 'Orders', Icon: IconReceipt, group: 'Sales' },
  { to: '/admin/team', label: 'Team', Icon: IconUsers, group: 'Site' },
  { to: '/admin/settings', label: 'Settings', Icon: IconSettings },
  { to: '/admin/users', label: 'Users', Icon: IconInfinity, immortalOnly: true, group: 'Immortal' },
];

const AdminLayout = () => {
  const { user, loading, logout, isImmortal } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (loading) return <Loader label="যাচাই করা হচ্ছে…" />;
  if (!user) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;

  const links = LINKS.filter((l) => !l.immortalOnly || isImmortal);

  return (
    <div className="admin">
      <aside className={`admin__side${open ? ' is-open' : ''}`}>
        <Link to="/" className="brand" style={{ padding: '4px 10px 18px' }}>
          <span className="brand__mark">
            <IconSparkle width={18} height={18} />
          </span>
          <span>
            <span className="brand__text">AuraCraft</span>
            <span className="brand__sub">Admin</span>
          </span>
        </Link>

        {links.map((link) => (
          <div key={link.to} style={{ display: 'contents' }}>
            {link.group && <span className="admin__label">{link.group}</span>}
            <NavLink
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `admin__link${isActive ? ' is-active' : ''}`}
            >
              <link.Icon width={17} height={17} />
              <span>{link.label}</span>
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
            <span>ওয়েবসাইট দেখুন</span>
          </Link>
          <button type="button" className="admin__link" style={{ width: '100%' }} onClick={logout}>
            <IconLogout width={16} height={16} />
            <span>Logout</span>
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
            aria-label="মেনু"
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
          <NotificationBell />
        </div>
        <Outlet />
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
