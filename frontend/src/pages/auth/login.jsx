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
      background: 'var(--color-primary-dark)',
      borderRadius: 'var(--radius-md)',
      height: '46px',
    },
    footerActionText: {
      fontFamily: 'var(--font-body)',
      fontSize: '13.5px',
      color: 'var(--color-text-secondary)',
    },
    footerActionLink: {
      color: 'var(--color-primary-dark)',
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
      <div className="auth-right">
        <a href="/" className="auth-brand">
          <span className="auth-brand-text">InterviewIQ</span>
        </a>
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