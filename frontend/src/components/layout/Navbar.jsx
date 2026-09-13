import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../hooks/useWishlist.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useI18n } from '../../i18n/index.jsx';
import BrandLogo from '../ui/BrandLogo.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import CartDrawer from './CartDrawer.jsx';
import {
  IconCart, IconSearch, IconUser, IconMenu, IconClose, IconHeart, IconSun, IconMoon,
  IconStore, IconGrid, IconUsers,
  IconPlus, IconTruck, categoryIcon,
} from '../ui/Icons.jsx';

const HEAD_LINKS = [
  { to: '/', key: 'common.home', Icon: IconStore, end: true },
  { to: '/products', key: 'common.allProducts', Icon: IconGrid },
];

// Staff entry points are deliberately NOT listed here — the admin panel is reached
// by typing /admin directly, so the storefront never advertises a login target.
const TAIL_LINKS = [
  { to: '/upcoming', key: 'common.upcoming', Icon: IconPlus },
  { to: '/track', key: 'common.trackOrder', Icon: IconTruck },
  { to: '/team', key: 'common.team', Icon: IconUsers },
];

const Navbar = () => {
  const { navCategories, settings } = useStore();
  const { count } = useCart();
  const wishlist = useWishlist();
  const { theme, toggle: toggleTheme } = useTheme();
  const { t, localName } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const closeCart = useCallback(() => setCartOpen(false), []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 14);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (y / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setSearchOpen(false);
    setCartOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const links = [
    ...HEAD_LINKS.map((l) => ({ ...l, label: t(l.key) })),
    ...navCategories.map((c) => ({
      to: `/category/${c.slug}`,
      label: localName(c),
      Icon: categoryIcon(c.slug),
    })),
    ...TAIL_LINKS.map((l) => ({ ...l, label: t(l.key) })),
  ];

  const submitSearch = (e) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    navigate(`/products?search=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setTerm('');
  };

  const themeLabel = theme === 'dark' ? t('common.lightMode') : t('common.darkMode');

  const tools = (
    <div className="drawer__tools">
      <button type="button" className="btn btn--sm" onClick={toggleTheme}>
        {theme === 'dark' ? <IconSun width={15} height={15} /> : <IconMoon width={15} height={15} />}
        {themeLabel}
      </button>
      <Link to="/wishlist" className="btn btn--sm" onClick={() => setDrawerOpen(false)}>
        <IconHeart width={15} height={15} /> {t('common.wishlist')}
        {wishlist.count > 0 && ` (${wishlist.count})`}
      </Link>
      <LanguageSwitcher />
    </div>
  );

  return (
    <>
      <div className="scroll-progress" style={{ width: `${progress}%` }} />

      <div className="topbar">
        <IconTruck width={14} height={14} />
        <span>{t('nav.topbar')}</span>
      </div>

      <header className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
        <div className="container nav__inner">
          <Link to="/" className="brand" aria-label={settings.site_name || 'Aura Craft'}>
            <BrandLogo name={settings.site_name || 'Aura Craft'} sub={t('nav.tagline')} size={36} />
          </Link>

          <nav className="nav__links">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav__actions">
            <LanguageSwitcher className="nav__btn--tuck" />
            <button type="button" className="nav__btn" onClick={() => setSearchOpen((v) => !v)} aria-label={t('common.search')}>
              {searchOpen ? <IconClose /> : <IconSearch />}
            </button>
            <button
              type="button"
              className="nav__btn nav__btn--tuck"
              onClick={toggleTheme}
              aria-label={themeLabel}
              title={themeLabel}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <Link to="/wishlist" className="nav__btn nav__btn--tuck" aria-label={t('common.wishlist')}>
              <IconHeart />
              {wishlist.count > 0 && <span className="nav__count">{wishlist.count}</span>}
            </Link>
            <Link to="/track" className="nav__btn nav__btn--tuck" aria-label={t('common.trackOrder')}>
              <IconUser />
            </Link>
            <button type="button" className="nav__btn" onClick={() => setCartOpen(true)} aria-label={t('common.cart')}>
              <IconCart />
              {count > 0 && <span className="nav__count">{count}</span>}
            </button>
            <button
              type="button"
              className="nav__btn nav__burger"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={t('common.menu')}
            >
              {drawerOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="nav__search">
            <form className="container" onSubmit={submitSearch}>
              <div className="toolbar" style={{ margin: 0 }}>
                <div className="search-wrap">
                  <IconSearch width={17} height={17} />
                  <input
                    className="input"
                    autoFocus
                    placeholder={t('common.searchPlaceholder')}
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn--primary">
                  {t('common.search')}
                </button>
              </div>
            </form>
          </div>
        )}
      </header>

      {drawerOpen && (
        <>
          <div className="overlay" onClick={() => setDrawerOpen(false)} />
          <aside className="drawer">
            <div className="spread" style={{ marginBottom: 18 }}>
              <span className="eyebrow">{t('common.menu')}</span>
              <button type="button" className="nav__btn" onClick={() => setDrawerOpen(false)} aria-label={t('common.close')}>
                <IconClose />
              </button>
            </div>
            {tools}
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `drawer__link${isActive ? ' is-active' : ''}`}
              >
                <span className="drawer__ico">
                  <link.Icon width={15} height={15} />
                </span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </aside>
        </>
      )}

      <CartDrawer open={cartOpen} onClose={closeCart} />
    </>
  );
};

export default Navbar;
