import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext.jsx';
import {
  IconFacebook, IconInstagram, IconYoutube, IconTwitter,
  IconPhone, IconMail, IconPin, IconSparkle,
} from '../ui/Icons.jsx';

const Footer = () => {
  const { navCategories, settings } = useStore();

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
              <span className="brand__mark">
                <IconSparkle width={18} height={18} />
              </span>
              <span>
                <span className="brand__text">{settings.site_name}</span>
                <span className="brand__sub">{settings.site_tagline}</span>
              </span>
            </Link>
            <p className="mute-2" style={{ maxWidth: 280 }}>
              প্রিমিয়াম কোয়ালিটির জুয়েলারি, পারফিউম ও গিফট আইটেম — সারা বাংলাদেশে দ্রুত ডেলিভারি।
            </p>
            <a href={`tel:${settings.contact_phone}`} className="btn btn--soft btn--sm" style={{ marginTop: 16 }}>
              <IconPhone width={15} height={15} /> অর্ডার করতে কল করুন
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
            <h5>দ্রুত লিংক</h5>
            <ul>
              <li><Link to="/">হোম</Link></li>
              <li><Link to="/products">সব প্রোডাক্ট</Link></li>
              {navCategories.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link to={`/category/${c.slug}`}>{c.name_bn || c.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5>সহায়তা</h5>
            <ul>
              <li><Link to="/track">অর্ডার ট্র্যাকিং</Link></li>
              <li><Link to="/team">আমাদের টিম</Link></li>
              <li><Link to="/upcoming">আপকামিং কালেকশন</Link></li>
              <li><Link to="/cart">কার্ট</Link></li>
              <li><Link to="/wishlist">পছন্দের তালিকা</Link></li>
            </ul>
          </div>

          <div>
            <h5>যোগাযোগ</h5>
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
          <span>© {new Date().getFullYear()} {settings.site_name}. All rights reserved.</span>
          <span>Made with 💗 in Bangladesh</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
