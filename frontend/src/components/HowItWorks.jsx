import React from 'react';

const steps = [
  { num: '01', title: 'Select domain', desc: 'Runs on a standard webcam and browser. Pick your interview domain to start.' },
  { num: '02', title: 'Attempt interview', desc: 'Attempt the full mock interview session in your browser.' },
  { num: '03', title: 'Get scored', desc: 'Receive an instant AI-generated score across all four dimensions.' },
  { num: '04', title: 'Download report', desc: 'Download your detailed PDF feedback report to review anytime.' },
  { num: '05', title: 'Reattempt and improve', desc: 'Reattempt with unlimited tries and track your improvement over time.' },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" style={{
      background: 'var(--color-bg-primary)',
      padding: '80px 40px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 48 }}>
          <div className="section-label">How it works</div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 10,
          }}>
            From attempt to improvement.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', maxWidth: 400 }}>
            Five straightforward steps to measurable progress.
          </p>
        </div>

        {/* Horizontal step bar (desktop) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 0,
          marginBottom: 32,
          position: 'relative',
        }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute',
            top: 16,
            left: '10%',
            right: '10%',
            height: 2,
            background: 'var(--color-border)',
            zIndex: 0,
          }} />

          {steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '0 12px',
              position: 'relative',
              zIndex: 1,
            }}>
              {/* Step circle */}
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: i === 0 ? 'var(--color-primary)' : 'var(--color-bg-primary)',
                border: `2px solid ${i === 0 ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
                color: i === 0 ? '#fff' : 'var(--color-text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                {step.num}
              </div>

              <h4 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 6,
              }}>{step.title}</h4>

              <p style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
