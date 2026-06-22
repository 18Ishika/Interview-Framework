import React from 'react';

const ROUNDS = [
  { step: '01', name: 'Technical Round' },
  { step: '02', name: 'Coding Round' },
  { step: '03', name: 'HR Round' },
];

const HIGHLIGHTS = [
  { value: '3 Rounds', label: 'Technical, coding & HR in one flow' },
  { value: 'PDF', label: 'Shareable scorecard for every candidate' },
  { value: 'Unlimited', label: 'Practice attempts before the real interview' },
];

function PrimaryButton({ children, style }) {
  return (
    <button
      style={{
        background: 'var(--color-primary-dark)',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: 'var(--radius-md)',
        fontSize: 14,
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        transition: 'background 0.2s',
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-primary-dark)')}
    >
      {children}
    </button>
  );
}

function RoundCard({ step, name }) {
  return (
    <div
      style={{
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 22px',
        flex: 1,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--color-primary-dark)',
          letterSpacing: '0.04em',
          marginBottom: 14,
        }}
      >
        {step}
      </div>
      <h4
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}
      >
        {name}
      </h4>
    </div>
  );
}

function ReportCard() {
  return (
    <div
      style={{
        background: 'var(--color-primary-dark)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 22px',
        flex: 1,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: '0.04em',
          marginBottom: 14,
        }}
      >
        04
      </div>
      <h4
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 700,
          color: '#fff',
        }}
      >
        Overall Report
      </h4>
    </div>
  );
}

const DashboardPreview = () => {
  return (
    <section
      style={{
        background: 'var(--color-bg-secondary)',
        padding: '80px 40px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Intro */}
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div className="section-label" style={{ marginBottom: 8, justifyContent: 'center' }}>
            How candidates are assessed
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
              marginBottom: 14,
            }}
          >
            Three structured rounds. One complete report.
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'var(--color-text-secondary)',
              marginBottom: 28,
              lineHeight: 1.7,
            }}
          >
            Every candidate moves through a technical round, a hands-on coding
            round, and an HR personality round — scored independently and
            combined into one report.
          </p>
          <PrimaryButton style={{ marginBottom: 40 }}>Get started free</PrimaryButton>
        </div>

        {/* Rounds flow */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginBottom: 48,
            flexWrap: 'wrap',
          }}
        >
          {ROUNDS.map((round) => (
            <RoundCard key={round.step} {...round} />
          ))}
          <ReportCard />
        </div>

        {/* Highlights */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 48,
            flexWrap: 'wrap',
          }}
        >
          {HIGHLIGHTS.map(({ value, label }) => (
            <div key={value} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--color-primary-dark)',
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  marginTop: 4,
                  lineHeight: 1.4,
                  maxWidth: 160,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;