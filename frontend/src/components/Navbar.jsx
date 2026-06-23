import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

const LOGO_LEAF_PATH = 'M16,16 C11,15 9,9 16,3 C23,9 21,15 16,16 Z';

const Logo = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(0 16 16)">
      <path d={LOGO_LEAF_PATH} style={{ fill: 'var(--color-primary-dark)' }} />
    </g>
    <g transform="rotate(120 16 16)">
      <path d={LOGO_LEAF_PATH} style={{ fill: 'var(--color-primary-mid)' }} />
    </g>
    <g transform="rotate(240 16 16)">
      <path d={LOGO_LEAF_PATH} style={{ fill: 'var(--color-primary)' }} />
    </g>
  </svg>
);


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

const Navbar = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();

  return (
    <>
      {/* Fixed profile icon — top-right corner, only when signed in */}
      {isSignedIn && (
        <button
          onClick={() => navigate('/profile')}
          aria-label="Go to your profile"
          title="Profile"
          style={{
            position: 'fixed',
            top: 14,
            right: 16,
            zIndex: 200,
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
            padding: 0,
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--color-border-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-primary-light)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          <FontAwesomeIcon
            icon={faUser}
            style={{ color: 'var(--color-primary-dark)', fontSize: 14 }}
          />
        </button>
      )}

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
          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            <Logo />
            <span style={{ color: 'var(--color-primary-dark)' }}>Interview</span>
            <span style={{ color: 'var(--color-text-primary)' }}>IQ</span>
          </div>

          {/* Nav Links */}
          <div
            style={{
              display: 'flex',
              gap: 32,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {['Features', 'How it works', 'About'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(' ', '-')}`}
                style={{
                  color: 'var(--color-text-secondary)',
                  transition: 'color 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.target.style.color = 'var(--color-text-primary)')}
                onMouseLeave={(e) => (e.target.style.color = 'var(--color-text-secondary)')}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          {isSignedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => navigate('/dashboard-preview')}
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
    </>
  );
};

export default Navbar;