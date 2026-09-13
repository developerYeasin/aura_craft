import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { SectionHead, Reveal } from '../components/ui/index.jsx';
import {
  IconClock, IconGem, IconSparkle, IconWallet, IconBox, IconTag,
  IconArrowRight, IconShield,
} from '../components/ui/Icons.jsx';

const PLANNED = [
  { Icon: IconClock, name: 'Watches', key: 'watches' },
  { Icon: IconGem, name: 'Necklace', key: 'necklace' },
  { Icon: IconSparkle, name: 'Sunglasses', key: 'sunglasses' },
  { Icon: IconWallet, name: 'Wallet', key: 'wallet' },
  { Icon: IconBox, name: 'Gift Items', key: 'gifts' },
  { Icon: IconTag, name: 'Custom Products', key: 'custom' },
];

const Upcoming = () => {
  const { t } = useI18n();
  return (
    <div className="container section--tight">
      <SectionHead
        center
        eyebrow="Coming Soon"
        title={<>{t('upcoming.title')} <span className="grad-text">{t('upcoming.accent')}</span></>}
        text={t('upcoming.text')}
      />

      <div className="features" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {PLANNED.map((item, i) => (
          <Reveal key={item.name} className="card card--hover feature" delay={i * 70}>
            <div className="feature__ico">
              <item.Icon width={21} height={21} />
            </div>
            <h4>{item.name}</h4>
            <p>{t(`upcoming.${item.key}`)}</p>
            <span className="badge badge--warn" style={{ marginTop: 12 }}>{t('upcoming.soon')}</span>
          </Reveal>
        ))}
      </div>

      {/* Storefront copy only — it no longer points shoppers at the admin panel. */}
      <Reveal className="card card--pad text-center" style={{ marginTop: 34, padding: 38 }}>
        <div className="feature__ico" style={{ margin: '0 auto 16px' }}>
          <IconShield width={21} height={21} />
        </div>
        <h3 className="t-h3" style={{ marginBottom: 8 }}>{t('upcoming.ctaTitle')}</h3>
        <p className="muted" style={{ maxWidth: '54ch', marginInline: 'auto' }}>{t('upcoming.ctaText')}</p>
        <Link to="/products" className="btn btn--primary btn--sm">
          {t('upcoming.ctaButton')} <IconArrowRight width={14} height={14} />
        </Link>
      </Reveal>
    </div>
  );
};

export default Upcoming;
