import { useId } from 'react';

/**
 * Aura Craft mark: a faceted "A" set inside a gold halo on midnight plum.
 * Gradient ids come from useId so several logos on one page never collide.
 */
export const BrandMark = ({ size = 38, className = '' }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e3b4" />
          <stop offset="0.5" stopColor="#c9a35a" />
          <stop offset="1" stopColor="#8a6424" />
        </linearGradient>
        <radialGradient id={`b${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#3a2650" />
          <stop offset="1" stopColor="#140e1d" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#b${id})`} />
      <circle cx="32" cy="32" r="25.5" fill="none" stroke={`url(#g${id})`} strokeWidth="1.4" opacity="0.85" />
      <path
        fillRule="evenodd"
        fill={`url(#g${id})`}
        d="M32 14 46 48h-5.6l-3.1-7.6H26.7L23.6 48H18L32 14Zm0 11.6-3.6 9.2h7.2L32 25.6Z"
      />
      <path d="M32 5.5l1.6 3.3L32 10.4l-1.6-1.6L32 5.5Z" fill="#f6e3b4" />
    </svg>
  );
};

/** Mark + wordmark. "AuraCraft"/"Aura Craft" is set as Aura + gold italic Craft. */
const BrandLogo = ({ name = 'Aura Craft', sub, size = 38 }) => {
  const match = /^aura\s?craft$/i.test(name.trim());
  return (
    <>
      <span className="brand__mark">
        <BrandMark size={size} />
      </span>
      <span>
        <span className="brand__text">
          {match ? (
            <>
              Aura <em>Craft</em>
            </>
          ) : (
            name
          )}
        </span>
        {sub && <span className="brand__sub">{sub}</span>}
      </span>
    </>
  );
};

export default BrandLogo;
