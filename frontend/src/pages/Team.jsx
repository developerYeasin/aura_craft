import { useEffect, useState } from 'react';
import { teamApi } from '../api/index.js';
import { Loader, ErrorBox, Empty, Reveal, SectionHead } from '../components/ui/index.jsx';
import { IconFacebook, IconInstagram, IconTwitter, IconYoutube, IconUsers } from '../components/ui/Icons.jsx';

const SOCIALS = [
  ['facebook_url', IconFacebook],
  ['instagram_url', IconInstagram],
  ['twitter_url', IconTwitter],
  ['youtube_url', IconYoutube],
];

const Team = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    teamApi
      .list()
      .then((res) => setMembers(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="container section--tight">
      <SectionHead
        center
        eyebrow="Our People"
        title={<>আমাদের <span className="grad-text">টিম</span></>}
        text="সৃজনশীল, একনিষ্ঠ, আপনার পাশে"
      />

      {loading && <Loader />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && members.length === 0 && <Empty icon={IconUsers} title="এখনো কোনো মেম্বার যোগ করা হয়নি" />}

      {!loading && !error && members.length > 0 && (
        <div className="team-grid">
          {members.map((m, i) => (
            <Reveal key={m.id} className="card card--hover team-card" delay={i * 80}>
              <div className="team-card__ph">
                <img
                  src={m.photo_url || `https://ui-avatars.com/api/?background=2b1b45&color=f3eefb&name=${encodeURIComponent(m.name)}`}
                  alt={m.name}
                  loading="lazy"
                />
              </div>
              <h3>{m.name}</h3>
              <div className="role">{m.role}</div>
              {m.bio && <p className="mute-2">{m.bio}</p>}
              <div className="socials">
                {SOCIALS.filter(([key]) => m[key]).map(([key, Icon]) => (
                  <a key={key} href={m[key]} target="_blank" rel="noreferrer" aria-label={key}>
                    <Icon width={14} height={14} />
                  </a>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
};

export default Team;
