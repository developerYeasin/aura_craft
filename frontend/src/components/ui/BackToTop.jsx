import { useEffect, useState } from 'react';
import { IconChevronUp } from './Icons.jsx';

/**
 * Floating "back to top" control. Stays mounted once it has appeared so the
 * fade can play both ways — unmounting on scroll-up would make it vanish.
 */
const BackToTop = ({ threshold = 500 }) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > threshold;
      setVisible(past);
      if (past) setMounted(true);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  if (!mounted) return null;

  const toTop = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`to-top${visible ? ' is-on' : ''}`}
      onClick={toTop}
      aria-label="উপরে যান"
      title="উপরে যান"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <IconChevronUp width={18} height={18} />
    </button>
  );
};

export default BackToTop;
