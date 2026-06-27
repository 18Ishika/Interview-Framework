import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, SignOutButton } from '@clerk/clerk-react';

const navButtonStyle = {
  padding: '8px 20px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-strong)',
  background: 'transparent',
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  transition: 'background 0.15s',
};

const primaryButtonStyle = {
  padding: '8px 20px',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  background: 'var(--color-primary-dark)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  transition: 'background 0.15s',
};

// Map nav labels to section IDs
const NAV_LINKS = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how-it-works' },
  { label: 'About', id: 'about' },
];

const Navbar = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-bg-primary)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 40px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}
      >
        {/* Nav Links */}
        <div style={{ display: 'flex', gap: 32, fontSize: 14, fontWeight: 500 }}>
          {NAV_LINKS.map(({ label, id }) => (
            <span
              key={id}
              onClick={() => scrollToSection(id)}
              style={{
                color: 'var(--color-text-secondary)',
                transition: 'color 0.15s',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.target.style.color = 'var(--color-text-primary)')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--color-text-secondary)')}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Auth Buttons */}
        {isSignedIn ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={primaryButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-primary-dark)')}
            >
              Dashboard
            </button>
            <SignOutButton>
              <button
                style={navButtonStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Sign out
              </button>
            </SignOutButton>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/login')}
              style={navButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/signup')}
              style={primaryButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-primary-dark)')}
            >
              Get started
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;