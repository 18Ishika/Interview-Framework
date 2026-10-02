import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import ScrollProgress from './ScrollProgress';
import herovideo from '../../assets/hero.mp4';
const LINES = ['Practice interviews.', 'Get real feedback.', 'Improve with every attempt.'];

const Hero = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const [canPlay, setCanPlay] = useState(false);
  const [play, setPlay] = useState(false); // true while the hero is on screen
  const sectionRef = useRef(null);

  const copyRef = useRef(null);
  const frameRef = useRef(null);

  // Replay the entrance every time the hero comes back into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setPlay(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setPlay(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scroll-linked motion: frame drifts up, copy fades out
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(window.scrollY / 700, 1);
      if (frameRef.current) frameRef.current.style.transform = `translateY(${p * -36}px) scale(${1 - p * 0.04})`;
      if (copyRef.current) {
        copyRef.current.style.opacity = String(1 - p * 0.8);
        copyRef.current.style.transform = `translateY(${p * 30}px)`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const handleStartInterview = () => navigate(isSignedIn ? '/interview' : '/signup');
  const handleHowItWorks = () =>
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section
      id="about"
      ref={sectionRef}
      className={play ? 'hero-play' : ''}
      style={{
        position: 'relative',
        background: 'var(--color-bg-primary)',
        padding: '96px 40px 104px',
        overflow: 'hidden',
      }}
    >
      <ScrollProgress />

      {/* ---------- Copy ---------- */}
      <div className="hero-copy-wrap">
        <div ref={copyRef} className="hero-copy" style={{ willChange: 'transform, opacity' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(34px, 4.6vw, 56px)',
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: 'var(--color-text-primary)',
              marginBottom: 22,
            }}
          >
            {LINES.map((line, i) => (
              <span className="line-mask" key={line}>
                <span className="line-inner" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p
            className="hero-in"
            style={{ fontSize: 16, maxWidth: 440, marginBottom: 32, lineHeight: 1.7, animationDelay: '0.55s' }}
          >
            An automated system that evaluates your knowledge, communication,
            and confidence — all in one session.
          </p>

          <div
            className="hero-in hero-cta"
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animationDelay: '0.7s' }}
          >
            <button className="btn-primary" onClick={handleStartInterview}>
              Start a mock interview
            </button>
            <button className="btn-secondary" onClick={handleHowItWorks}>
              See how it works
            </button>
          </div>

          <p
            className="hero-in"
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
              marginTop: 18,
              maxWidth: 400,
              animationDelay: '0.85s',
            }}
          >
            After your first session, plans are monthly. Practice 24/7 and recharge only when you have finished the monthly usage.
          </p>
        </div>
      </div>

      {/* ---------- Sage panel + video frame straddling its edge ---------- */}
      <div className="hero-panel">
        <div className="hero-frame">
          <div ref={frameRef} style={{ willChange: 'transform' }}>
            <div
              style={{
                border: '5px solid var(--color-evergreen)',
                borderRadius: 14,
                overflow: 'hidden',
                background: 'var(--color-evergreen)',
                boxShadow: 'var(--shadow-lg)',
                aspectRatio: '16 / 9',
              }}
            >
              <video
                src={herovideo}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                onCanPlay={() => setCanPlay(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  opacity: play && canPlay ? 1 : 0,
                  transform: play && canPlay ? 'scale(1)' : 'scale(1.06)',
                  transition: 'opacity 1s var(--ease-out), transform 1.6s var(--ease-out)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;