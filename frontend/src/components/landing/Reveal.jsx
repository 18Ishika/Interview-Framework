import React, { useEffect, useRef, useState } from 'react';

/**
 * Animates children in every time they scroll into view (and resets when they leave).
 * direction: 'up' (default) | 'left' | 'right' | 'scale'
 * Usage: <Reveal direction="left" delay={120}>...</Reveal>
 */
const Reveal = ({ children, delay = 0, direction = 'up', style, ...rest }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dir = direction === 'up' ? '' : ` from-${direction}`;

  return (
    <div
      ref={ref}
      className={`reveal${dir}${visible ? ' is-visible' : ''}`}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Reveal;