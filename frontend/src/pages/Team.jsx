import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teamApi } from '../api/index.js';
import { useI18n } from '../i18n/index.jsx';
import { Loader, ErrorBox, Empty, Reveal, SectionHead } from '../components/ui/index.jsx';
import { IconUsers, IconArrowRight, IconEye } from '../components/ui/Icons.jsx';
import TeamProfileModal from '../components/team/TeamProfileModal.jsx';
import { recordView } from '../utils/views.js';
import { toBn } from '../utils/format.js';
import { FALLBACK_MEMBERS, SHOW_VIEW_COUNT, avatarFor, hasValue } from '../data/team.config.js';

const Team = () => {
  const { t } = useI18n();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ?member=<id> keeps the open profile shareable and survives a refresh.
  const [params, setParams] = useSearchParams();
  const openId = Number(params.get('member')) || null;

  const load = () => {
    setLoading(true);
    setError(null);
    teamApi
      .list()
      .then((res) => setMembers(res.data?.length ? res.data : FALLBACK_MEMBERS))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const active = members.find((m) => m.id === openId) || null;

  // Opening a full profile is what counts as a view — rendering the card never does.
  useEffect(() => {
    if (!active) return;
    recordView('team', active.id).then((r) => {
      if (r?.views == null) return;
      setMembers((list) => list.map((m) => (m.id === active.id ? { ...m, profile_view_count: r.views } : m)));
    });
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (m) => setParams((p) => {
    const next = new URLSearchParams(p);
    next.set('member', String(m.id));
    return next;
  });

  const close = useCallback(() => setParams((p) => {
    const next = new URLSearchParams(p);
    next.delete('member');
    return next;
  }, { replace: true }), [setParams]);

  return (
    <div className="container section--tight">
      <SectionHead
        center
        eyebrow="Our People"
        title={<>{t('team.title')} <span className="grad-text">{t('team.accent')}</span></>}
        text={t('team.text')}
      />

      {loading && <Loader label={t('common.loading')} />}
      {error && !loading && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && members.length === 0 && <Empty icon={IconUsers} title={t('team.empty')} />}

      {!loading && !error && members.length > 0 && (
        <div className="team-grid team-grid--profiles">
          {members.map((m, i) => {
            const views = Number(m.profile_view_count) || 0;
            return (
              <Reveal key={m.id} delay={i * 80} className="tcard-wrap">
                <button
                  type="button"
                  className="card tcard"
                  onClick={() => open(m)}
                  aria-haspopup="dialog"
                  aria-label={`${m.name} — ${t('team.viewProfile')}`}
                >
                  <span className="tcard__glow" aria-hidden="true" />
                  <span className="tcard__ph">
                    <img src={m.photo_url || avatarFor(m.name)} alt="" loading="lazy" />
                  </span>
                  <span className="tcard__name">{m.name}</span>
                  <span className="tcard__role">{hasValue(m.role) ? m.role : ' '}</span>
                  {hasValue(m.tag) && <span className="tcard__tag">{m.tag}</span>}
                  <span className="tcard__foot">
                    <span className="tcard__cta">
                      {t('team.viewProfile')} <IconArrowRight width={13} height={13} />
                    </span>
                    {SHOW_VIEW_COUNT && views > 0 && (
                      <span className="tcard__views" title={t('team.views', { n: toBn(views) })}>
                        <IconEye width={12} height={12} /> {toBn(views)}
                      </span>
                    )}
                  </span>
                </button>
              </Reveal>
            );
          })}
        </div>
      )}

      <TeamProfileModal member={active} onClose={close} />
    </div>
  );
};

export default Team;
