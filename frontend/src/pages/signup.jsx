import React from 'react';
import { SignUp } from '@clerk/clerk-react';
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

export default function signup() {
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
          <div className="auth-tagline-badge">Free to Get Started</div>
          <h1 className="auth-headline">
            Land your dream job<br />
            with <span className="auth-headline-accent">AI coaching</span>
          </h1>
          <p className="auth-subtext">
            Practice interviews with intelligent, multimodal feedback. Improve your answers, posture, and confidence before the real thing.
          </p>

          <div className="auth-feature-list">
            {[
              { icon: '🧠', label: 'Semantic answer scoring with NLP' },
              { icon: '👁️', label: 'Eye contact & gaze analysis' },
              { icon: '😊', label: 'Facial expression recognition' },
              { icon: '🧍', label: 'Posture & body language feedback' },
              { icon: '📄', label: 'Downloadable PDF report after each session' },
            ].map(({ icon, label }) => (
              <div key={label} className="auth-feature-item">
                <span className="auth-feature-icon">{icon}</span>
                <span className="auth-feature-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Create your account</h2>
            <p className="auth-form-subtitle">
              Already have an account?{' '}
              <a href="/login" className="auth-link">Log in</a>
            </p>
          </div>

          <SignUp
            appearance={clerkAppearance}
            routing="path"
            path="/signup"
            signInUrl="/login"
            redirectUrl="/"
          />
        </div>
      </div>
    </div>
  );
}