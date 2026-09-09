import { Link } from 'react-router-dom';
import { SectionHead, Reveal } from '../components/ui/index.jsx';
import {
  IconClock, IconGem, IconSparkle, IconWallet, IconBox, IconTag,
  IconArrowRight, IconShield,
} from '../components/ui/Icons.jsx';

const PLANNED = [
  { Icon: IconClock, name: 'Watches', text: 'প্রিমিয়াম হাতঘড়ির কালেকশন' },
  { Icon: IconGem, name: 'Necklace', text: 'এলিগেন্ট নেকলেস ডিজাইন' },
  { Icon: IconSparkle, name: 'Sunglasses', text: 'ট্রেন্ডি সানগ্লাস' },
  { Icon: IconWallet, name: 'Wallet', text: 'লেদার ওয়ালেট কালেকশন' },
  { Icon: IconBox, name: 'Gift Items', text: 'বিশেষ দিনের গিফট বক্স' },
  { Icon: IconTag, name: 'Custom Products', text: 'আপনার পছন্দ অনুযায়ী কাস্টম ডিজাইন' },
];

const Upcoming = () => (
  <div className="container section--tight">
    <SectionHead
      center
      eyebrow="Coming Soon"
      title={<>ভবিষ্যতে <span className="grad-text">যুক্ত হবে</span></>}
      text="আমাদের পরবর্তী কালেকশনগুলোতে যা আসছে"
    />

    <div className="features" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
      {PLANNED.map((item, i) => (
        <Reveal key={item.name} className="card card--hover feature" delay={i * 70}>
          <div className="feature__ico">
            <item.Icon width={21} height={21} />
          </div>
          <h4>{item.name}</h4>
          <p>{item.text}</p>
          <span className="badge badge--warn" style={{ marginTop: 12 }}>শীঘ্রই আসছে</span>
        </Reveal>
      ))}
    </div>

    <Reveal className="card card--pad text-center" style={{ marginTop: 34, padding: 38 }}>
      <div className="feature__ico" style={{ margin: '0 auto 16px' }}>
        <IconShield width={21} height={21} />
      </div>
      <h3 className="t-h3" style={{ marginBottom: 8 }}>নতুন ক্যাটাগরি যোগ করা খুব সহজ</h3>
      <p className="muted" style={{ maxWidth: '54ch', marginInline: 'auto' }}>
        অ্যাডমিন প্যানেল থেকে নতুন ক্যাটাগরি তৈরি করলেই সেটি স্বয়ংক্রিয়ভাবে নেভিগেশন, হোম পেজ এবং
        রাউটিং-এ যুক্ত হয়ে যাবে — কোনো কোড পরিবর্তন ছাড়াই।
      </p>
      <Link to="/admin" className="btn btn--primary btn--sm">
        অ্যাডমিন প্যানেল <IconArrowRight width={14} height={14} />
      </Link>
    </Reveal>
  </div>
);

export default Upcoming;
