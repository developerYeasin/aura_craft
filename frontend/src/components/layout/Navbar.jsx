import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../hooks/useWishlist.js';
import { useTheme } from '../../hooks/useTheme.js';
import {
  IconCart, IconSearch, IconUser, IconMenu, IconClose, IconHeart, IconSun, IconMoon,
  IconStore, IconGrid, IconUsers,
  IconPlus, IconTruck, categoryIcon,
} from '../ui/Icons.jsx';

const HEAD_LINKS = [
  { to: '/', label: 'হোম', Icon: IconStore, end: true },
  { to: '/products', label: 'সব প্রোডাক্ট', Icon: IconGrid },
];

// Staff entry points are deliberately NOT listed here — the admin panel is reached
// by typing /admin directly, so the storefront never advertises a login target.
const TAIL_LINKS = [
  { to: '/upcoming', label: 'ভবিষ্যতে যুক্ত হবে', Icon: IconPlus },
  { to: '/track', label: 'অর্ডার ট্র্যাক', Icon: IconTruck },
  { to: '/team', label: 'টিম/মেম্বার', Icon: IconUsers },
];

const Navbar = () => {
  const { navCategories, settings } = useStore();
  const { count } = useCart();
  const wishlist = useWishlist();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [term, setTerm] = useState('');

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
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const links = [
    ...HEAD_LINKS,
    ...navCategories.map((c) => ({
      to: `/category/${c.slug}`,
      label: c.name_bn || c.name,
      Icon: categoryIcon(c.slug),
    })),
    ...TAIL_LINKS,
  ];

  const submitSearch = (e) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    navigate(`/products?search=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setTerm('');
  };

  return (
    <>
      <div className="scroll-progress" style={{ width: `${progress}%` }} />

      <div className="topbar">
        <IconTruck width={14} height={14} />
        <span>সারা বাংলাদেশে দ্রুত ডেলিভারি · ঢাকায় ২৪ ঘণ্টায় · ক্যাশ অন ডেলিভারি</span>
      </div>

      <header className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
        <div className="container nav__inner">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true">A</span>
            <span>
              <span className="brand__text">{settings.site_name || 'AuraCraft'}</span>
              <span className="brand__sub">Elegance</span>
            </span>
          </Link>

          <nav className="nav__links">
            <div className="drawer__tools">
              <button type="button" className="btn btn--sm" onClick={toggleTheme}>
                {theme === 'dark' ? <IconSun width={15} height={15} /> : <IconMoon width={15} height={15} />}
                {theme === 'dark' ? 'লাইট মোড' : 'ডার্ক মোড'}
              </button>
              <Link to="/wishlist" className="btn btn--sm" onClick={() => setDrawerOpen(false)}>
                <IconHeart width={15} height={15} /> পছন্দের তালিকা
                {wishlist.count > 0 && ` (${wishlist.count})`}
              </Link>
            </div>
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
            <button type="button" className="nav__btn" onClick={() => setSearchOpen((v) => !v)} aria-label="সার্চ">
              {searchOpen ? <IconClose /> : <IconSearch />}
            </button>
            <button
              type="button"
              className="nav__btn nav__btn--tuck"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড চালু করুন'}
              title={theme === 'dark' ? 'লাইট মোড' : 'ডার্ক মোড'}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <Link to="/wishlist" className="nav__btn nav__btn--tuck" aria-label="পছন্দের তালিকা">
              <IconHeart />
              {wishlist.count > 0 && <span className="nav__count">{wishlist.count}</span>}
            </Link>
            <Link to="/track" className="nav__btn nav__btn--tuck" aria-label="অর্ডার ট্র্যাক">
              <IconUser />
            </Link>
            <Link to="/cart" className="nav__btn" aria-label="কার্ট">
              <IconCart />
              {count > 0 && <span className="nav__count">{count}</span>}
            </Link>
            <button
              type="button"
              className="nav__btn nav__burger"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label="মেনু"
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
                    placeholder="প্রোডাক্ট খুঁজুন… (যেমন: রিং, পারফিউম, ব্রেসলেট)"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn--primary">
                  সার্চ
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
              <span className="eyebrow">মেনু</span>
              <button type="button" className="nav__btn" onClick={() => setDrawerOpen(false)} aria-label="বন্ধ">
                <IconClose />
              </button>
            </div>
            <div className="drawer__tools">
              <button type="button" className="btn btn--sm" onClick={toggleTheme}>
                {theme === 'dark' ? <IconSun width={15} height={15} /> : <IconMoon width={15} height={15} />}
                {theme === 'dark' ? 'লাইট মোড' : 'ডার্ক মোড'}
              </button>
              <Link to="/wishlist" className="btn btn--sm" onClick={() => setDrawerOpen(false)}>
                <IconHeart width={15} height={15} /> পছন্দের তালিকা
                {wishlist.count > 0 && ` (${wishlist.count})`}
              </Link>
            </div>
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
    </>
  );
};

export default Navbar;
