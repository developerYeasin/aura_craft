import { useId } from 'react';

/**
 * Aura Craft mark: a blooming lotus in violet → rose petals over a gold base,
 * with a small star above. Gradient ids come from useId so several logos on one
 * page never collide. public/logo.svg (favicon, push icon) is the static twin of
 * this drawing — keep the two in sync.
 *
 * `animated` adds the one-time bloom and the slow star twinkle (see glass.css,
 * "Brand motion"); both are disabled under prefers-reduced-motion.
 */
export const BrandMark = ({ size = 38, className = '', animated = false }) => {
  const id = useId().replace(/:/g, '');
  const petal = `url(#p${id})`;
  const petalSoft = `url(#s${id})`;
  const gold = `url(#g${id})`;
  return (
    <svg
      className={`lotus${animated ? ' lotus--animated' : ''}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`p${id}`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#f6c9ff" />
          <stop offset="0.55" stopColor="#b77cff" />
          <stop offset="1" stopColor="#6c3fd8" />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd6ec" />
          <stop offset="1" stopColor="#c264c9" />
        </linearGradient>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e3b4" />
          <stop offset="0.5" stopColor="#c9a35a" />
          <stop offset="1" stopColor="#8a6424" />
        </linearGradient>
      </defs>
      <g className="lotus__outer">
        <path fill={petalSoft} opacity="0.85" d="M31 47C19 47 9.5 41 5 30.5c10.5-.4 20.5 5.6 26 16.5Z" />
        <path fill={petalSoft} opacity="0.85" d="M33 47c12 0 21.5-6 26-16.5-10.5-.4-20.5 5.6-26 16.5Z" />
      </g>
      <g className="lotus__inner">
        <path fill={petal} opacity="0.92" d="M32 46c-10-3.5-16-12-15.2-23.5C26 25.5 31.2 34 32 46Z" />
        <path fill={petal} opacity="0.92" d="M32 46c10-3.5 16-12 15.2-23.5C38 25.5 32.8 34 32 46Z" />
      </g>
      <path className="lotus__center" fill={petal} d="M32 11.5c7.2 8.4 9.6 20.5 0 34.5-9.6-14-7.2-26.1 0-34.5Z" />
      <path className="lotus__vein" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1" strokeLinecap="round" d="M32 18.5v22" />
      <path className="lotus__base" fill="none" stroke={gold} strokeWidth="2.2" strokeLinecap="round" d="M13 51.5c11.5 5.2 26.5 5.2 38 0" />
      <path className="lotus__star" fill={gold} d="M32 1.8l1.35 3.15L36.5 6.3l-3.15 1.35L32 10.8l-1.35-3.15L27.5 6.3l3.15-1.35Z" />
    </svg>
  );
};

/**
 * "Aura Craft" set as Aura + gold italic Craft. With `animated`, the words rise
 * in on load and a soft light sheen passes over them now and then.
 */
export const BrandWordmark = ({ name = 'Aura Craft', animated = false, className = '' }) => {
  const match = /^aura\s?craft$/i.test(name.trim());
  return (
    <span className={`brand__text${animated ? ' wordmark--animated' : ''}${className ? ` ${className}` : ''}`}>
      {match ? (
        <>
          <span className="wordmark__aura" data-text="Aura">Aura</span>{' '}
          <em className="wordmark__craft">Craft</em>
        </>
      ) : (
        name
      )}
    </span>
  );
};

/** Mark + wordmark, used by the navbar, footer, admin sidebar and login. */
const BrandLogo = ({ name = 'Aura Craft', sub, size = 38, animated = true }) => (
  <>
    <span className="brand__mark">
      <BrandMark size={size} animated={animated} />
    </span>
    <span>
      <BrandWordmark name={name} animated={animated} />
      {sub && <span className="brand__sub">{sub}</span>}
    </span>
  </>
);

export default BrandLogo;
