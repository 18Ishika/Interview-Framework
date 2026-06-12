import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, SignOutButton } from '@clerk/clerk-react';

const Navbar = () => {
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();

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
        <div
          onClick={() => navigate('/')}
          style={{
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

        {/* Auth Buttons */}
        {isSignedIn ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}>
              Hi, {user.firstName || user.emailAddresses[0].emailAddress}
            </span>
            <button
            onClick={() => navigate('/profile')}
            style={{
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
            Profile
          </button>
            <button
              onClick={() => navigate('/dashboard-preview')}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
            >
              Dashboard
            </button>
            <SignOutButton>
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
                Sign out
              </button>
            </SignOutButton>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/login')}
              style={{
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
            <button
              onClick={() => navigate('/signup')}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
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