import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext.jsx';
import { useI18n } from '../../i18n/index.jsx';
import BrandLogo from '../ui/BrandLogo.jsx';
import {
  IconFacebook, IconInstagram, IconYoutube, IconTwitter,
  IconPhone, IconMail, IconPin,
} from '../ui/Icons.jsx';

const Footer = () => {
  const { navCategories, settings } = useStore();
  const { t, localName } = useI18n();

  const socials = [
    { url: settings.facebook_url, Icon: IconFacebook, label: 'Facebook' },
    { url: settings.instagram_url, Icon: IconInstagram, label: 'Instagram' },
    { url: settings.youtube_url, Icon: IconYoutube, label: 'YouTube' },
    { url: settings.twitter_url, Icon: IconTwitter, label: 'X' },
  ].filter((s) => s.url);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <Link to="/" className="brand" style={{ marginBottom: 14 }}>
              <BrandLogo name={settings.site_name || 'Aura Craft'} sub={settings.site_tagline} />
            </Link>
            <p className="mute-2" style={{ maxWidth: 280 }}>{t('footer.about')}</p>
            <a href={`tel:${settings.contact_phone}`} className="btn btn--soft btn--sm" style={{ marginTop: 16 }}>
              <IconPhone width={15} height={15} /> {t('footer.callToOrder')}
            </a>

            {socials.length > 0 && (
              <div className="socials" style={{ justifyContent: 'flex-start' }}>
                {socials.map(({ url, Icon, label }) => (
                  <a key={label} href={url} target="_blank" rel="noreferrer" aria-label={label}>
                    <Icon width={15} height={15} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h5>{t('footer.quickLinks')}</h5>
            <ul>
              <li><Link to="/">{t('common.home')}</Link></li>
              <li><Link to="/products">{t('common.allProducts')}</Link></li>
              {navCategories.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link to={`/category/${c.slug}`}>{localName(c)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5>{t('footer.support')}</h5>
            <ul>
              <li><Link to="/track">{t('footer.orderTracking')}</Link></li>
              <li><Link to="/team">{t('footer.ourTeam')}</Link></li>
              <li><Link to="/upcoming">{t('footer.upcomingCollection')}</Link></li>
              <li><Link to="/cart">{t('common.cart')}</Link></li>
              <li><Link to="/wishlist">{t('common.wishlist')}</Link></li>
              <li><Link to="/brand">{t('footer.brand')}</Link></li>
            </ul>
          </div>

          <div>
            <h5>{t('footer.contact')}</h5>
            <ul>
              <li>
                <a href={`tel:${settings.contact_phone}`} className="contact-line">
                  <IconPhone width={15} height={15} /> {settings.contact_phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.contact_email}`} className="contact-line">
                  <IconMail width={15} height={15} /> {settings.contact_email}
                </a>
              </li>
              <li>
                <span className="contact-line">
                  <IconPin width={15} height={15} /> {settings.contact_address}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} {settings.site_name}. {t('footer.rights')}</span>
          <span>{t('footer.operatedFrom')}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
