import React from 'react';

const Hero = () => {
  return (
    <section style={{
      background: 'var(--color-bg-primary)',
      padding: '80px 40px 72px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          fontSize: 12,
          fontWeight: 600,
          padding: '6px 16px',
          borderRadius: 9999,
          marginBottom: 28,
        }}>
          ✦ AI-powered interview assessment
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 5vw, 52px)',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.5px',
          color: 'var(--color-text-primary)',
          marginBottom: 20,
        }}>
          Practice interviews.{' '}
          <span style={{ color: 'var(--color-primary)' }}>Get real feedback.</span>
          <br />Improve with every attempt.
        </h1>

        {/* Subtext */}
        <p style={{
          fontSize: 17,
          color: 'var(--color-text-secondary)',
          maxWidth: 500,
          margin: '0 auto 40px',
          lineHeight: 1.7,
        }}>
          An automated system that evaluates your knowledge, communication,
          and confidence — all in one session.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={{
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '13px 28px',
            borderRadius: 'var(--radius-md)',
            fontSize: 15,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'background 0.2s, transform 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Start a mock interview
          </button>

          <button style={{
            background: 'transparent',
            color: 'var(--color-text-primary)',
            padding: '13px 28px',
            borderRadius: 'var(--radius-md)',
            fontSize: 15,
            fontWeight: 500,
            border: '1px solid var(--color-border-strong)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            See how it works
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
