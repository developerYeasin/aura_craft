import { Link } from 'react-router-dom';
import { IconSparkle, IconArrowRight } from '../components/ui/Icons.jsx';

const NotFound = () => (
  <div className="container section text-center">
    <div className="feature__ico" style={{ margin: '0 auto 20px', width: 60, height: 60 }}>
      <IconSparkle width={26} height={26} />
    </div>
    <h1 className="display grad-text" style={{ fontSize: 'clamp(64px, 12vw, 108px)', lineHeight: 1 }}>404</h1>
    <p className="muted" style={{ marginTop: 12 }}>দুঃখিত, আপনি যে পেজটি খুঁজছেন সেটি পাওয়া যায়নি।</p>
    <Link to="/" className="btn btn--primary btn--sm">
      হোমে ফিরে যান <IconArrowRight width={14} height={14} />
    </Link>
  </div>
);

export default NotFound;
