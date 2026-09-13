import { NavLink } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../hooks/useWishlist.js';
import { useI18n } from '../../i18n/index.jsx';
import { IconStore, IconGrid, IconCart, IconHeart, IconTruck } from '../ui/Icons.jsx';

/** App-style bottom navigation for phones. Hidden above 720px by CSS. */
const MobileTabBar = () => {
  const { count } = useCart();
  const wishlist = useWishlist();
  const { t } = useI18n();

  const tabs = [
    { to: '/', label: t('common.home'), Icon: IconStore, end: true },
    { to: '/products', label: t('nav.tabShop'), Icon: IconGrid },
    { to: '/cart', label: t('common.cart'), Icon: IconCart, badge: count },
    { to: '/wishlist', label: t('nav.tabSaved'), Icon: IconHeart, badge: wishlist.count },
    { to: '/track', label: t('nav.tabTrack'), Icon: IconTruck },
  ];

  return (
    <nav className="tabbar" aria-label={t('common.menu')}>
      {tabs.map(({ to, label, Icon, end, badge }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tabbar__item${isActive ? ' is-active' : ''}`}>
          <span className="tabbar__icon">
            <Icon width={21} height={21} />
            {badge > 0 && <span className="tabbar__badge">{badge > 99 ? '99+' : badge}</span>}
          </span>
          <span className="tabbar__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileTabBar;
