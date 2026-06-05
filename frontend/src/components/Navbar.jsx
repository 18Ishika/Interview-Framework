import React, { useState } from 'react';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'var(--color-bg-primary)',
      borderBottom: '1px solid var(--color-border)',
      padding: '0 40px',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 20,
          cursor: 'pointer',
        }}>
          <span style={{
            width: 32,
            height: 32,
            background: 'var(--color-primary-light)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}>🎙️</span>
          <span style={{ color: 'var(--color-primary)' }}>Interview</span>
          <span style={{ color: 'var(--color-text-primary)' }}>IQ</span>
        </div>

        {/* Nav Links */}
        <div style={{
          display: 'flex',
          gap: 32,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
        }}>
          {['Features', 'How it works', 'About'].map(link => (
            <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} style={{
              color: 'var(--color-text-secondary)',
              transition: 'color 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => e.target.style.color = 'var(--color-text-primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--color-text-secondary)'}
            >{link}</a>
          ))}
        </div>

        {/* Sign In */}
        <button style={{
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
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Sign in
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
