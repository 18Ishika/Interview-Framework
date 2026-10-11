import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, SignOutButton } from '@clerk/clerk-react';

const LEAF = 'M16,16 C11,15 9,9 16,3 C23,9 21,15 16,16 Z';

const Logo = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
    <path d={LEAF} fill="var(--color-evergreen)" />
    <path d={LEAF} fill="var(--color-primary)" transform="rotate(120 16 16)" />
    <path d={LEAF} fill="var(--color-sage)" transform="rotate(240 16 16)" />
  </svg>
);

// Map nav labels to section IDs
const NAV_LINKS = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how-it-works' },
  { label: 'About', id: 'about' },
];

const Navbar = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState('about');
  const [menuOpen, setMenuOpen] = useState(false);

  // Border + blur once the page has scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the link of the section currently in view
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActiveId(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    NAV_LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const scrollToSection = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const goTop = () => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      className="nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(248, 242, 228, 0.82)' : 'var(--color-bg-primary)',
        backdropFilter: scrolled ? 'blur(14px) saturate(1.4)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(1.4)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'var(--color-border)' : 'transparent'}`,
        padding: '0 40px',
        transition: 'background 0.4s var(--ease-out), border-color 0.4s var(--ease-out)',
      }}
    >
      <style>{`
        .nav-link {
          position: relative; background: none; border: none; cursor: pointer;
          font-family: var(--font-body); font-size: 14px; font-weight: 500;
          color: var(--color-text-secondary); padding: 8px 2px; transition: color 0.25s ease;
        }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: 2px; height: 2px; border-radius: 2px;
          background: var(--color-primary); transform: scaleX(0); transform-origin: 0 50%;
          transition: transform 0.4s var(--ease-out);
        }
        .nav-link:hover { color: var(--color-text-primary); }
        .nav-link.is-active { color: var(--color-text-primary); }
        .nav-link.is-active::after, .nav-link:hover::after { transform: scaleX(1); }
        .nav-btn {
          padding: 9px 20px; border-radius: 999px; font-size: 14px; font-weight: 600;
          font-family: var(--font-body); cursor: pointer; white-space: nowrap;
          transition: background 0.3s var(--ease-out), transform 0.3s var(--ease-out), border-color 0.3s var(--ease-out);
        }
        .nav-btn--ghost { background: transparent; color: var(--color-text-primary); border: 1px solid var(--color-border-strong); }
        .nav-btn--ghost:hover { background: var(--color-bg-tertiary); border-color: var(--color-evergreen); }
        .nav-btn--solid { background: var(--color-primary); color: var(--color-evergreen); border: 1px solid var(--color-primary); }
        .nav-btn--solid:hover { background: #C48F5C; border-color: #C48F5C; transform: translateY(-1px); }
        .nav-burger { display: none; width: 40px; height: 40px; border: 1px solid var(--color-border-strong);
          border-radius: 999px; background: transparent; cursor: pointer; padding: 0; position: relative; }
        .nav-burger span { position: absolute; left: 12px; right: 12px; height: 2px; border-radius: 2px;
          background: var(--color-evergreen); transition: transform 0.35s var(--ease-out), opacity 0.2s; }
        .nav-burger span:nth-child(1) { top: 14px; }
        .nav-burger span:nth-child(2) { top: 19px; }
        .nav-burger span:nth-child(3) { top: 24px; }
        .nav-burger.open span:nth-child(1) { transform: translateY(5px) rotate(45deg); }
        .nav-burger.open span:nth-child(2) { opacity: 0; }
        .nav-burger.open span:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }
        .nav-mobile {
          display: none; overflow: hidden; max-height: 0; opacity: 0;
          transition: max-height 0.5s var(--ease-out), opacity 0.3s ease, padding 0.4s var(--ease-out);
        }
        .nav-mobile.open { max-height: 420px; opacity: 1; padding-bottom: 18px; }
        @media (max-width: 820px) {
          .nav { padding: 0 20px !important; }
          .nav-center, .nav-auth { display: none !important; }
          .nav-burger { display: block; }
          .nav-mobile { display: block; }
        }
      `}</style>

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 68,
          gap: 24,
        }}
      >
        {/* Brand */}
        <button
          onClick={goTop}
          aria-label="InterviewIQ home"
          style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <Logo />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
            Interview<span style={{ color: 'var(--color-primary-mid)' }}> IQ</span>
          </span>
        </button>

        {/* Nav links */}
        <div className="nav-center" style={{ display: 'flex', gap: 34 }}>
          {NAV_LINKS.map(({ label, id }) => (
            <button
              key={id}
              className={`nav-link${activeId === id ? ' is-active' : ''}`}
              onClick={() => scrollToSection(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Auth */}
        <div className="nav-auth" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isSignedIn ? (
            <>
              <button className="nav-btn nav-btn--solid" onClick={() => navigate('/dashboard')}>
                Dashboard
              </button>
              <SignOutButton>
                <button className="nav-btn nav-btn--ghost">Sign out</button>
              </SignOutButton>
            </>
          ) : (
            <>
              <button className="nav-btn nav-btn--ghost" onClick={() => navigate('/login')}>
                Sign in
              </button>
              <button className="nav-btn nav-btn--solid" onClick={() => navigate('/signup')}>
                Get started
              </button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className={`nav-burger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`nav-mobile${menuOpen ? ' open' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 1200, margin: '0 auto' }}>
          {NAV_LINKS.map(({ label, id }) => (
            <button
              key={id}
              className={`nav-link${activeId === id ? ' is-active' : ''}`}
              style={{ textAlign: 'left', padding: '12px 2px', fontSize: 16 }}
              onClick={() => scrollToSection(id)}
            >
              {label}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            {isSignedIn ? (
              <>
                <button className="nav-btn nav-btn--solid" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
                <SignOutButton>
                  <button className="nav-btn nav-btn--ghost">Sign out</button>
                </SignOutButton>
              </>
            ) : (
              <>
                <button className="nav-btn nav-btn--ghost" onClick={() => navigate('/login')}>
                  Sign in
                </button>
                <button className="nav-btn nav-btn--solid" onClick={() => navigate('/signup')}>
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;