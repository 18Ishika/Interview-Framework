import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import './auth.css';

const clerkAppearance = {
  elements: {
    rootBox: {
      width: '100%',
    },
    card: {
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      padding: '0',
      width: '100%',
    },
    headerTitle: { display: 'none' },
    headerSubtitle: { display: 'none' },
    header: { display: 'none' },
    socialButtonsBlockButton: {
      background: 'var(--color-bg-primary)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-body)',
      fontSize: '14.5px',
      fontWeight: '500',
      color: 'var(--color-text-primary)',
      height: '44px',
    },
    dividerLine: { background: 'var(--color-border)' },
    dividerText: {
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      color: 'var(--color-text-muted)',
    },
    formFieldLabel: {
      fontFamily: 'var(--font-body)',
      fontSize: '13.5px',
      fontWeight: '500',
      color: 'var(--color-text-primary)',
    },
    formFieldInput: {
      fontFamily: 'var(--font-body)',
      fontSize: '14.5px',
      background: 'var(--color-bg-primary)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--color-text-primary)',
      height: '44px',
    },
    formButtonPrimary: {
      fontFamily: 'var(--font-body)',
      fontSize: '15px',
      fontWeight: '600',
      background: 'var(--color-primary)',
      borderRadius: 'var(--radius-md)',
      height: '46px',
    },
    footerActionText: {
      fontFamily: 'var(--font-body)',
      fontSize: '13.5px',
      color: 'var(--color-text-secondary)',
    },
    footerActionLink: {
      color: 'var(--color-primary)',
      fontWeight: '600',
    },
    footer: {
      background: 'transparent',
    },
  },
};

export default function login() {
  return (
    <div className="auth-page">
      <div className="auth-bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="auth-left">
        <a href="/" className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect width="10" height="10" rx="3" fill="white" fillOpacity="0.9" />
              <rect x="12" width="10" height="10" rx="3" fill="white" fillOpacity="0.5" />
              <rect y="12" width="10" height="10" rx="3" fill="white" fillOpacity="0.5" />
              <rect x="12" y="12" width="10" height="10" rx="3" fill="white" fillOpacity="0.8" />
            </svg>
          </div>
          <span className="auth-logo-text">InterviewIQ</span>
        </a>

        <div className="auth-left-content">
          <div className="auth-tagline-badge">AI-Powered Assessment</div>
          <h1 className="auth-headline">
            Your next opportunity<br />
            starts with <span className="auth-headline-accent">practice</span>
          </h1>
          <p className="auth-subtext">
            Get real-time feedback on your answers, body language, eye contact, and confidence — all in one place.
          </p>

          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat-number">4</span>
              <span className="auth-stat-label">Analysis Dimensions</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <span className="auth-stat-number">98%</span>
              <span className="auth-stat-label">Assessment Accuracy</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <span className="auth-stat-number">∞</span>
              <span className="auth-stat-label">Reattempts Allowed</span>
            </div>
          </div>

          <div className="auth-testimonial">
            <div className="auth-testimonial-avatar-row">
              {['A', 'R', 'S'].map((l, i) => (
                <div key={i} className="auth-avatar" style={{ zIndex: 3 - i, marginLeft: i > 0 ? '-10px' : 0 }}>
                  {l}
                </div>
              ))}
              <span className="auth-testimonial-meta">Trusted by 500+ candidates</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Welcome back</h2>
            <p className="auth-form-subtitle">
              Don't have an account?{' '}
              <a href="/signup" className="auth-link">Sign up free</a>
            </p>
          </div>

          <SignIn
            appearance={clerkAppearance}
            routing="path"
            path="/login"
            signUpUrl="/signup"
            redirectUrl="/"
          />
        </div>
      </div>
    </div>
  );
}