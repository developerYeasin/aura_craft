import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { IconSparkle, IconArrowRight } from '../components/ui/Icons.jsx';

const NotFound = () => {
  const { t } = useI18n();
  return (
    <div className="container section text-center">
      <div className="card card--pad" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="feature__ico" style={{ margin: '0 auto 20px', width: 60, height: 60 }}>
          <IconSparkle width={26} height={26} />
        </div>
        <h1 className="display grad-text" style={{ fontSize: 'clamp(64px, 12vw, 108px)', lineHeight: 1 }}>404</h1>
        <p className="muted" style={{ marginTop: 12 }}>{t('notFound.text')}</p>
        <Link to="/" className="btn btn--primary btn--sm">
          {t('notFound.home')} <IconArrowRight width={14} height={14} />
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
